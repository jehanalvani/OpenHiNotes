from fastapi import APIRouter, HTTPException, status, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.database import get_db
from app.schemas.user import UserResponse, UserUpdate
from app.models.user import User, UserRole
from app.dependencies import get_current_user, require_admin
import uuid

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserResponse])
async def list_users(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all users (admin only)."""
    result = await db.execute(select(User).offset(skip).limit(limit))
    users = result.scalars().all()
    return users


@router.get("/search", response_model=list[UserResponse])
async def search_users(
    q: str = Query("", min_length=0, max_length=100),
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Search users by email or display name. Available to all authenticated users (for sharing)."""
    query = select(User).where(User.is_active == True).limit(limit)  # noqa: E712
    if q:
        query = query.where(
            or_(
                User.email.ilike(f"%{q}%"),
                User.display_name.ilike(f"%{q}%"),
            )
        )
    # Exclude the current user from results
    query = query.where(User.id != current_user.id)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a user by ID."""
    # Users can only view their own profile unless they're admin
    if current_user.id != user_id and current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this user",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return user


@router.patch("/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: uuid.UUID,
    user_update: UserUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update user role (admin only)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if user_update.role:
        try:
            user.role = UserRole(user_update.role)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role. Must be one of: {', '.join([r.value for r in UserRole])}",
            )

    if user_update.display_name is not None:
        user.display_name = user_update.display_name

    await db.commit()
    await db.refresh(user)
    return user
