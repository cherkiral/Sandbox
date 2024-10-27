from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi_jwt_auth import AuthJWT
from fastapi_jwt_auth.exceptions import AuthJWTException
from app.users import crud
from app.database import get_db


def get_current_user(db: Session = Depends(get_db), Authorize: AuthJWT = Depends()):
    try:
        # Ensure the token is valid and required
        Authorize.jwt_required()
    except AuthJWTException:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Extract the subject (username) from the JWT token
    current_user = Authorize.get_jwt_subject()

    # Fetch the user from the database using the username from the token
    user = crud.get_user_by_username(db, username=current_user)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user
