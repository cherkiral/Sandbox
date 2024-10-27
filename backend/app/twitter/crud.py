import json
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.twitter import models, schemas


def create_twitter_account(db: Session, twitter_account: schemas.TwitterAccountCreate, user_id: int):
    db_twitter_account = models.TwitterAccount(**twitter_account.dict(), user_id=user_id)
    db.add(db_twitter_account)
    db.commit()
    db.refresh(db_twitter_account)
    return db_twitter_account


def get_twitter_accounts(db: Session, user_id: int):
    return db.query(models.TwitterAccount).filter(models.TwitterAccount.user_id == user_id).order_by(
        models.TwitterAccount.account_number).all()


def update_twitter_account(db: Session, account_id: int, twitter_account: schemas.TwitterAccountUpdate, user_id: int):
    db_twitter_account = db.query(models.TwitterAccount).filter(models.TwitterAccount.id == account_id,
                                                                models.TwitterAccount.user_id == user_id).first()
    if db_twitter_account:
        for key, value in twitter_account.dict().items():
            setattr(db_twitter_account, key, value)
        db.commit()
        db.refresh(db_twitter_account)
    return db_twitter_account


def delete_twitter_account(db: Session, account_id: int, user_id: int):
    db_twitter_account = db.query(models.TwitterAccount).filter(models.TwitterAccount.id == account_id,
                                                                models.TwitterAccount.user_id == user_id).first()
    if db_twitter_account:
        db.delete(db_twitter_account)
        db.commit()
    return db_twitter_account


def update_sandbox_session(db: Session, account_id: int, session_data: dict):
    try:
        session_data_str = json.dumps(session_data)
        encoded_session_data = session_data_str.encode('utf-8')

        db.query(models.TwitterAccount).filter(models.TwitterAccount.id == account_id).update(
            {"session_data": encoded_session_data}
        )
        db.commit()
    except Exception as e:
        print(f"Failed to save session data: {e}")
        raise HTTPException(status_code=500, detail="Failed to save session data")


def get_twitter_account_by_id(db: Session, account_id: int):
    return db.query(models.TwitterAccount).filter(models.TwitterAccount.id == account_id).first()


def clear_all_sessions(db: Session):
    try:
        db.query(models.TwitterAccount).update({"session_data": None})
        db.commit()
        return {"message": "All sessions cleared successfully"}
    except Exception as e:
        print(f"Failed to clear sessions: {e}")
        return {"message": "Failed to clear sessions"}, 500


def get_account_proxy(db: Session, account_id: int):
    # Fetch account from DB
    account = db.query(models.TwitterAccount).filter(models.TwitterAccount.id == account_id).first()
    return account.proxy if account else None
