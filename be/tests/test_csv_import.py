import csv
import hashlib
import io
import unittest
from pathlib import Path

from app.csv_import import ColumnMapping, CsvInputError, parse_csv_bytes

BE_DIR = Path(__file__).resolve().parents[1]
SYNTHETIC_FIXTURE = BE_DIR / "data" / "fixtures" / "p0_synthetic_dhc_vs_vaseline_22.csv"
MAPPING = ColumnMapping(
    text="text",
    brand="brand",
    context="context",
    source_id="review_id",
)


def make_csv(header: list[str], rows: list[list[str]]) -> bytes:
    buffer = io.StringIO(newline="")
    writer = csv.writer(buffer, lineterminator="\n")
    writer.writerow(header)
    writer.writerows(rows)
    return buffer.getvalue().encode("utf-8")


class ParseSyntheticFixtureTests(unittest.TestCase):
    def test_synthetic_fixture(self):
        raw = SYNTHETIC_FIXTURE.read_bytes()
        parsed = parse_csv_bytes(
            raw,
            filename=SYNTHETIC_FIXTURE.name,
            mapping=MAPPING,
        )

        self.assertEqual(parsed.total_records, 22)
        self.assertEqual(parsed.valid_records, 22)
        self.assertEqual(parsed.error_records, 0)
        self.assertEqual(parsed.errors, [])
        self.assertEqual(parsed.warnings, [])
        self.assertEqual(parsed.duplicate_source_id_count, 0)
        self.assertEqual(parsed.header, ["review_id", "brand", "text", "context"])
        self.assertEqual(parsed.source_brands, ["DHC", "Vaseline"])
        self.assertEqual(parsed.input_hash, hashlib.sha256(raw).hexdigest())
        self.assertEqual(len(parsed.input_hash), 64)

        # CSV record numbers are not physical line numbers because record 21
        # contains a newline inside a quoted cell.
        record_20 = parsed.records[19]
        record_21 = parsed.records[20]
        record_22 = parsed.records[21]
        self.assertEqual(record_20.record_number, 20)
        self.assertIn(",", record_20.text)
        self.assertEqual(record_21.record_number, 21)
        self.assertIn("\n", record_21.text)
        self.assertGreater(record_21.physical_line, record_21.record_number)
        self.assertEqual(record_22.record_number, 22)
        self.assertIn('"cứu tinh"', record_22.text)
        self.assertIn(',', record_21.context)

    def test_bom_is_supported(self):
        raw = b"\xef\xbb\xbf" + SYNTHETIC_FIXTURE.read_bytes()
        parsed = parse_csv_bytes(
            raw,
            filename="bom.csv",
            mapping=MAPPING,
        )
        self.assertEqual(parsed.header[0], "review_id")
        self.assertEqual(parsed.total_records, 22)
        self.assertEqual(parsed.records[0].source_id, "SYN-001")

    def test_optional_source_id_alias_is_not_used_by_parser(self):
        mapping = ColumnMapping(text="text", brand="brand")
        parsed = parse_csv_bytes(
            SYNTHETIC_FIXTURE.read_bytes(),
            filename=SYNTHETIC_FIXTURE.name,
            mapping=mapping,
        )
        self.assertIsNone(parsed.records[0].source_id)
        self.assertEqual(parsed.mapping.source_id, None)


