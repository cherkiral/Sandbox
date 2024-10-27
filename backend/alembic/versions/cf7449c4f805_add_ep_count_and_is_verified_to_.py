"""Add ep_count and is_verified to TwitterAccount

Revision ID: cf7449c4f805
Revises: 802c1f8abc1f
Create Date: 2024-10-21 05:41:02.437248

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cf7449c4f805'
down_revision: Union[str, None] = '802c1f8abc1f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('twitter_accounts', sa.Column('ep_count', sa.Integer(), nullable=True))
    op.add_column('twitter_accounts', sa.Column('is_verified', sa.Boolean(), nullable=True))
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('twitter_accounts', 'is_verified')
    op.drop_column('twitter_accounts', 'ep_count')
    # ### end Alembic commands ###
