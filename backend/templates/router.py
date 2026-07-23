from typing import Optional
from pathlib import Path

from fastapi import APIRouter, HTTPException, status, BackgroundTasks

from .schemas import Template, TemplateFillRequest, ResumeRequest, CompileFromTemplateRequest
from services import compile_latex
from managers import TemplateManager


# Temporary directory for compilation
TEMP_DIR = Path("/tmp/cv_builds")
TEMP_DIR.mkdir(exist_ok=True)

# Initialize template manager
template_manager = TemplateManager()
template_manager.create_default_templates()

router = APIRouter()


@router.get(
    "/templates",
    response_model=list[Template],
    response_description="List of available templates.",
    status_code=status.HTTP_200_OK,
)
async def get_all_templates(category: Optional[str] = None):
    """Get all templates, optionally filtered by category."""
    return template_manager.list_templates(category)


@router.get(
    "/templates/{template_id}",
    response_model=Template,
    response_description="Template details.",
    status_code=status.HTTP_200_OK,
)
async def get_template(template_id: str):
    """Returns a single template by its ID."""
    template = template_manager.load_template(template_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )
    return template


@router.post("/templates/{template_id}/fill")
async def fill_template(template_id: str, request: TemplateFillRequest):
    """Fills a template with user data and returns LaTeX content."""
    try:
        tex_content = template_manager.fill_template(template_id, request.variables)
        return {"tex_content": tex_content}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error filling template: {str(e)}",
        )


@router.post("/templates/compile")
async def compile_from_template(
    request: CompileFromTemplateRequest,
    background_tasks: BackgroundTasks,
):
    """Compile a filled template directly."""
    try:
        # Fill template with variables
        tex_content = template_manager.fill_template(request.template_id, request.variables)

        # Get template to extract font
        template = template_manager.load_template(request.template_id)
        font = template.font if template else "Liberation Sans"

        # Create compilation request
        compile_request = ResumeRequest(
            tex_content=tex_content,
            file_name=request.file_name,
            font=font,
        )

        # Use existing compilation logic
        return await compile_latex(compile_request, background_tasks)

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error: {str(e)}",
        )
