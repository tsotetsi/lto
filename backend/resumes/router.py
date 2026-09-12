from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from sqlalchemy import select

from database import get_db
from auth.dependencies import get_current_user, get_optional_user
from auth.models import User
from . import models, schemas

router = APIRouter()


@router.get(
    "/snippets",
    response_model=schemas.SnippetListResponse,
    response_description="List of snippets with user-specific display names if they exist.",
    status_code=status.HTTP_200_OK,
)
async def get_all_snippets(
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    """Returns all snippets (system + user's own), with user-specific display names."""
    user_id = current_user.id if current_user else None

    query = select(models.Snippet).options(
        joinedload(models.Snippet.preferences),
        joinedload(models.Snippet.owner),
    )

    # If authenticated, show system snippets + user's own snippets
    if user_id:
        query = query.where(
            (models.Snippet.user_id.is_(None)) | (models.Snippet.user_id == user_id)
        )
    else:
        # Unauthenticated users see only system snippets
        query = query.where(models.Snippet.user_id.is_(None))

    result = await db.execute(query)
    snippets = result.unique().scalars().all()

    response_snippets = []
    for snippet in snippets:
        display_name = snippet.default_display_name
        if user_id:
            for pref in snippet.preferences:
                if pref.user_id == user_id:
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
    status_code=status.HTTP_200_OK,
)
async def get_snippet(
    snippet_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    """Returns a single snippet by its ID."""
    result = await db.execute(
        select(models.Snippet)
        .options(joinedload(models.Snippet.preferences))
        .where(models.Snippet.id == snippet_id)
    )
    snippet = result.unique().scalar_one_or_none()

    if not snippet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Snippet not found")

    user_id = current_user.id if current_user else None
    display_name = snippet.default_display_name
    if user_id:
        for pref in snippet.preferences:
            if pref.user_id == user_id:
                display_name = pref.custom_display_name or display_name
                break

    return schemas.SnippetResponse(
        **snippet.__dict__,
        display_name=display_name,
    )


@router.post(
    "/snippets",
    response_model=schemas.SnippetResponse,
    response_description="Created snippet owned by the authenticated user.",
    status_code=status.HTTP_201_CREATED,
)
async def create_snippet(
    snippet_data: schemas.SnippetCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Creates a new user-defined snippet linked to the authenticated user."""
    new_snippet = models.Snippet(
        **snippet_data.model_dump(),
        user_id=current_user.id,
        is_user_defined=True,
    )
    db.add(new_snippet)
    await db.commit()
    await db.refresh(new_snippet)

    return schemas.SnippetResponse(
        **new_snippet.__dict__,
        display_name=new_snippet.default_display_name,
    )


@router.put(
    "/snippets/{snippet_id}",
    response_model=schemas.SnippetResponse,
    response_description="Updated snippet with user-specific display name.",
    status_code=status.HTTP_200_OK,
)
async def update_snippet(
    snippet_id: UUID,
    snippet_data: schemas.SnippetUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Updates a user's own snippet. System snippets cannot be updated by regular users."""
    result = await db.execute(
        select(models.Snippet)
        .options(joinedload(models.Snippet.owner))
        .where(models.Snippet.id == snippet_id)
    )
    snippet = result.unique().scalar_one_or_none()

    if not snippet:
        raise HTTPException(status_code=404, detail="Snippet not found")

    # Only allow update if user owns the snippet or is admin
    if snippet.user_id is not None and snippet.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own snippets",
        )
    if snippet.user_id is None and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="System snippets are read-only",
        )

    for key, value in snippet_data.model_dump().items():
        setattr(snippet, key, value)

    await db.commit()
    await db.refresh(snippet)

    return schemas.SnippetResponse(
        **snippet.__dict__,
        display_name=snippet.default_display_name,
    )


@router.delete(
    "/snippets/{snippet_id}",
    response_description="Deleted snippet.",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_snippet(
    snippet_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Deletes a user's own snippet. System snippets cannot be deleted by regular users."""
    result = await db.execute(
        select(models.Snippet)
        .options(joinedload(models.Snippet.owner))
        .where(models.Snippet.id == snippet_id)
    )
    snippet = result.unique().scalar_one_or_none()

    if not snippet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Snippet not found")

    # Only allow delete if user owns the snippet or is admin
    if snippet.user_id is not None and snippet.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own snippets",
        )
    if snippet.user_id is None and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="System snippets cannot be deleted",
        )

    await db.delete(snippet)
    await db.commit()

    return {"message": "Snippet deleted successfully"}
