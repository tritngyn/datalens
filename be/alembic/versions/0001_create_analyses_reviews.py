"""Create analyses and reviews for P1.

Revision ID: 0001_create_analyses_reviews
Revises:
Create Date: 2026-11-15

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0001_create_analyses_reviews"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "analyses",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("input_hash", sa.String(length=64), nullable=False),
        sa.Column("mapping", sa.JSON(), nullable=False),
        sa.Column("brand_a", sa.String(length=100), nullable=False),
        sa.Column("brand_b", sa.String(length=100), nullable=False),
        sa.Column(
            "import_status",
            sa.String(length=20),
            server_default=sa.text("'imported'"),
            nullable=False,
        ),
        sa.Column(
            "analysis_status",
            sa.String(length=20),
            server_default=sa.text("'not_started'"),
            nullable=False,
        ),
        sa.Column("total_records", sa.Integer(), nullable=False),
        sa.Column("imported_records", sa.Integer(), nullable=False),
        sa.Column(
            "duplicate_source_id_count",
            sa.Integer(),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "brand_a <> brand_b", name="ck_analyses_distinct_brands"
        ),
        sa.CheckConstraint(
            "filename <> ''", name="ck_analyses_filename_non_empty"
        ),
        sa.CheckConstraint(
            "length(input_hash) = 64", name="ck_analyses_input_hash_length"
        ),
        sa.CheckConstraint(
            "import_status = 'imported'", name="ck_analyses_import_status"
        ),
        sa.CheckConstraint(
            "analysis_status IN ('not_started', 'queued', 'running', 'completed', 'failed')",
            name="ck_analyses_analysis_status",
        ),
        sa.CheckConstraint(
            "total_records >= 0 AND imported_records >= 0 AND imported_records <= total_records",
            name="ck_analyses_record_counts",
        ),
        sa.CheckConstraint(
            "duplicate_source_id_count >= 0",
            name="ck_analyses_duplicate_source_count",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "reviews",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("analysis_id", sa.Uuid(), nullable=False),
        sa.Column("record_number", sa.Integer(), nullable=False),
        sa.Column("source_id", sa.Text(), nullable=True),
        sa.Column("source_brand", sa.String(length=100), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("context", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "record_number >= 1", name="ck_reviews_record_number_positive"
        ),
        sa.ForeignKeyConstraint(
            ["analysis_id"], ["analyses.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "analysis_id",
            "record_number",
            name="uq_reviews_analysis_record_number",
        ),
    )
    op.create_index(
        "ix_reviews_analysis_id",
        "reviews",
        ["analysis_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_reviews_analysis_id", table_name="reviews")
    op.drop_table("reviews")
    op.drop_table("analyses")
