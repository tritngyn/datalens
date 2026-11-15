import uuid
from datetime import datetime

from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class ColumnMappingIn(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    text: str = Field(min_length=1)
    brand: str = Field(min_length=1)
    context: str | None = None
    source_id: str | None = Field(
        default=None,
        validation_alias=AliasChoices("source_id", "review_id"),
    )


class RecordIssueModel(BaseModel):
    record_number: int
    physical_line: int
    field: str | None = None
    code: str
    message: str


class SourceIdWarningModel(BaseModel):
    code: str
    source_id: str
    record_numbers: list[int]
    message: str


class PreviewLimits(BaseModel):
    max_bytes: int
    max_records: int
    max_text_chars: int
    max_context_chars: int


class PreviewRecordModel(BaseModel):
    record_number: int
    physical_line: int
    source_id: str | None
    source_brand: str
    text: str
    context: str
    errors: list[RecordIssueModel]


class PreviewResponse(BaseModel):
    filename: str
    input_hash: str
    header: list[str]
    mapping: dict[str, str | None]
    total_records: int
    valid_records: int
    error_records: int
    preview: list[PreviewRecordModel]
    errors: list[RecordIssueModel]
    warnings: list[SourceIdWarningModel]
    source_brands: list[str]
    limits: PreviewLimits


class AnalysisResponse(BaseModel):
    analysis_id: uuid.UUID
    filename: str
    input_hash: str
    mapping: dict[str, str | None]
    brands: list[str]
    import_status: str
    analysis_status: str
    total_records: int
    imported_records: int
    duplicate_source_id_count: int
    created_at: datetime


class AnalysisCreateResponse(AnalysisResponse):
    warnings: list[SourceIdWarningModel]


class ReviewItem(BaseModel):
    review_id: uuid.UUID
    source_id: str | None
    record_number: int
    source_brand: str
    text: str
    context: str
    created_at: datetime


class ReviewPage(BaseModel):
    analysis_id: uuid.UUID
    page: int
    page_size: int
    total: int
    items: list[ReviewItem]
