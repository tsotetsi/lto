from typing import Dict, Optional

from pydantic import BaseModel

from .models import TemplateVariable


class Template(BaseModel):
    id: str
    name: str
    description: str
    category: str
    thumbnail: Optional[str] = None
    tex_content: str
    variables: Dict[str, TemplateVariable]
    font: str = "Liberation Sans"
    created_at: str
    updated_at: str
    is_free: bool = True


class TemplateFillRequest(BaseModel):
    template_id: str
    variables: Dict[str, str]


class CompileFromTemplateRequest(BaseModel):
    template_id: str
    variables: Dict[str, str]
    file_name: str = "resume"


class ResumeRequest(BaseModel):
    tex_content: str
    file_name: str = "resume"
    font: str = "Liberation Sans"