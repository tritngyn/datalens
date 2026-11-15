import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


class Analysis(Base):
    __tablename__ = "analyses"
    __table_args__ = (
        CheckConstraint("brand_a <> brand_b", name="ck_analyses_distinct_brands"),
        CheckConstraint("filename <> ''", name="ck_analyses_filename_non_empty"),
        CheckConstraint("length(input_hash) = 64", name="ck_analyses_input_hash_length"),
        CheckConstraint("import_status = 'imported'", name="ck_analyses_import_status"),
        CheckConstraint(
            "analysis_status IN ('not_started', 'queued', 'running', 'completed', 'failed')",
            name="ck_analyses_analysis_status",
        ),
        CheckConstraint(
            "total_records >= 0 AND imported_records >= 0 AND imported_records <= total_records",
            name="ck_analyses_record_counts",
        ),
        CheckConstraint(
            "duplicate_source_id_count >= 0",
            name="ck_analyses_duplicate_source_count",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    input_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    mapping: Mapped[dict] = mapped_column(JSON, nullable=False)
    brand_a: Mapped[str] = mapped_column(String(100), nullable=False)
    brand_b: Mapped[str] = mapped_column(String(100), nullable=False)
    import_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="imported", server_default="imported"
    )
    analysis_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="not_started", server_default="not_started"
    )
    total_records: Mapped[int] = mapped_column(Integer, nullable=False)
    imported_records: Mapped[int] = mapped_column(Integer, nullable=False)
    duplicate_source_id_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    reviews: Mapped[list["Review"]] = relationship(
        back_populates="analysis",
        cascade="all, delete-orphan",
        order_by="Review.record_number",
    )


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (
        UniqueConstraint(
            "analysis_id", "record_number", name="uq_reviews_analysis_record_number"
        ),
        CheckConstraint("record_number >= 1", name="ck_reviews_record_number_positive"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    analysis_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    record_number: Mapped[int] = mapped_column(Integer, nullable=False)
    source_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_brand: Mapped[str] = mapped_column(String(100), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    context: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    analysis: Mapped[Analysis] = relationship(back_populates="reviews")
