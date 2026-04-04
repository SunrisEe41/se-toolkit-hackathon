"""Models for theory pages."""

from sqlmodel import Field, SQLModel


class TheoryRecord(SQLModel, table=True):
    """A row in the theory table."""

    __tablename__ = "theory"

    id: int | None = Field(default=None, primary_key=True)
    topic_id: int = Field(foreign_key="topic.id")
    title: str
    content: str


class TheoryRead(SQLModel):
    """Public theory schema returned by the API."""

    id: int
    topic_id: int
    title: str
    content: str
