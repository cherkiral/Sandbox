from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '17a7bd85149e'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('username', sa.String(), unique=True, nullable=False),
        sa.Column('email', sa.String(), unique=True, nullable=False),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('max_users', sa.Integer(), nullable=False, server_default="20"),
    )

    # Create twitter_accounts table
    op.create_table(
        'twitter_accounts',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE')),
        sa.Column('twitter_token', sa.String(), nullable=False),
        sa.Column('sandbox_login', sa.String(), nullable=False),
        sa.Column('sandbox_password', sa.String(), nullable=False),
        sa.Column('session_data', sa.LargeBinary(), nullable=True),
        sa.Column('ep_count', sa.Integer(), default=0),
        sa.Column('is_verified', sa.Boolean(), default=False),
        sa.Column('owns_alphapass', sa.Boolean(), default=False),
        sa.Column('account_number', sa.Integer(), nullable=True),
        sa.Column('proxy', sa.String(), nullable=True),
    )
