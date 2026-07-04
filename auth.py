from fastapi import APIRouter, HTTPException

from database import supabase
from models import SignUpRequest, SignInRequest

router = APIRouter(prefix="/auth", tags=["Authentication"])


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