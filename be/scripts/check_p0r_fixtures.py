#!/usr/bin/env python3
"""Check P0R fixtures without calling a model or touching test data.

Run from the repo root:
    python be/scripts/check_p0r_fixtures.py
"""

from __future__ import annotations

import csv
import io
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FIXTURES = ROOT / "be" / "data" / "fixtures"

VILIPBTA_CSV = FIXTURES / "p0_vilipbta_42_input.csv"
VILIPBTA_REF = FIXTURES / "p0_vilipbta_42_silver_ref.json"
VILIPBTA_EXPECTED = FIXTURES / "p0_vilipbta_expected_extraction.json"

SYNTHETIC_CSV = FIXTURES / "p0_synthetic_dhc_vs_vaseline_22.csv"
SYNTHETIC_EXPECTED = FIXTURES / "p0_synthetic_expected_extraction.json"

MAX_BYTES = 2 * 1024 * 1024
MAX_RECORDS = 500
MAX_TEXT = 2000
MAX_CONTEXT = 1000
BRANDS = {"DHC", "Vaseline"}
ASPECTS = {
    "GeneralExperience",
    "Benefits",
    "Color",
    "SideEffects",
    "Price",
    "Texture",
    "Longevity",
    "Scent",
    "Packaging",
    "Ingredients",
}
SENTIMENTS = {"Positive", "Negative", "Neutral"}
RELEVANCE = {"relevant", "off_topic", "needs_review"}
TARGETS = BRANDS | {"General", "other", "unresolved"}
FORBIDDEN_COLUMNS = {
    "brand_label",
    "comment_type",
    "gold",
    "label",
    "labels",
    "quadruples",
    "sentiment",
    "silver",
    "silver_quadruples",
    "source_brand",
    "target_brand",
}

errors: list[str] = []


def require(name: str, condition: bool, detail: object = "") -> bool:
    if condition:
        print(f"PASS  {name}")
        return True
    suffix = f": {detail}" if detail != "" else ""
    message = f"{name}{suffix}"
    errors.append(message)
    print(f"FAIL  {message}")
    return False


def read_csv(path: Path, expected_header: list[str]):
    if not path.exists():
        require(f"{path.name} exists", False, "missing file")
        return None, None

    raw = path.read_bytes()
    require(f"{path.name} <= 2 MiB", len(raw) <= MAX_BYTES, f"{len(raw)} bytes")
    require(f"{path.name} has no NUL byte", b"\x00" not in raw)

    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        require(f"{path.name} is UTF-8", False, str(exc))
        return None, None

    reader = csv.reader(io.StringIO(text, newline=""))
    try:
        header = next(reader)
        values = list(reader)
    except StopIteration:
        require(f"{path.name} has a header", False, "empty file")
        return None, None
    except csv.Error as exc:
        require(f"{path.name} parses as CSV", False, str(exc))
        return None, None

    header_is_expected = header == expected_header
    require(f"{path.name} header is exact", header_is_expected, repr(header))
    require(f"{path.name} header has no duplicates", len(header) == len(set(header)))
    require(
        f"{path.name} has no reference-label columns",
        not (set(header) & FORBIDDEN_COLUMNS),
        repr(sorted(set(header) & FORBIDDEN_COLUMNS)),
    )
    require(f"{path.name} has data records", len(values) > 0, str(len(values)))
    require(f"{path.name} <= {MAX_RECORDS} records", len(values) <= MAX_RECORDS, str(len(values)))
    if not header_is_expected:
        return header, []

    bad_width = [
        (number, len(row))
        for number, row in enumerate(values, start=1)
        if len(row) != len(header)
    ]
    require(
        f"{path.name} records match header width",
        not bad_width,
        f"first bad records (number, fields): {bad_width[:5]}",
    )

    rows = [
        dict(zip(header, row))
        for row in values
        if len(row) == len(header)
    ]
    ids = [row.get("review_id", "") for row in rows]
    require(f"{path.name} review_id is non-empty", all(ids))
    require(f"{path.name} review_id is unique", len(ids) == len(set(ids)))

    empty_text = [i for i, row in enumerate(rows, start=1) if not row.get("text", "").strip()]
    long_text = [i for i, row in enumerate(rows, start=1) if len(row.get("text", "")) > MAX_TEXT]
    long_context = [
        i for i, row in enumerate(rows, start=1) if len(row.get("context", "")) > MAX_CONTEXT
    ]
    require(f"{path.name} text is non-empty", not empty_text, f"records {empty_text[:5]}")
    require(
        f"{path.name} text <= {MAX_TEXT} chars",
        not long_text,
        f"records {long_text[:5]}",
    )
    require(
        f"{path.name} context <= {MAX_CONTEXT} chars",
        not long_context,
        f"records {long_context[:5]}",
    )
    return header, rows


