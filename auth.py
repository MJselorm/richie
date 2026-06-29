from fastapi import APIRouter, HTTPException, Header

from database import supabase
from models import SignUpRequest, SignInRequest

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _extract_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")

    parts = authorization.split(" ", 1)
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1].strip()

    return authorization.strip()


@router.post("/signup")
def signup(data: SignUpRequest):

    try:
        response = supabase.auth.admin.create_user(
            {
                "email": data.email,
                "password": data.password,
                "email_confirm": True,
            }
        )

        return {
            "message": "User created successfully",
            "user_id": response.user.id,
            "email": response.user.email,
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/signin")
def signin(data: SignInRequest):

    try:
        response = supabase.auth.sign_in_with_password(
            {
                "email": data.email,
                "password": data.password,
            }
        )

        return {
            "access_token": response.session.access_token,
            "refresh_token": response.session.refresh_token,
            "user": response.user,
        }

    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.get("/profile")
def get_profile(authorization: str | None = Header(default=None)):

    token = _extract_token(authorization)

    # Verify the access token and resolve the authenticated user.
    try:
        user_response = supabase.auth.get_user(token)
        user = user_response.user
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    # Fetch the matching row from the profiles table.
    try:
        result = (
            supabase.table("profiles")
            .select("*")
            .eq("id", user.id)
            .limit(1)
            .execute()
        )
        profile = result.data[0] if result.data else None
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "user_id": user.id,
        "email": user.email,
        "profile": profile,
    }
