"""Add owns_alphapass

Revision ID: f3c0b75cc6c8
Revises: cf7449c4f805
Create Date: 2024-10-21 05:41:42.380339

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f3c0b75cc6c8'
down_revision: Union[str, None] = 'cf7449c4f805'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('twitter_accounts', sa.Column('owns_alphapass', sa.Boolean(), nullable=True))
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('twitter_accounts', 'owns_alphapass')
    # ### end Alembic commands ###
