from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi_jwt_auth import AuthJWT
from pydantic import BaseModel
from datetime import timedelta
import logging
import time
from sqlalchemy.exc import OperationalError
from app.database import engine

# Set up logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')


class Settings(BaseModel):
    authjwt_secret_key: str = "blablagomosekivpered"
    authjwt_access_token_expires: timedelta = timedelta(days=7)


@AuthJWT.load_config
def get_config():
    return Settings()


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Only frontend origin
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

# Include user-related routes
from app.users.routes import router as users_router
from app.twitter.routes import router as twitter_router

app.include_router(users_router, prefix="/api", tags=["users"])
app.include_router(twitter_router, prefix="/accounts", tags=["Accounts"])


# Function to wait for database connection
def wait_for_db_connection():
    while True:
        try:
            with engine.connect() as conn:
                logging.info("Database connection established.")
                break
        except OperationalError:
            logging.warning("Database not ready, retrying in 5 seconds...")
            time.sleep(5)


# Call the function at startup
wait_for_db_connection()

