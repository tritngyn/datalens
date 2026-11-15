from __future__ import annotations

import csv
import hashlib
import io
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Sequence


@dataclass(frozen=True)
class ColumnMapping:
    text: str
    brand: str
    context: str | None = None
    source_id: str | None = None

    def as_dict(self) -> dict[str, str | None]:
        return {
            "text": self.text,
            "brand": self.brand,
            "context": self.context,
            "source_id": self.source_id,
        }


@dataclass(frozen=True)
class RecordIssue:
    record_number: int
    physical_line: int
    code: str
    message: str
    field: str | None = None

    def as_dict(self) -> dict[str, object]:
        return {
            "record_number": self.record_number,
            "physical_line": self.physical_line,
            "field": self.field,
            "code": self.code,
            "message": self.message,
        }


@dataclass(frozen=True)
class SourceIdWarning:
    source_id: str
    record_numbers: list[int]

    def as_dict(self) -> dict[str, object]:
        return {
            "code": "duplicate_source_id",
            "source_id": self.source_id,
            "record_numbers": self.record_numbers,
            "message": (
                f"source ID {self.source_id!r} xuất hiện ở các bản ghi "
                f"{self.record_numbers}; các dòng vẫn được giữ riêng."
            ),
        }


@dataclass
class ParsedRecord:
    record_number: int
    physical_line: int
    source_id: str | None
    source_brand: str
    text: str
    context: str
    errors: list[RecordIssue] = field(default_factory=list)

    def as_dict(self) -> dict[str, object]:
        return {
            "record_number": self.record_number,
            "physical_line": self.physical_line,
            "source_id": self.source_id,
            "source_brand": self.source_brand,
            "text": self.text,
            "context": self.context,
            "errors": [issue.as_dict() for issue in self.errors],
        }


@dataclass
class ParsedCsv:
    filename: str
    input_hash: str
    header: list[str]
    mapping: ColumnMapping
    total_records: int
    valid_records: int
    error_records: int
    records: list[ParsedRecord]
    errors: list[RecordIssue]
    warnings: list[SourceIdWarning]
    source_brands: list[str]

    @property
    def duplicate_source_id_count(self) -> int:
        return sum(len(warning.record_numbers) - 1 for warning in self.warnings)


class CsvInputError(Exception):
    def __init__(self, code: str, message: str, **details: object) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details


def _selected_columns(mapping: ColumnMapping) -> list[tuple[str, str]]:
    selected = [("text", mapping.text), ("brand", mapping.brand)]
    if mapping.context:
        selected.append(("context", mapping.context))
    if mapping.source_id:
        selected.append(("source_id", mapping.source_id))
    return selected


def _validate_mapping(header: list[str], mapping: ColumnMapping) -> None:
    selected = _selected_columns(mapping)
    missing = [
        {"role": role, "column": column}
        for role, column in selected
        if column not in header
    ]
    if missing:
        raise CsvInputError(
            "mapping_missing_column",
            "Cột trong mapping không tồn tại ở header CSV.",
            missing=missing,
        )

    columns = [column for _, column in selected]
    duplicated = sorted({column for column in columns if columns.count(column) > 1})
    if duplicated:
        raise CsvInputError(
            "mapping_columns_not_distinct",
            "Mỗi vai trò mapping phải dùng một cột khác nhau.",
            duplicated_columns=duplicated,
        )


