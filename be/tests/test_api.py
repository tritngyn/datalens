import io
import json
import os
import unittest
import uuid
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

from app.db import get_db
from app.main import app

BE_DIR = Path(__file__).resolve().parents[1]
SYNTHETIC_FIXTURE = BE_DIR / "data" / "fixtures" / "p0_synthetic_dhc_vs_vaseline_22.csv"
MAPPING_JSON = json.dumps(
    {
        "text": "text",
        "brand": "brand",
        "context": "context",
        "review_id": "review_id",
    }
)
BRANDS_JSON = json.dumps(["DHC", "Vaseline"])

TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")
if TEST_DATABASE_URL and TEST_DATABASE_URL.startswith("postgresql://"):
    TEST_DATABASE_URL = TEST_DATABASE_URL.replace(
        "postgresql://", "postgresql+psycopg://", 1
    )
if TEST_DATABASE_URL and TEST_DATABASE_URL.startswith("postgres://"):
    TEST_DATABASE_URL = TEST_DATABASE_URL.replace(
        "postgres://", "postgresql+psycopg://", 1
    )

engine = (
    create_engine(TEST_DATABASE_URL, pool_pre_ping=True)
    if TEST_DATABASE_URL
    else None
)
TestingSessionLocal = (
    sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    if engine
    else None
)


def make_csv(header: list[str], rows: list[list[str]]) -> bytes:
    import csv

    buffer = io.StringIO(newline="")
    writer = csv.writer(buffer, lineterminator="\n")
    writer.writerow(header)
    writer.writerows(rows)
    return buffer.getvalue().encode("utf-8")


