"""Models for exam attempts (student progress)."""

from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


class AttemptRecord(SQLModel, table=True):
    """A row in the attempt table."""

    __tablename__ = "attempt"

    id: int | None = Field(default=None, primary_key=True)
    student_id: str = Field(index=True)
    task_id: int = Field(foreign_key="task.id")
    user_answer: str
    is_correct: bool
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None)
    )


class AttemptCreate(SQLModel):
    student_id: str
    task_id: int
    user_answer: str


class AttemptRead(SQLModel):
    id: int
    student_id: str
    task_id: int
    user_answer: str
    is_correct: bool
    created_at: datetime


class ProgressRead(SQLModel):
    student_id: str
    total_attempts: int
    correct_count: int
    wrong_count: int
    accuracy: float  # 0.0–1.0
    topics_attempted: list[int]
    topics_solved: list[int]
