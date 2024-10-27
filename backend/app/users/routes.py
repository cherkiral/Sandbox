from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi_jwt_auth import AuthJWT
from fastapi_jwt_auth.exceptions import AuthJWTException
from passlib.context import CryptContext
from app.users import crud, schemas
from app.database import get_db

router = APIRouter()


@router.post('/register', response_model=schemas.UserRead)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    return crud.create_user(db, user)


@router.post('/login', response_model=schemas.Token)
def login_for_access_token(user: schemas.UserLogin, db: Session = Depends(get_db), Authorize: AuthJWT = Depends()):
    user = crud.authenticate_user(db, username=user.username, password=user.password)
    if not user:
        raise HTTPException(
            status_code=401, detail="Invalid username or password", headers={"WWW-Authenticate": "Bearer"}
        )

    access_token = Authorize.create_access_token(subject=user.username)
    refresh_token = Authorize.create_refresh_token(subject=user.username)
    return {"access_token": access_token, "refresh_token": refresh_token}


@router.get("/protected", response_model=schemas.UserRead)
def protected(Authorize: AuthJWT = Depends(), db: Session = Depends(get_db)):
    try:
        Authorize.jwt_required()
    except AuthJWTException:
        raise HTTPException(status_code=401, detail="Invalid token")

    current_user = Authorize.get_jwt_subject()
    user = crud.get_user_by_username(db, username=current_user)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user