@unittest.skipUnless(
    TEST_DATABASE_URL,
    "Set TEST_DATABASE_URL to a migrated PostgreSQL database to run API tests.",
)
class ApiPostgresTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        tables = set(inspect(engine).get_table_names())
        if "analyses" not in tables or "reviews" not in tables:
            raise RuntimeError(
                "Test database is missing P1 tables. "
                "Run: DATABASE_URL=$TEST_DATABASE_URL alembic upgrade head"
            )

    def setUp(self):
        with engine.begin() as connection:
            connection.execute(text("TRUNCATE TABLE analyses CASCADE"))

        def override_get_db():
            session = TestingSessionLocal()
            try:
                yield session
            finally:
                session.close()

        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()
        self.client.close()

    def post_preview(
        self,
        raw: bytes,
        *,
        filename: str = "test.csv",
        mapping: str = MAPPING_JSON,
        brands: str | None = None,
    ):
        data = {"mapping": mapping}
        if brands is not None:
            data["brands"] = brands
        return self.client.post(
            "/api/imports/preview",
            files={"file": (filename, raw, "text/csv")},
            data=data,
        )

    def post_analysis(
        self,
        raw: bytes,
        *,
        filename: str = "test.csv",
        mapping: str = MAPPING_JSON,
        brands: str = BRANDS_JSON,
    ):
        return self.client.post(
            "/api/analyses",
            files={"file": (filename, raw, "text/csv")},
            data={"mapping": mapping, "brands": brands},
        )

    def create_synthetic_analysis(self):
        response = self.post_analysis(
            SYNTHETIC_FIXTURE.read_bytes(),
            filename=SYNTHETIC_FIXTURE.name,
        )
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    def test_preview_does_not_create_analysis(self):
        response = self.post_preview(
            SYNTHETIC_FIXTURE.read_bytes(),
            filename=SYNTHETIC_FIXTURE.name,
        )
        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual(payload["total_records"], 22)
        self.assertEqual(payload["valid_records"], 22)
        self.assertEqual(payload["error_records"], 0)
        self.assertEqual(payload["source_brands"], ["DHC", "Vaseline"])
        self.assertEqual(len(payload["preview"]), 10)
        self.assertEqual(payload["mapping"]["source_id"], "review_id")

        with engine.connect() as connection:
            count = connection.execute(text("SELECT count(*) FROM analyses")).scalar_one()
        self.assertEqual(count, 0)

    def test_create_analysis_and_read_reviews(self):
        created = self.create_synthetic_analysis()
        analysis_id = created["analysis_id"]
        self.assertEqual(created["import_status"], "imported")
        self.assertEqual(created["analysis_status"], "not_started")
        self.assertEqual(created["brands"], ["DHC", "Vaseline"])
        self.assertEqual(created["total_records"], 22)
        self.assertEqual(created["imported_records"], 22)
        self.assertEqual(created["duplicate_source_id_count"], 0)
        self.assertEqual(created["warnings"], [])

        detail = self.client.get(f"/api/analyses/{analysis_id}")
        self.assertEqual(detail.status_code, 200, detail.text)
        self.assertEqual(detail.json()["analysis_id"], analysis_id)

        reviews = self.client.get(
            f"/api/analyses/{analysis_id}/reviews",
            params={"page": 1, "page_size": 100},
        )
        self.assertEqual(reviews.status_code, 200, reviews.text)
        payload = reviews.json()
        self.assertEqual(payload["total"], 22)
        self.assertEqual(len(payload["items"]), 22)

        by_source = {item["source_id"]: item for item in payload["items"]}
        self.assertEqual(by_source["SYN-001"]["record_number"], 1)
        self.assertIn(",", by_source["SYN-020"]["text"])
        self.assertIn("\n", by_source["SYN-021"]["text"])
        self.assertIn('"cứu tinh"', by_source["SYN-022"]["text"])
        self.assertNotEqual(
            by_source["SYN-001"]["review_id"],
            by_source["SYN-001"]["source_id"],
        )
        self.assertEqual(
            len({item["review_id"] for item in payload["items"]}),
            22,
        )

    def test_pagination_and_bounds(self):
        created = self.create_synthetic_analysis()
        analysis_id = created["analysis_id"]

        page_2 = self.client.get(
            f"/api/analyses/{analysis_id}/reviews",
            params={"page": 2, "page_size": 5},
        )
        self.assertEqual(page_2.status_code, 200, page_2.text)
        self.assertEqual(page_2.json()["total"], 22)
        self.assertEqual(
            [item["record_number"] for item in page_2.json()["items"]],
            [6, 7, 8, 9, 10],
        )

        last = self.client.get(
            f"/api/analyses/{analysis_id}/reviews",
            params={"page": 5, "page_size": 5},
        )
        self.assertEqual(
            [item["record_number"] for item in last.json()["items"]],
            [21, 22],
        )

        self.assertEqual(
            self.client.get(
                f"/api/analyses/{analysis_id}/reviews",
                params={"page": 0},
            ).status_code,
            422,
        )
        self.assertEqual(
            self.client.get(
                f"/api/analyses/{analysis_id}/reviews",
                params={"page_size": 101},
            ).status_code,
            422,
        )

    def test_analysis_isolation(self):
        analysis_a = self.create_synthetic_analysis()
        raw_b = make_csv(
            ["review_id", "brand", "text", "context"],
            [["B-1", "DHC", "chỉ thuộc analysis B", "ngữ cảnh B"]],
        )
        response_b = self.post_analysis(raw_b, filename="b.csv")
        self.assertEqual(response_b.status_code, 201, response_b.text)
        analysis_b = response_b.json()

        self.assertNotEqual(analysis_a["analysis_id"], analysis_b["analysis_id"])

        reviews_a = self.client.get(
            f"/api/analyses/{analysis_a['analysis_id']}/reviews",
            params={"page_size": 100},
        ).json()
        reviews_b = self.client.get(
            f"/api/analyses/{analysis_b['analysis_id']}/reviews",
            params={"page_size": 100},
        ).json()

        self.assertEqual(reviews_a["total"], 22)
        self.assertEqual(reviews_b["total"], 1)
        self.assertEqual(reviews_b["items"][0]["source_id"], "B-1")
        self.assertTrue(
            all(item["source_id"].startswith("SYN-") for item in reviews_a["items"])
        )
        self.assertNotIn(
            reviews_b["items"][0]["review_id"],
            {item["review_id"] for item in reviews_a["items"]},
        )

    def test_invalid_rows_reject_entire_analysis(self):
        raw = make_csv(
            ["review_id", "brand", "text", "context"],
            [
                ["S1", "DHC", "ok", ""],
                ["S2", "DHC", "", ""],
            ],
        )
        response = self.post_analysis(raw)
        self.assertEqual(response.status_code, 422, response.text)
        detail = response.json()["detail"]
        self.assertEqual(detail["code"], "import_validation_failed")
        self.assertEqual(detail["valid_records"], 1)
        self.assertEqual(detail["error_records"], 1)
        self.assertEqual(detail["errors"][0]["code"], "text_empty")

        with engine.connect() as connection:
            count = connection.execute(text("SELECT count(*) FROM analyses")).scalar_one()
        self.assertEqual(count, 0)

    def test_unconfirmed_brand_rejects_analysis(self):
        raw = make_csv(
            ["review_id", "brand", "text", "context"],
            [["S1", "Other", "ok", ""]],
        )
        response = self.post_analysis(raw)
        self.assertEqual(response.status_code, 422, response.text)
        self.assertEqual(
            response.json()["detail"]["errors"][0]["code"],
            "brand_not_confirmed",
        )

    def test_duplicate_source_ids_keep_both_rows(self):
        raw = make_csv(
            ["review_id", "brand", "text", "context"],
            [
                ["SAME", "DHC", "review một", ""],
                ["SAME", "Vaseline", "review hai", ""],
            ],
        )
        response = self.post_analysis(raw)
        self.assertEqual(response.status_code, 201, response.text)
        payload = response.json()
        self.assertEqual(payload["imported_records"], 2)
        self.assertEqual(payload["duplicate_source_id_count"], 1)
        self.assertEqual(len(payload["warnings"]), 1)
        self.assertEqual(payload["warnings"][0]["record_numbers"], [1, 2])

        reviews = self.client.get(
            f"/api/analyses/{payload['analysis_id']}/reviews",
            params={"page_size": 100},
        ).json()
        self.assertEqual(reviews["total"], 2)
        self.assertEqual(
            [item["source_id"] for item in reviews["items"]],
            ["SAME", "SAME"],
        )
        self.assertEqual(
            len({item["review_id"] for item in reviews["items"]}),
            2,
        )

    def test_preview_duplicate_header_is_422(self):
        raw = make_csv(["review_id", "brand", "text", "text"], [])
        response = self.post_preview(raw)
        self.assertEqual(response.status_code, 422, response.text)
        self.assertEqual(response.json()["detail"]["code"], "duplicate_header")

    def test_preview_malformed_record_is_reported_by_record_number(self):
        raw = make_csv(
            ["review_id", "brand", "text", "context"],
            [["S1", "DHC", "hello"]],
        )
        response = self.post_preview(raw)
        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual(payload["total_records"], 1)
        self.assertEqual(payload["error_records"], 1)
        self.assertEqual(payload["errors"][0]["record_number"], 1)
        self.assertEqual(payload["errors"][0]["code"], "invalid_field_count")

    def test_preview_bom_quote_comma_newline(self):
        raw = (
            "\ufeffreview_id,brand,text,context\n"
            '1,DHC,"dòng 1\n dòng 2","ngữ cảnh, có phẩy"\n'
        ).encode("utf-8")
        response = self.post_preview(raw)
        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual(payload["total_records"], 1)
        self.assertEqual(payload["valid_records"], 1)
        self.assertIn("\n", payload["preview"][0]["text"])
        self.assertIn(",", payload["preview"][0]["context"])

    def test_preview_optional_brand_confirmation(self):
        raw = make_csv(
            ["review_id", "brand", "text", "context"],
            [["S1", "Other", "ok", ""]],
        )
        response = self.post_preview(raw, brands=BRANDS_JSON)
        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual(payload["error_records"], 1)
        self.assertEqual(payload["errors"][0]["code"], "brand_not_confirmed")

    def test_preview_too_many_records_is_413(self):
        rows = [[f"S-{i}", "DHC", "ok", ""] for i in range(1, 502)]
        response = self.post_preview(
            make_csv(["review_id", "brand", "text", "context"], rows)
        )
        self.assertEqual(response.status_code, 413, response.text)
        self.assertEqual(response.json()["detail"]["code"], "too_many_records")

    def test_file_too_large_is_413_and_not_persisted(self):
        response = self.post_analysis(b"x" * (2 * 1024 * 1024 + 1))
        self.assertEqual(response.status_code, 413, response.text)
        self.assertEqual(response.json()["detail"]["code"], "file_too_large")
        with engine.connect() as connection:
            count = connection.execute(text("SELECT count(*) FROM analyses")).scalar_one()
        self.assertEqual(count, 0)

    def test_invalid_mapping_json(self):
        response = self.post_preview(
            SYNTHETIC_FIXTURE.read_bytes(),
            mapping=json.dumps({"text": "text"}),
        )
        self.assertEqual(response.status_code, 422, response.text)
        self.assertEqual(response.json()["detail"]["code"], "invalid_mapping")

    def test_unknown_analysis_returns_404(self):
        unknown = uuid.uuid4()
        self.assertEqual(
            self.client.get(f"/api/analyses/{unknown}").status_code,
            404,
        )
        self.assertEqual(
            self.client.get(f"/api/analyses/{unknown}/reviews").status_code,
            404,
        )

    def test_new_client_can_read_persisted_analysis(self):
        created = self.create_synthetic_analysis()
        self.client.close()

        def override_get_db():
            session = TestingSessionLocal()
            try:
                yield session
            finally:
                session.close()

        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)
        response = self.client.get(f"/api/analyses/{created['analysis_id']}")
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["imported_records"], 22)

    def test_only_p1_tables_exist(self):
        tables = set(inspect(engine).get_table_names())
        self.assertIn("analyses", tables)
        self.assertIn("reviews", tables)
        self.assertIn("alembic_version", tables)
        self.assertFalse({"batches", "mentions", "messages"} & tables)


if __name__ == "__main__":
    unittest.main()
