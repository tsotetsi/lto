from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from database import get_db
from . import models, schemas

router = APIRouter()

# For now, we'll use a hardcoded user ID. In a real application, you would
# get this from your authentication system.
SYSTEM_USER_ID = UUID("00000000-0000-0000-0000-000000000000")


@router.get(
        "/snippets",
        response_model=schemas.SnippetListResponse,
        response_description="List of snippets with user-specific display names if they exist.",
        status_code=status.HTTP_200_OK
        )
async def get_all_snippets(db: Session = Depends(get_db)):
    """Returns all snippets, with user-specific display names if they exist."""
    snippets = (
        db.query(models.Snippet)
        .options(joinedload(models.Snippet.preferences))
        .all()
    )

    response_snippets = []
    for snippet in snippets:
        display_name = snippet.default_display_name
        for pref in snippet.preferences:
            if pref.user_id == SYSTEM_USER_ID:
                display_name = pref.custom_display_name or display_name
                break
        response_snippets.append(
            schemas.SnippetResponse(
                **snippet.__dict__,
                display_name=display_name,
            )
        )

    return schemas.SnippetListResponse(snippets=response_snippets)


@router.get(
        "/snippets/{snippet_id}",
        response_model=schemas.SnippetResponse,
        response_description="Snippet details with user-specific display name if it exists.",
        status_code=status.HTTP_200_OK
        )
async def get_snippet(snippet_id: UUID, db: Session = Depends(get_db)):
    """Returns a single snippet by its ID."""
    snippet = (
        db.query(models.Snippet)
        .options(joinedload(models.Snippet.preferences))
        .filter(models.Snippet.id == snippet_id)
        .first()
    )

    if not snippet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Snippet not found")

    display_name = snippet.default_display_name
    for pref in snippet.preferences:
        if pref.user_id == SYSTEM_USER_ID:
            display_name = pref.custom_display_name or display_name
            break

    return schemas.SnippetResponse(
        **snippet.__dict__,
        display_name=display_name,
    )

@router.post(
        "/snippets",
        response_model=schemas.SnippetResponse,
        response_description="Created snippet with user-specific display name.",
        status_code=status.HTTP_201_CREATED
        )
async def create_snippet(snippet_data: schemas.SnippetCreate, db: Session = Depends(get_db)):
    """(Admin) Creates a new snippet."""
    new_snippet = models.Snippet(**snippet_data.model_dump())
    db.add(new_snippet)
    db.commit()
    db.refresh(new_snippet)

    return schemas.SnippetResponse(
        **new_snippet.__dict__,
        display_name=new_snippet.default_display_name,
    )


@router.put(
        "/snippets/{snippet_id}",
        response_model=schemas.SnippetResponse,
        response_description="Updated snippet with user-specific display name.",
        status_code=status.HTTP_200_OK
        )
async def update_snippet(
    snippet_id: UUID, snippet_data: schemas.SnippetUpdate, db: Session = Depends(get_db)
):
    """(Admin) Updates an existing snippet."""
    snippet = db.query(models.Snippet).filter(models.Snippet.id == snippet_id).first()

    if not snippet:
        raise HTTPException(status_code=404, detail="Snippet not found")

    for key, value in snippet_data.model_dump().items():
        setattr(snippet, key, value)

    db.commit()
    db.refresh(snippet)

    return schemas.SnippetResponse(
        **snippet.__dict__,
        display_name=snippet.default_display_name,  # Assuming preferences aren't updated here.
    )

@router.delete(
    "/snippets/{snippet_id}",
    response_description="Deleted snippet.",
    status_code=status.HTTP_204_NO_CONTENT
)
async def delete_snippet(snippet_id: UUID, db: Session = Depends(get_db)):
    """(Admin) Deletes a snippet."""
    snippet = db.query(models.Snippet).filter(models.Snippet.id == snippet_id).first()

    if not snippet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Snippet not found")

    db.delete(snippet)
    db.commit()

    return {"message": "Snippet deleted successfully"}
