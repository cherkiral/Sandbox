import json
import requests
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.twitter import crud, schemas
from app.dependencies import get_current_user
from app.database import get_db
from app.users.models import User
from app.twitter.models import TwitterAccount
from app.twitter.crud import update_sandbox_session
from app.twitter.rabbitmq_producer import add_sandbox_confirm_to_queue
from app.twitter.schemas import TweetRequest
from app.twitter.services import create_tweet, login_to_sandbox, send_confirm_request, check_confirm_status, get_user_verification, \
    get_total_ep, get_alphapass_ownership, get_proxy_for_account

router = APIRouter()


@router.post("/", response_model=schemas.TwitterAccount)
def create_twitter_account(twitter_account: schemas.TwitterAccountCreate, db: Session = Depends(get_db),
                           current_user: User = Depends(get_current_user)):
    return crud.create_twitter_account(db=db, twitter_account=twitter_account, user_id=current_user.id)


@router.get("/", response_model=list[schemas.TwitterAccount])
def read_twitter_accounts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return crud.get_twitter_accounts(db=db, user_id=current_user.id)


@router.put("/{account_id}", response_model=schemas.TwitterAccount)
def update_twitter_account(account_id: int, twitter_account: schemas.TwitterAccountUpdate,
                           db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_twitter_account = crud.update_twitter_account(db=db, account_id=account_id, twitter_account=twitter_account,
                                                     user_id=current_user.id)
    if not db_twitter_account:
        raise HTTPException(status_code=404, detail="Twitter account not found")
    return db_twitter_account


@router.delete("/{account_id}", response_model=schemas.TwitterAccount)
def delete_twitter_account(account_id: int, db: Session = Depends(get_db),
                           current_user: User = Depends(get_current_user)):
    db_twitter_account = crud.delete_twitter_account(db=db, account_id=account_id, user_id=current_user.id)
    if not db_twitter_account:
        raise HTTPException(status_code=404, detail="Twitter account not found")
    return db_twitter_account


@router.post("/tweet")
def post_tweet(request: TweetRequest, db: Session = Depends(get_db), current_user: int = Depends(get_current_user)):
    twitter_account = db.query(TwitterAccount).filter(
        TwitterAccount.user_id == current_user.id,
        TwitterAccount.twitter_token == request.twitter_token
    ).first()

    if not twitter_account:
        raise HTTPException(status_code=404, detail="Twitter account not found")

    try:
        tweet_response = create_tweet(request.twitter_token, request.text, proxy=get_proxy_for_account(db, twitter_account.id))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to post tweet: {str(e)}")

    return {"message": "Tweet posted successfully", "tweet_response": tweet_response}


def login_and_save_session(sandbox_account, db, account_id):
    session = login_to_sandbox(sandbox_account.sandbox_login, sandbox_account.sandbox_password, db, account_id, proxy=get_proxy_for_account(db, account_id))
    if session:
        session_cookies = session.cookies.get_dict()
        try:
            update_sandbox_session(db, account_id, session_cookies)
            print(f"Session cookies saved: {session_cookies}")
        except Exception as e:
            print(f"Failed to save session data: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to save session data: {str(e)}")
    return session


def get_sandbox_session(sandbox_account, db, account_id):
    session = requests.Session()

    if sandbox_account.session_data:
        try:
            session_data = json.loads(sandbox_account.session_data.decode('utf-8'))
            if not isinstance(session_data, dict):
                raise ValueError("Session data is not a valid dictionary")

            for key, value in session_data.items():
                session.cookies.set(key, value)
            print(f"Session cookies successfully set: {session.cookies}")

        except (ValueError, json.JSONDecodeError) as e:
            print(f"Error while decoding session data: {e}")
            raise HTTPException(status_code=500, detail=f"Invalid session data: {str(e)}")
    else:
        session = login_and_save_session(sandbox_account, db, account_id)

    return session


@router.post("/sandbox/confirm/{account_id}")
def send_sandbox_confirm_request(account_id: int, db: Session = Depends(get_db), current_user: int = Depends(get_current_user)):
    sandbox_account = db.query(TwitterAccount).filter(TwitterAccount.id == account_id, TwitterAccount.user_id == current_user.id).first()

    if not sandbox_account:
        raise HTTPException(status_code=404, detail="Sandbox account not found")

    session = get_sandbox_session(sandbox_account, db, sandbox_account.id)

    try:
        challenge_id = send_confirm_request(session, proxy=get_proxy_for_account(db, sandbox_account.id))
        if challenge_id:
            add_sandbox_confirm_to_queue(session.cookies.get_dict(), challenge_id)
        else:
            raise HTTPException(status_code=400, detail="Challenge already completed or failed")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to queue Sandbox confirmation: {str(e)}")

    return {"message": "Sandbox confirm request queued successfully", "challenge_id": challenge_id}


@router.get("/sandbox/status/{challenge_id}")
def get_sandbox_status(challenge_id: str, twitter_token: str, db: Session = Depends(get_db),
                       current_user: int = Depends(get_current_user)):
    sandbox_account = db.query(TwitterAccount).filter(
        TwitterAccount.user_id == current_user.id,
        TwitterAccount.twitter_token == twitter_token
    ).first()

    if not sandbox_account:
        raise HTTPException(status_code=404, detail="Sandbox account not found")

    session = get_sandbox_session(sandbox_account, db, sandbox_account.id)

    try:
        status = check_confirm_status(session, challenge_id, proxy=get_proxy_for_account(db, sandbox_account.id))
        return {"status": status}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking status: {str(e)}")


@router.get("/{account_id}/ep")
def fetch_ep(account_id: int, db: Session = Depends(get_db), current_user: int = Depends(get_current_user)):
    sandbox_account = db.query(TwitterAccount).filter(TwitterAccount.id == account_id,
                                                      TwitterAccount.user_id == current_user.id).first()

    if not sandbox_account:
        raise HTTPException(status_code=404, detail="Sandbox account not found")

    session = get_sandbox_session(sandbox_account, db, account_id)

    ep = get_total_ep(session, proxy=get_proxy_for_account(db, account_id))

    # Update the EP count in the database
    sandbox_account.ep_count = ep
    db.commit()  # Save the updated EP count

    return {"ep": ep}


@router.get("/{account_id}/verification")
def fetch_verification_status(account_id: int, db: Session = Depends(get_db),
                              current_user: int = Depends(get_current_user)):
    sandbox_account = db.query(TwitterAccount).filter(TwitterAccount.id == account_id,
                                                      TwitterAccount.user_id == current_user.id).first()

    if not sandbox_account:
        raise HTTPException(status_code=404, detail="Sandbox account not found")

    session = get_sandbox_session(sandbox_account, db, account_id)

    verification_status = get_user_verification(session, proxy=get_proxy_for_account(db, account_id))

    # Update the verification status in the database
    sandbox_account.is_verified = verification_status
    db.commit()  # Save the updated verification status

    return {"verification_status": verification_status}

@router.get("/{account_id}/alphapass")
def fetch_alphapass_ownership(account_id: int, db: Session = Depends(get_db),
                              current_user: int = Depends(get_current_user)):
    sandbox_account = db.query(TwitterAccount).filter(TwitterAccount.id == account_id,
                                                      TwitterAccount.user_id == current_user.id).first()

    if not sandbox_account:
        raise HTTPException(status_code=404, detail="Sandbox account not found")

    session = get_sandbox_session(sandbox_account, db, account_id)

    owns_alphapass = get_alphapass_ownership(session, proxy=get_proxy_for_account(db, account_id))

    # Update the verification status in the database
    sandbox_account.owns_alphapass = owns_alphapass
    db.commit()  # Save the updated verification status

    return {"owns_alphapass": owns_alphapass}


@router.delete("/sessions/clear")
def clear_sessions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):

    result = crud.clear_all_sessions(db)
    return result


@router.post("/bulk-add")
def bulk_add_accounts(file: UploadFile = File(...), db: Session = Depends(get_db),
                      current_user: int = Depends(get_current_user)):
    try:
        content = file.file.read().decode('utf-8')
        accounts = content.splitlines()

        for account in accounts:
            account_number, token, login, password, proxy = account.split(";")
            crud.create_twitter_account(db=db, twitter_account=schemas.TwitterAccountCreate(
                twitter_token=token, sandbox_login=login, sandbox_password=password, account_number=account_number,
                proxy=proxy
            ), user_id=current_user.id)

        return {"message": "Accounts added successfully."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to add accounts: {str(e)}")