def check_silver_reference(rows: list[dict[str, str]]) -> None:
    if not VILIPBTA_REF.exists():
        require(f"{VILIPBTA_REF.name} exists", False, "missing file")
        return

    reference = json.loads(VILIPBTA_REF.read_text(encoding="utf-8"))
    require(f"{VILIPBTA_REF.name} is a JSON list", isinstance(reference, list))
    if not isinstance(reference, list):
        return

    require(f"{VILIPBTA_REF.name} has 42 rows", len(reference) == 42, str(len(reference)))
    require(
        f"{VILIPBTA_REF.name} has no misleading source_brand field",
        all("source_brand" not in row for row in reference),
    )
    require(
        f"{VILIPBTA_REF.name} keeps labels in silver_reference_group",
        all(row.get("silver_reference_group") in BRANDS for row in reference),
    )
    require(
        f"{VILIPBTA_REF.name} is not gold/test data",
        {row.get("split") for row in reference} <= {"train", "validation"},
    )
    require(
        f"{VILIPBTA_REF.name} rows have silver_quadruples",
        all(isinstance(row.get("silver_quadruples"), list) for row in reference),
    )

    by_id = {row.get("review_id"): row for row in rows}
    reference_by_id = {row.get("review_id"): row for row in reference}
    require(
        f"{VILIPBTA_REF.name} review_ids match input",
        set(by_id) == set(reference_by_id),
        f"input-only={sorted(set(by_id) - set(reference_by_id))[:5]} ref-only={sorted(set(reference_by_id) - set(by_id))[:5]}",
    )
    require(
        f"{VILIPBTA_REF.name} text/context match input",
        all(
            row.get("text") == by_id[row.get("review_id")].get("text")
            and row.get("context") == by_id[row.get("review_id")].get("context")
            for row in reference
            if row.get("review_id") in by_id
        ),
    )


def check_examples(path: Path, fixture_name: str, rows: list[dict[str, str]]) -> None:
    if not path.exists():
        require(f"{path.name} exists", False, "missing file")
        return

    payload = json.loads(path.read_text(encoding="utf-8"))
    require(f"{path.name} is a JSON object", isinstance(payload, dict))
    if not isinstance(payload, dict):
        return

    require(
        f"{path.name} is marked not-for-quality-benchmark",
        payload.get("not_for_quality_benchmark") is True,
    )
    require(
        f"{path.name} points to the right fixture",
        payload.get("fixture") == fixture_name,
        repr(payload.get("fixture")),
    )

    examples = payload.get("examples")
    require(f"{path.name} has an examples list", isinstance(examples, list))
    if not isinstance(examples, list):
        return
    require(f"{path.name} has at least 5 examples", len(examples) >= 5, str(len(examples)))

    by_id = {row.get("review_id"): row for row in rows}
    example_ids = [example.get("review_id") for example in examples]
    require(f"{path.name} example review_id is unique", len(example_ids) == len(set(example_ids)))
    missing_ids = [review_id for review_id in example_ids if review_id not in by_id]
    require(
        f"{path.name} example review_ids exist in CSV",
        not missing_ids,
        repr(missing_ids),
    )

    bad_relevance: list[tuple[object, object]] = []
    bad_targets: list[tuple[str, object]] = []
    bad_aspects: list[tuple[str, object]] = []
    bad_sentiments: list[tuple[str, object]] = []
    bad_evidence: list[tuple[str, object]] = []
    evidence_not_in_text: list[tuple[str, str]] = []
    duplicate_mentions: list[str] = []
    targets: set[str] = set()
    has_source_target_mismatch = False

    for example in examples:
        review_id = str(example.get("review_id"))
        row = by_id.get(review_id)
        if row is None:
            continue

        relevance = example.get("relevance")
        if relevance not in RELEVANCE:
            bad_relevance.append((review_id, relevance))

        mentions = example.get("mentions")
        if not isinstance(mentions, list):
            bad_relevance.append((review_id, "mentions-not-list"))
            continue

        seen: set[tuple[str, str, str, str]] = set()
        for mention in mentions:
            target = mention.get("target_brand")
            aspect = mention.get("aspect")
            sentiment = mention.get("sentiment")
            evidence = mention.get("evidence")
            targets.add(target)

            if target not in TARGETS:
                bad_targets.append((review_id, target))
            if aspect not in ASPECTS:
                bad_aspects.append((review_id, aspect))
            if sentiment not in SENTIMENTS:
                bad_sentiments.append((review_id, sentiment))
            if not isinstance(evidence, str) or not evidence:
                bad_evidence.append((review_id, evidence))
            elif evidence not in row.get("text", ""):
                evidence_not_in_text.append((review_id, evidence))

            key = (str(target), str(aspect), str(sentiment), str(evidence))
            if key in seen:
                duplicate_mentions.append(review_id)
            seen.add(key)

            if target in BRANDS and row.get("brand") and target != row.get("brand"):
                has_source_target_mismatch = True

    require(f"{path.name} relevance values are allowed", not bad_relevance, repr(bad_relevance[:5]))
    require(f"{path.name} target values are allowed", not bad_targets, repr(bad_targets[:5]))
    require(f"{path.name} aspects are in taxonomy", not bad_aspects, repr(bad_aspects[:5]))
    require(
        f"{path.name} sentiments are allowed",
        not bad_sentiments,
        repr(bad_sentiments[:5]),
    )
    require(f"{path.name} evidence is non-empty", not bad_evidence, repr(bad_evidence[:5]))
    require(
        f"{path.name} evidence is verbatim in text",
        not evidence_not_in_text,
        repr(evidence_not_in_text[:5]),
    )
    require(
        f"{path.name} mentions are not duplicated",
        not duplicate_mentions,
        repr(duplicate_mentions[:5]),
    )

    if fixture_name == SYNTHETIC_CSV.name:
        require(
            f"{path.name} covers an outside-pair brand",
            "other" in targets,
            repr(sorted(str(target) for target in targets)),
        )
        require(
            f"{path.name} covers source brand != target brand",
            has_source_target_mismatch,
        )
        require(
            f"{path.name} covers all relevance outcomes",
            {"off_topic", "needs_review", "relevant"}
            <= {example.get("relevance") for example in examples},
        )


