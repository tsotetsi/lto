from typing import Dict, Optional

from pydantic import BaseModel


class TemplateVariable(BaseModel):
    name: str
    label: str
    default: str = ""
    required: bool = True
    type: str = "text"  # text, email, phone, date, multiline.


class Template(BaseModel):
    id: str
    name: str
    description: str
    category: str
    thumbnail: Optional[str] = None  # Base64 or URL.
    tex_content: str
    variables: Dict[str, TemplateVariable]
    font: str = "Liberation Sans"
    created_at: str
    updated_at: str
    is_free: bool = True