from sqlalchemy import Column, Integer, String, ForeignKey, LargeBinary, Boolean
from sqlalchemy.orm import relationship
from app.database import Base

class TwitterAccount(Base):
    __tablename__ = "twitter_accounts"

    id = Column(Integer, primary_key=True, index=True)
    account_number = Column(Integer, nullable=True, default=0)
    twitter_token = Column(String, nullable=False, default="")
    sandbox_login = Column(String, nullable=False, default="")
    sandbox_password = Column(String, nullable=False, default="")
    session_data = Column(LargeBinary, nullable=True)
    ep_count = Column(Integer, default=0)
    is_verified = Column(String, default=False)
    owns_alphapass = Column(Boolean, default=False)
    proxy = Column(String, nullable=True)

    user_id = Column(Integer, ForeignKey('users.id'))
    user = relationship("User", back_populates="twitter_accounts")
