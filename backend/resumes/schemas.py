from datetime import datetime
from uuid import UUID
from typing import Dict, Optional

from pydantic import BaseModel


class SnippetBase(BaseModel):
    internal_name: str
    default_display_name: str
    description: str | None = None
    latex_content: str
    category: str | None = None


class SnippetCreate(SnippetBase):
    pass


class SnippetUpdate(SnippetBase):
    pass


class SnippetResponse(SnippetBase):
    id: UUID
    display_name: str  # This will be the custom name if it exists, otherwise the default.
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SnippetListResponse(BaseModel):
    snippets: list[SnippetResponse]