def parse_csv_bytes(
    raw: bytes,
    *,
    filename: str,
    mapping: ColumnMapping,
    confirmed_brands: Sequence[str] | None = None,
    max_bytes: int = 2 * 1024 * 1024,
    max_records: int = 500,
    max_text_chars: int = 2000,
    max_context_chars: int = 1000,
) -> ParsedCsv:
    """Parse one CSV in memory and return per-record validation results.

    This function does not write to the database and does not call a model.
    Record numbers count parsed CSV data records, not physical lines.
    """

    if len(raw) > max_bytes:
        raise CsvInputError(
            "file_too_large",
            f"File vượt quá {max_bytes} byte. Hãy chia nhỏ file.",
            size_bytes=len(raw),
            max_bytes=max_bytes,
        )
    if not raw:
        raise CsvInputError("empty_file", "File CSV rỗng.")

    try:
        decoded = raw.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise CsvInputError(
            "invalid_encoding",
            "File phải là UTF-8 hoặc UTF-8 BOM.",
            detail=str(exc),
        ) from exc

    input_hash = hashlib.sha256(raw).hexdigest()
    reader = csv.reader(io.StringIO(decoded, newline=""), strict=True)

    try:
        header = next(reader)
    except StopIteration as exc:
        raise CsvInputError("empty_file", "File CSV rỗng.") from exc
    except csv.Error as exc:
        raise CsvInputError(
            "csv_parse_error",
            "Không parse được header CSV.",
            physical_line=reader.line_num,
            detail=str(exc),
        ) from exc

    if not header or not any(column.strip() for column in header):
        raise CsvInputError("empty_header", "Header CSV rỗng.")

    duplicate_headers = sorted(
        {column for column in header if header.count(column) > 1}
    )
    if duplicate_headers:
        raise CsvInputError(
            "duplicate_header",
            "Header CSV có cột trùng.",
            duplicate_headers=duplicate_headers,
        )

    _validate_mapping(header, mapping)
    confirmed = set(confirmed_brands) if confirmed_brands is not None else None

    records: list[ParsedRecord] = []
    errors: list[RecordIssue] = []
    try:
        for row in reader:
            record_number = len(records) + 1
            physical_line = reader.line_num
            if record_number > max_records:
                raise CsvInputError(
                    "too_many_records",
                    f"File có hơn {max_records} bản ghi dữ liệu. Hãy chia nhỏ file.",
                    max_records=max_records,
                )

            issues: list[RecordIssue] = []
            values = dict(zip(header, row))
            if len(row) != len(header):
                issues.append(
                    RecordIssue(
                        record_number=record_number,
                        physical_line=physical_line,
                        code="invalid_field_count",
                        message=(
                            f"Bản ghi có {len(row)} trường, header có {len(header)} trường."
                        ),
                    )
                )

            text = values.get(mapping.text, "")
            brand = values.get(mapping.brand, "")
            context = values.get(mapping.context, "") if mapping.context else ""
            raw_source_id = (
                values.get(mapping.source_id, "") if mapping.source_id else ""
            )
            source_id = raw_source_id if raw_source_id != "" else None

            if not text.strip():
                issues.append(
                    RecordIssue(
                        record_number=record_number,
                        physical_line=physical_line,
                        field="text",
                        code="text_empty",
                        message="Text rỗng.",
                    )
                )
            elif len(text) > max_text_chars:
                issues.append(
                    RecordIssue(
                        record_number=record_number,
                        physical_line=physical_line,
                        field="text",
                        code="text_too_long",
                        message=f"Text vượt quá {max_text_chars} ký tự.",
                    )
                )

            if len(context) > max_context_chars:
                issues.append(
                    RecordIssue(
                        record_number=record_number,
                        physical_line=physical_line,
                        field="context",
                        code="context_too_long",
                        message=f"Context vượt quá {max_context_chars} ký tự.",
                    )
                )

            if not brand.strip():
                issues.append(
                    RecordIssue(
                        record_number=record_number,
                        physical_line=physical_line,
                        field="brand",
                        code="brand_empty",
                        message="Brand nguồn rỗng.",
                    )
                )
            elif confirmed is not None and brand not in confirmed:
                issues.append(
                    RecordIssue(
                        record_number=record_number,
                        physical_line=physical_line,
                        field="brand",
                        code="brand_not_confirmed",
                        message="Brand nguồn không nằm trong hai brand đã xác nhận.",
                    )
                )

            errors.extend(issues)
            records.append(
                ParsedRecord(
                    record_number=record_number,
                    physical_line=physical_line,
                    source_id=source_id,
                    source_brand=brand,
                    text=text,
                    context=context,
                    errors=issues,
                )
            )
    except csv.Error as exc:
        raise CsvInputError(
            "csv_parse_error",
            f"Không parse được CSV tại bản ghi {len(records) + 1}.",
            record_number=len(records) + 1,
            physical_line=reader.line_num,
            detail=str(exc),
        ) from exc

    if not records:
        raise CsvInputError("csv_no_data", "CSV không có bản ghi dữ liệu.")

    source_id_positions: dict[str, list[int]] = defaultdict(list)
    for record in records:
        if record.source_id is not None:
            source_id_positions[record.source_id].append(record.record_number)

    warnings = [
        SourceIdWarning(source_id=source_id, record_numbers=positions)
        for source_id, positions in source_id_positions.items()
        if len(positions) > 1
    ]
    warnings.sort(key=lambda warning: warning.record_numbers[0])

    source_brands = sorted(
        {record.source_brand for record in records if record.source_brand.strip()}
    )
    error_records = sum(1 for record in records if record.errors)

    return ParsedCsv(
        filename=filename,
        input_hash=input_hash,
        header=header,
        mapping=mapping,
        total_records=len(records),
        valid_records=len(records) - error_records,
        error_records=error_records,
        records=records,
        errors=errors,
        warnings=warnings,
        source_brands=source_brands,
    )
