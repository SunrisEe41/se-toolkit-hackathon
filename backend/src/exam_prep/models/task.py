"""Models for exam tasks."""

from sqlmodel import Field, SQLModel


class TaskRecord(SQLModel, table=True):
    """A row in the task table."""

    __tablename__ = "task"

    id: int | None = Field(default=None, primary_key=True)
    topic_id: int = Field(foreign_key="topic.id")
    question: str
    answer: str
    explanation: str = ""
    difficulty: str = "medium"


class TaskRead(SQLModel):
    """Public task schema returned by the API.

    Note: ``answer`` is intentionally included — the LLM agent
    (nanobot) receives it via MCP and compares the student's
    reply.  The API is protected by an API key so only the
    agent side can fetch it.
    """

    id: int
    topic_id: int
    question: str
    answer: str
    explanation: str
    difficulty: str