class CsvValidationTests(unittest.TestCase):
    header = ["review_id", "brand", "text", "context"]

    def parse(self, raw: bytes, **kwargs):
        return parse_csv_bytes(raw, filename="test.csv", mapping=MAPPING, **kwargs)

    def assert_fatal(self, raw: bytes, code: str, **kwargs):
        with self.assertRaises(CsvInputError) as context:
            self.parse(raw, **kwargs)
        self.assertEqual(context.exception.code, code)
        return context.exception

    def test_duplicate_header(self):
        raw = make_csv(["review_id", "brand", "text", "text"], [])
        exc = self.assert_fatal(raw, "duplicate_header")
        self.assertEqual(exc.details["duplicate_headers"], ["text"])

    def test_short_record_reports_csv_record_number(self):
        raw = make_csv(self.header, [["SYN-1", "DHC", "hello"]])
        parsed = self.parse(raw)
        self.assertEqual(parsed.total_records, 1)
        self.assertEqual(parsed.error_records, 1)
        self.assertEqual(parsed.errors[0].record_number, 1)
        self.assertEqual(parsed.errors[0].physical_line, 2)
        self.assertEqual(parsed.errors[0].code, "invalid_field_count")

    def test_empty_text_is_an_error(self):
        raw = make_csv(self.header, [["SYN-1", "DHC", "   ", ""]])
        parsed = self.parse(raw)
        self.assertEqual(parsed.valid_records, 0)
        self.assertEqual(parsed.errors[0].code, "text_empty")
        self.assertEqual(parsed.errors[0].field, "text")

    def test_text_and_context_at_exact_limits_are_accepted(self):
        raw = make_csv(
            self.header,
            [["SYN-1", "DHC", "x" * 2000, "c" * 1000]],
        )
        parsed = self.parse(raw)
        self.assertEqual(parsed.valid_records, 1)
        self.assertEqual(parsed.errors, [])

    def test_text_too_long(self):
        raw = make_csv(self.header, [["SYN-1", "DHC", "x" * 2001, ""]])
        parsed = self.parse(raw)
        self.assertEqual(parsed.errors[0].code, "text_too_long")

    def test_context_too_long(self):
        raw = make_csv(self.header, [["SYN-1", "DHC", "ok", "c" * 1001]])
        parsed = self.parse(raw)
        self.assertEqual(parsed.errors[0].code, "context_too_long")

    def test_too_many_records_is_rejected_without_truncation(self):
        rows = [[f"SYN-{i}", "DHC", "ok", ""] for i in range(1, 502)]
        self.assert_fatal(make_csv(self.header, rows), "too_many_records")

    def test_file_too_large_is_rejected_before_parsing(self):
        raw = b"x" * (2 * 1024 * 1024 + 1)
        self.assert_fatal(raw, "file_too_large")

    def test_duplicate_source_ids_are_warnings_not_errors(self):
        raw = make_csv(
            self.header,
            [
                ["SAME", "DHC", "ok 1", ""],
                ["SAME", "Vaseline", "ok 2", ""],
            ],
        )
        parsed = self.parse(raw)
        self.assertEqual(parsed.valid_records, 2)
        self.assertEqual(parsed.error_records, 0)
        self.assertEqual(parsed.duplicate_source_id_count, 1)
        self.assertEqual(len(parsed.warnings), 1)
        self.assertEqual(parsed.warnings[0].record_numbers, [1, 2])

    def test_unconfirmed_source_brand_is_an_error(self):
        raw = make_csv(
            self.header,
            [
                ["S1", "DHC", "ok", ""],
                ["S2", "Other", "ok", ""],
            ],
        )
        parsed = self.parse(raw, confirmed_brands=["DHC", "Vaseline"])
        self.assertEqual(parsed.valid_records, 1)
        self.assertEqual(parsed.error_records, 1)
        self.assertEqual(parsed.errors[0].record_number, 2)
        self.assertEqual(parsed.errors[0].code, "brand_not_confirmed")

    def test_brand_is_not_required_to_be_confirmed_in_preview(self):
        raw = make_csv(self.header, [["S2", "Other", "ok", ""]])
        parsed = self.parse(raw)
        self.assertEqual(parsed.valid_records, 1)
        self.assertEqual(parsed.source_brands, ["Other"])

    def test_invalid_encoding(self):
        self.assert_fatal(b"\xff\xfe\x00", "invalid_encoding")

    def test_malformed_quote_is_csv_parse_error(self):
        raw = b'review_id,brand,text,context\nS1,DHC,"unterminated,ctx\n'
        exc = self.assert_fatal(raw, "csv_parse_error")
        self.assertEqual(exc.details["record_number"], 1)

    def test_mapping_missing_column(self):
        mapping = ColumnMapping(text="missing", brand="brand")
        with self.assertRaises(CsvInputError) as context:
            parse_csv_bytes(
                make_csv(self.header, [["S1", "DHC", "ok", ""]]),
                filename="test.csv",
                mapping=mapping,
            )
        self.assertEqual(context.exception.code, "mapping_missing_column")

    def test_mapping_roles_must_use_distinct_columns(self):
        mapping = ColumnMapping(text="text", brand="text")
        with self.assertRaises(CsvInputError) as context:
            parse_csv_bytes(
                make_csv(self.header, [["S1", "DHC", "ok", ""]]),
                filename="test.csv",
                mapping=mapping,
            )
        self.assertEqual(context.exception.code, "mapping_columns_not_distinct")

    def test_header_only_has_no_data(self):
        self.assert_fatal(
            make_csv(self.header, []),
            "csv_no_data",
        )

    def test_source_id_empty_becomes_none(self):
        raw = make_csv(self.header, [["", "DHC", "ok", ""]])
        parsed = self.parse(raw)
        self.assertIsNone(parsed.records[0].source_id)

    def test_original_text_and_context_are_preserved(self):
        raw = make_csv(self.header, [["S1", "DHC", "  giữ nguyên  ", " ngữ cảnh "]])
        parsed = self.parse(raw)
        self.assertEqual(parsed.records[0].text, "  giữ nguyên  ")
        self.assertEqual(parsed.records[0].context, " ngữ cảnh ")


if __name__ == "__main__":
    unittest.main()
