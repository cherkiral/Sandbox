"""Update session_data to LargeBinary

Revision ID: 802c1f8abc1f
Revises: 12bc798a468d
Create Date: 2024-10-21 03:52:29.059649

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '802c1f8abc1f'
down_revision: Union[str, None] = '12bc798a468d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Step 1: Convert the existing data to base64 string for safe migration
    op.execute("""
        UPDATE twitter_accounts
        SET session_data = encode(convert_to(session_data, 'UTF8'), 'base64')
        WHERE session_data IS NOT NULL;
    """)

    # Step 2: Alter the column to use BYTEA
    op.alter_column('twitter_accounts', 'session_data',
                    existing_type=sa.VARCHAR(),
                    type_=sa.LargeBinary(),
                    existing_nullable=True,
                    postgresql_using="decode(session_data, 'base64')")


def downgrade() -> None:
    # Step 1: Convert the binary data back to base64-encoded text
    op.execute("""
        UPDATE twitter_accounts
        SET session_data = encode(session_data, 'base64')
        WHERE session_data IS NOT NULL;
    """)

    # Step 2: Alter the column back to VARCHAR
    op.alter_column('twitter_accounts', 'session_data',
                    existing_type=sa.LargeBinary(),
                    type_=sa.VARCHAR(),
                    existing_nullable=True)
