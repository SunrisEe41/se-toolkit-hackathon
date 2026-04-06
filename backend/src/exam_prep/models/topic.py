"""Models for exam topics."""

from sqlmodel import Field, SQLModel


class TopicRecord(SQLModel, table=True):
    """A row in the topic table."""

    __tablename__ = "topic"

    id: int | None = Field(default=None, primary_key=True)
    slug: str = Field(unique=True, index=True)
    title: str
    description: str = ""


class TopicRead(SQLModel):
    """Public topic schema returned by the API."""

    id: int
    slug: str
    title: str
    description: str
