import json
import logging
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from pydantic import ValidationError
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .config import get_settings
from .csv_import import ColumnMapping, CsvInputError, ParsedCsv, parse_csv_bytes
from .db import get_db
from .models import Analysis, Review
from .schemas import (
    AnalysisCreateResponse,
    AnalysisResponse,
    ColumnMappingIn,
    PreviewLimits,
    PreviewRecordModel,
    PreviewResponse,
    ReviewItem,
    ReviewPage,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")
PREVIEW_LIMIT = 10


def _http_error(status_code: int, code: str, message: str, **details: object) -> None:
    raise HTTPException(
        status_code=status_code,
        detail={"code": code, "message": message, **details},
    )


def _csv_error_to_http(exc: CsvInputError) -> None:
    status_code = 413 if exc.code in {"file_too_large", "too_many_records"} else 422
    _http_error(status_code, exc.code, exc.message, **exc.details)


def _parse_mapping(raw: str) -> ColumnMappingIn:
    try:
        return ColumnMappingIn.model_validate_json(raw)
    except ValidationError as exc:
        _http_error(
            422,
            "invalid_mapping",
            "Mapping phải là JSON hợp lệ với text và brand.",
            errors=exc.errors(include_url=False),
        )
    except ValueError as exc:
        _http_error(
            422,
            "invalid_mapping",
            "Mapping phải là JSON hợp lệ với text và brand.",
            errors=str(exc),
        )
    raise AssertionError("unreachable")


def _parse_brands(raw: str | None, *, required: bool) -> list[str] | None:
    if raw is None:
        if required:
            _http_error(422, "missing_brands", "Phải xác nhận đúng hai brand.")
        return None

    try:
        value = json.loads(raw)
    except json.JSONDecodeError as exc:
        _http_error(
            422,
            "invalid_brands",
            "brands phải là JSON array gồm đúng hai chuỗi.",
            errors=str(exc),
        )

    if (
        not isinstance(value, list)
        or len(value) != 2
        or any(not isinstance(brand, str) or not brand.strip() for brand in value)
    ):
        _http_error(
            422,
            "invalid_brands",
            "brands phải là JSON array gồm đúng hai chuỗi khác rỗng.",
        )
    if value[0] == value[1]:
        _http_error(422, "brands_not_distinct", "Hai brand đã xác nhận phải khác nhau.")
    if any(len(brand) > 100 for brand in value):
        _http_error(422, "brand_too_long", "Mỗi brand tối đa 100 ký tự.")
    return value


def _sanitize_filename(filename: str | None) -> str:
    name = Path(filename or "upload.csv").name or "upload.csv"
    return name[:255]


async def _read_upload_limited(file: UploadFile, max_bytes: int) -> bytes:
    raw = await file.read(max_bytes + 1)
    if len(raw) > max_bytes:
        _http_error(
            413,
            "file_too_large",
            f"File vượt quá {max_bytes} byte. Hãy chia nhỏ file.",
            size_bytes=len(raw),
            max_bytes=max_bytes,
        )
    if not raw:
        _http_error(422, "empty_file", "File CSV rỗng.")
    return raw


def _preview_response(parsed: ParsedCsv) -> PreviewResponse:
    settings = get_settings()
    return PreviewResponse(
        filename=parsed.filename,
        input_hash=parsed.input_hash,
        header=parsed.header,
        mapping=parsed.mapping.as_dict(),
        total_records=parsed.total_records,
        valid_records=parsed.valid_records,
        error_records=parsed.error_records,
        preview=[
            PreviewRecordModel(**record.as_dict())
            for record in parsed.records[:PREVIEW_LIMIT]
        ],
        errors=[issue.as_dict() for issue in parsed.errors],
        warnings=[warning.as_dict() for warning in parsed.warnings],
        source_brands=parsed.source_brands,
        limits=PreviewLimits(
            max_bytes=settings.csv_max_bytes,
            max_records=settings.csv_max_records,
            max_text_chars=settings.review_max_text_chars,
            max_context_chars=settings.review_max_context_chars,
        ),
    )


def _analysis_response(analysis: Analysis) -> AnalysisResponse:
    return AnalysisResponse(
        analysis_id=analysis.id,
        filename=analysis.filename,
        input_hash=analysis.input_hash,
        mapping=analysis.mapping,
        brands=[analysis.brand_a, analysis.brand_b],
        import_status=analysis.import_status,
        analysis_status=analysis.analysis_status,
        total_records=analysis.total_records,
        imported_records=analysis.imported_records,
        duplicate_source_id_count=analysis.duplicate_source_id_count,
        created_at=analysis.created_at,
    )


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/imports/preview", response_model=PreviewResponse)
async def preview_import(
    file: UploadFile = File(...),
    mapping: str = Form(...),
    brands: str | None = Form(default=None),
) -> PreviewResponse:
    settings = get_settings()
    mapping_in = _parse_mapping(mapping)
    confirmed_brands = _parse_brands(brands, required=False)
    raw = await _read_upload_limited(file, settings.csv_max_bytes)

    try:
        parsed = parse_csv_bytes(
            raw,
            filename=_sanitize_filename(file.filename),
            mapping=ColumnMapping(**mapping_in.model_dump()),
            confirmed_brands=confirmed_brands,
            max_bytes=settings.csv_max_bytes,
            max_records=settings.csv_max_records,
            max_text_chars=settings.review_max_text_chars,
            max_context_chars=settings.review_max_context_chars,
        )
    except CsvInputError as exc:
        _csv_error_to_http(exc)
    return _preview_response(parsed)


@router.post(
    "/analyses",
    response_model=AnalysisCreateResponse,
    status_code=201,
)
async def create_analysis(
    file: UploadFile = File(...),
    mapping: str = Form(...),
    brands: str = Form(...),
    db: Session = Depends(get_db),
) -> AnalysisCreateResponse:
    settings = get_settings()
    mapping_in = _parse_mapping(mapping)
    confirmed_brands = _parse_brands(brands, required=True)
    if confirmed_brands is None:
        _http_error(422, "missing_brands", "Phải xác nhận đúng hai brand.")
    raw = await _read_upload_limited(file, settings.csv_max_bytes)

    try:
        parsed = parse_csv_bytes(
            raw,
            filename=_sanitize_filename(file.filename),
            mapping=ColumnMapping(**mapping_in.model_dump()),
            confirmed_brands=confirmed_brands,
            max_bytes=settings.csv_max_bytes,
            max_records=settings.csv_max_records,
            max_text_chars=settings.review_max_text_chars,
            max_context_chars=settings.review_max_context_chars,
        )
    except CsvInputError as exc:
        _csv_error_to_http(exc)

    if parsed.error_records:
        _http_error(
            422,
            "import_validation_failed",
            (
                "Có bản ghi lỗi nên chưa tạo analysis. "
                "Sửa toàn bộ lỗi rồi gửi lại; P1 không nhập riêng phần hợp lệ."
            ),
            total_records=parsed.total_records,
            valid_records=parsed.valid_records,
            error_records=parsed.error_records,
            errors=[issue.as_dict() for issue in parsed.errors],
        )

    analysis = Analysis(
        filename=parsed.filename,
        input_hash=parsed.input_hash,
        mapping=parsed.mapping.as_dict(),
        brand_a=confirmed_brands[0],
        brand_b=confirmed_brands[1],
        import_status="imported",
        analysis_status="not_started",
        total_records=parsed.total_records,
        imported_records=parsed.valid_records,
        duplicate_source_id_count=parsed.duplicate_source_id_count,
        reviews=[
            Review(
                record_number=record.record_number,
                source_id=record.source_id,
                source_brand=record.source_brand,
                text=record.text,
                context=record.context,
            )
            for record in parsed.records
        ],
    )

    try:
        with db.begin():
            db.add(analysis)
    except Exception:
        logger.exception("Không lưu được analysis")
        _http_error(500, "analysis_save_failed", "Không lưu được analysis.")

    db.refresh(analysis)
    response = AnalysisCreateResponse(
        **_analysis_response(analysis).model_dump(),
        warnings=[warning.as_dict() for warning in parsed.warnings],
    )
    return response


@router.get("/analyses/{analysis_id}", response_model=AnalysisResponse)
def get_analysis(
    analysis_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> AnalysisResponse:
    analysis = db.get(Analysis, analysis_id)
    if analysis is None:
        _http_error(404, "analysis_not_found", "Không tìm thấy analysis.")
    return _analysis_response(analysis)


@router.get("/analyses/{analysis_id}/reviews", response_model=ReviewPage)
def list_reviews(
    analysis_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
) -> ReviewPage:
    analysis = db.get(Analysis, analysis_id)
    if analysis is None:
        _http_error(404, "analysis_not_found", "Không tìm thấy analysis.")

    total = db.scalar(
        select(func.count()).select_from(Review).where(Review.analysis_id == analysis_id)
    )
    rows = db.scalars(
        select(Review)
        .where(Review.analysis_id == analysis_id)
        .order_by(Review.record_number)
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    return ReviewPage(
        analysis_id=analysis_id,
        page=page,
        page_size=page_size,
        total=int(total or 0),
        items=[
            ReviewItem(
                review_id=row.id,
                source_id=row.source_id,
                record_number=row.record_number,
                source_brand=row.source_brand,
                text=row.text,
                context=row.context,
                created_at=row.created_at,
            )
            for row in rows
        ],
    )
