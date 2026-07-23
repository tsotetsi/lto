from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Text, Boolean, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from base import Base


class Snippet(Base):
    """SQLAlchemy model for reusable LaTeX snippets."""

    __tablename__ = "snippets"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )
    internal_name = Column(Text, nullable=False, unique=True)
    default_display_name = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    latex_content = Column(Text, nullable=False)
    category = Column(Text, nullable=True)  # e.g., "professional" or "personal"
    tags = Column(Text, nullable=True)  # Comma-separated tags
    icon = Column(Text, nullable=True)  # URL or base64
    is_user_defined = Column(
        Boolean, default=False
    )  # Whether the snippet is user-defined or not
    created_at = Column(DateTime, server_default=func.now(), default=datetime.utcnow)
    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        default=datetime.utcnow,
    )

    preferences = relationship("UserSnippetPreference", back_populates="snippet")


class UserSnippetPreference(Base):
    """User-specific preferences for snippets (e.g., custom display names)."""

    __tablename__ = "user_snippet_preferences"

    user_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
    )
    snippet_id = Column(
        UUID(as_uuid=True),
        ForeignKey("snippets.id", ondelete="CASCADE"),
        primary_key=True,
    )
    custom_display_name = Column(Text, nullable=True)

    snippet = relationship("Snippet", back_populates="preferences")