def main() -> int:
    vilipbta_header, vilipbta_rows = read_csv(
        VILIPBTA_CSV, ["review_id", "text", "context"]
    )
    if vilipbta_header is not None:
        require(
            f"{VILIPBTA_CSV.name} has no brand column",
            "brand" not in vilipbta_header,
            repr(vilipbta_header),
        )
    if vilipbta_rows is not None:
        require(
            f"{VILIPBTA_CSV.name} has 42 records",
            len(vilipbta_rows) == 42,
            str(len(vilipbta_rows)),
        )

    synthetic_header, synthetic_rows = read_csv(
        SYNTHETIC_CSV, ["review_id", "brand", "text", "context"]
    )
    if synthetic_header is not None and synthetic_rows is not None:
        brands = {row["brand"] for row in synthetic_rows}
        require(
            f"{SYNTHETIC_CSV.name} uses exactly two source brands",
            brands == BRANDS,
            repr(sorted(brands)),
        )
        require(
            f"{SYNTHETIC_CSV.name} has 22 records",
            len(synthetic_rows) == 22,
            str(len(synthetic_rows)),
        )
        require(
            f"{SYNTHETIC_CSV.name} exercises quoted comma cells",
            any("," in row["text"] or "," in row["context"] for row in synthetic_rows),
        )
        require(
            f"{SYNTHETIC_CSV.name} exercises quoted newline cells",
            any("\n" in row["text"] or "\n" in row["context"] for row in synthetic_rows),
        )
        require(
            f"{SYNTHETIC_CSV.name} exercises escaped double quotes",
            any('"' in row["text"] or '"' in row["context"] for row in synthetic_rows),
        )

    if vilipbta_rows is not None:
        check_silver_reference(vilipbta_rows)
        check_examples(VILIPBTA_EXPECTED, VILIPBTA_CSV.name, vilipbta_rows)
    if synthetic_rows is not None:
        check_examples(SYNTHETIC_EXPECTED, SYNTHETIC_CSV.name, synthetic_rows)

    if errors:
        print(f"\nFAILED: {len(errors)} check(s)")
        for error in errors:
            print(f"  - {error}")
        return 1

    print("\nPASSED: all P0R fixture checks")
    return 0


if __name__ == "__main__":
    sys.exit(main())
