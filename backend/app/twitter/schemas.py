from typing import Optional

from pydantic import BaseModel


class TwitterAccountBase(BaseModel):
    account_number: Optional[int] = 0
    twitter_token: str
    sandbox_login: str
    sandbox_password: str
    ep_count: Optional[int] = 0
    is_verified: Optional[str] = False
    owns_alphapass: Optional[bool] = False
    proxy: Optional[str]


class TwitterAccountCreate(TwitterAccountBase):
    pass


class TwitterAccountUpdate(TwitterAccountBase):
    pass


class TwitterAccount(TwitterAccountBase):
    id: int
    user_id: int

    class Config:
        orm_mode = True


class TweetRequest(BaseModel):
    twitter_token: str
    text: str

class SandboxConfirmationRequest(BaseModel):
    sandbox_login: str
    sandbox_password: str
