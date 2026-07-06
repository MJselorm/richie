from fastapi import APIRouter, Depends, Header, HTTPException

from database import create_authenticated_client, supabase
from models import ProfileUpdateRequest

router = APIRouter(prefix="/profile", tags=["Profile"])


def get_access_token(authorization: str | None = Header(default=None)) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    return token


def get_current_user(access_token: str = Depends(get_access_token)):
    try:
        response = supabase.auth.get_user(access_token)
        if not response or not response.user:
            raise HTTPException(status_code=401, detail="Invalid access token")
        return response.user
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid access token")


@router.get("/me")
def get_my_profile(
    access_token: str = Depends(get_access_token),
    current_user=Depends(get_current_user),
):
    try:
        client = create_authenticated_client(access_token)
        response = (
            client.table("profiles")
            .select("*")
            .eq("id", current_user.id)
            .single()
            .execute()
        )
        return response.data
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Profile not found: {e}")


@router.patch("/me")
def update_my_profile(
    payload: ProfileUpdateRequest,
    access_token: str = Depends(get_access_token),
    current_user=Depends(get_current_user),
):
    payload_data = (
        payload.model_dump()
        if hasattr(payload, "model_dump")
        else payload.dict()
    )
    updates = {
        key: value
        for key, value in payload_data.items()
        if value is not None
    }

    if not updates:
        raise HTTPException(status_code=400, detail="No profile changes provided")

    try:
        client = create_authenticated_client(access_token)
        response = (
            client.table("profiles")
            .update(updates)
            .eq("id", current_user.id)
            .execute()
        )

        if not response.data:
            raise HTTPException(status_code=404, detail="Profile not found")

        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Profile update failed: {e}")
