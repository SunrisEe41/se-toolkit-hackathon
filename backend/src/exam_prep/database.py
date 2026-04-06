"""Database connection for exam prep (reuses LMS backend settings)."""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlmodel import Session

# Reuse the same settings as LMS backend — they point to the same Postgres.
from lms_backend.settings import settings


def get_database_url() -> str:
    return (
        f"postgresql+psycopg2://{settings.db_user}:{settings.db_password}"
        f"@{settings.db_host}:{settings.db_port}/{settings.db_name}"
    )


engine: Engine = create_engine(get_database_url())


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
