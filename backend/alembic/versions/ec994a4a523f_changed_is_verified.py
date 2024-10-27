"""changed is_verified

Revision ID: ec994a4a523f
Revises: f3c0b75cc6c8
Create Date: 2024-10-21 05:44:49.692155

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ec994a4a523f'
down_revision: Union[str, None] = 'f3c0b75cc6c8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.alter_column('twitter_accounts', 'is_verified',
               existing_type=sa.BOOLEAN(),
               type_=sa.String(),
               existing_nullable=True)
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.alter_column('twitter_accounts', 'is_verified',
               existing_type=sa.String(),
               type_=sa.BOOLEAN(),
               existing_nullable=True)
    # ### end Alembic commands ###
