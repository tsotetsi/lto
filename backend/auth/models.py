from datetime import datetime

from sqlalchemy import Column, DateTime, Text, Boolean, func
from sqlalchemy.dialects.postgresql import UUID

from base import Base


class User(Base):
    """SQLAlchemy model for authenticated users."""

    __tablename__ = "users"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )
    email = Column(Text, nullable=False, unique=True, index=True)
    hashed_password = Column(Text, nullable=False)
    display_name = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), default=datetime.utcnow)
    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        default=datetime.utcnow,
    )
