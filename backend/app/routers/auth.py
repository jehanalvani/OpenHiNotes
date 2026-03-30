from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.user import UserCreate, LoginRequest, LoginResponse, UserResponse
from app.services.auth import AuthService
from app.models.user import User
from app.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_create: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    """Register a new user."""
    # Check if user already exists
    existing_user = await AuthService.get_user_by_email(db, user_create.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Create user
    user = await AuthService.create_user(
        db,
        email=user_create.email,
        password=user_create.password,
        display_name=user_create.display_name,
    )

    return user


@router.post("/login", response_model=LoginResponse)
async def login(
    login_request: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Login user and return JWT access token."""
    # Authenticate user
    user = await AuthService.authenticate_user(db, login_request.email, login_request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    # Create access token
    access_token = AuthService.create_access_token(user.id, user.email, user.role.value)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user,
    }


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
):
    """Get current user information."""
    return current_user
