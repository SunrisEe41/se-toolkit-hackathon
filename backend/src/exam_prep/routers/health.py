"""Health endpoint for exam prep."""

from fastapi import APIRouter, Depends
from sqlmodel import Session, col, select

from exam_prep.database import get_session
from exam_prep.models.task import TaskRecord
from exam_prep.models.theory import TheoryRecord
from exam_prep.models.topic import TopicRecord

router = APIRouter()


@router.get("/")
def health(*, session: Session = Depends(get_session)):
    """Exam prep health check with counts."""
    topic_count = session.exec(select(col(TopicRecord.id))).all()
    task_count = session.exec(select(col(TaskRecord.id))).all()
    theory_count = session.exec(select(col(TheoryRecord.id))).all()
    return {
        "status": "ok",
        "topics": len(topic_count),
        "tasks": len(task_count),
        "theory_pages": len(theory_count),
    }
