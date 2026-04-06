"""Task endpoints."""

import random

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from exam_prep.database import get_session
from exam_prep.models.task import TaskRead, TaskRecord

router = APIRouter()


@router.get("/", response_model=list[TaskRead])
def list_tasks(
    *,
    topic_id: int | None = None,
    session: Session = Depends(get_session),
):
    """List tasks, optionally filtered by topic_id."""
    stmt = select(TaskRecord)
    if topic_id is not None:
        stmt = stmt.where(TaskRecord.topic_id == topic_id)
    tasks = session.exec(stmt).all()
    return [
        TaskRead(
            id=t.id,
            topic_id=t.topic_id,
            question=t.question,
            answer=t.answer,
            explanation=t.explanation,
            difficulty=t.difficulty,
        )
        for t in tasks
    ]


@router.get("/random", response_model=TaskRead)
def get_random_task(
    *,
    topic_id: int | None = None,
    session: Session = Depends(get_session),
):
    """Get a random task, optionally filtered by topic_id."""
    stmt = select(TaskRecord)
    if topic_id is not None:
        stmt = stmt.where(TaskRecord.topic_id == topic_id)
    tasks = session.exec(stmt).all()
    if not tasks:
        raise HTTPException(status_code=404, detail="No tasks found")
    t = random.choice(tasks)
    return TaskRead(
        id=t.id,
        topic_id=t.topic_id,
        question=t.question,
        answer=t.answer,
        explanation=t.explanation,
        difficulty=t.difficulty,
    )
