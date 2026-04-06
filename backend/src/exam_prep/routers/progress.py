"""Progress endpoints: submit answer, exam mode, progress stats."""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, col, func, select

from exam_prep.database import get_session
from exam_prep.models.attempt import AttemptCreate, AttemptRead, AttemptRecord, ProgressRead
from exam_prep.models.task import TaskRecord
from exam_prep.models.topic import TopicRecord

router = APIRouter()


@router.post("/submit", response_model=AttemptRead)
def submit_answer(
    *,
    body: AttemptCreate,
    session: Session = Depends(get_session),
):
    """Submit an answer for a task. Records the attempt and returns whether it was correct."""
    task = session.exec(select(TaskRecord).where(TaskRecord.id == body.task_id)).first()
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    is_correct = task.answer.strip().lower() == body.user_answer.strip().lower()
    attempt = AttemptRecord(
        student_id=body.student_id,
        task_id=body.task_id,
        user_answer=body.user_answer,
        is_correct=is_correct,
    )
    session.add(attempt)
    session.commit()
    session.refresh(attempt)
    return AttemptRead(
        id=attempt.id,
        student_id=attempt.student_id,
        task_id=attempt.task_id,
        user_answer=attempt.user_answer,
        is_correct=attempt.is_correct,
        created_at=attempt.created_at,
    )


@router.get("/progress/{student_id}", response_model=ProgressRead)
def get_progress(
    *,
    student_id: str,
    session: Session = Depends(get_session),
):
    """Get progress stats for a student."""
    attempts = session.exec(
        select(AttemptRecord).where(AttemptRecord.student_id == student_id)
    ).all()

    total = len(attempts)
    correct = sum(1 for a in attempts if a.is_correct)
    wrong = total - correct
    accuracy = correct / total if total > 0 else 0.0

    topics_attempted = list({a.task_id for a in attempts})
    topics_solved = list({a.task_id for a in attempts if a.is_correct})

    return ProgressRead(
        student_id=student_id,
        total_attempts=total,
        correct_count=correct,
        wrong_count=wrong,
        accuracy=round(accuracy, 2),
        topics_attempted=topics_attempted,
        topics_solved=topics_solved,
    )


class ExamModeRead(ProgressRead):
    tasks: list[dict]


@router.post("/exam-mode", response_model=ExamModeRead)
def start_exam_mode(
    *,
    student_id: str,
    num_tasks: int = 5,
    session: Session = Depends(get_session),
):
    """Start exam mode: pick N random tasks from all topics. Returns tasks without answers."""
    import random

    all_tasks = session.exec(select(TaskRecord)).all()
    if not all_tasks:
        raise HTTPException(status_code=404, detail="No tasks available")

    selected = random.sample(all_tasks, min(num_tasks, len(all_tasks)))
    tasks = [
        {
            "id": t.id,
            "topic_id": t.topic_id,
            "question": t.question,
            "difficulty": t.difficulty,
        }
        for t in selected
    ]

    # Reuse ProgressRead fields (temporary, will be filled as student answers)
    attempts = session.exec(
        select(AttemptRecord).where(AttemptRecord.student_id == student_id)
    ).all()
    total = len(attempts)
    correct = sum(1 for a in attempts if a.is_correct)
    wrong = total - correct
    accuracy = correct / total if total > 0 else 0.0
    topics_attempted = list({a.task_id for a in attempts})
    topics_solved = list({a.task_id for a in attempts if a.is_correct})

    return ExamModeRead(
        student_id=student_id,
        total_attempts=total,
        correct_count=correct,
        wrong_count=wrong,
        accuracy=round(accuracy, 2),
        topics_attempted=topics_attempted,
        topics_solved=topics_solved,
        tasks=tasks,
    )
