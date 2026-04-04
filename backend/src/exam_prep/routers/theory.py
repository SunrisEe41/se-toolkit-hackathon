"""Theory endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from exam_prep.database import get_session
from exam_prep.models.theory import TheoryRead, TheoryRecord

router = APIRouter()


@router.get("/", response_model=list[TheoryRead])
async def list_theory(
    *,
    topic_id: int | None = None,
    session: Session = Depends(get_session),
):
    """List theory pages, optionally filtered by topic_id."""
    stmt = select(TheoryRecord)
    if topic_id is not None:
        stmt = stmt.where(TheoryRecord.topic_id == topic_id)
    items = session.exec(stmt).all()
    return [
        TheoryRead(id=t.id, topic_id=t.topic_id, title=t.title, content=t.content)
        for t in items
    ]


@router.get("/{topic_slug}", response_model=list[TheoryRead])
async def get_theory_by_topic(
    *,
    topic_slug: str,
    session: Session = Depends(get_session),
):
    """Get theory pages for a specific topic (by slug)."""
    from exam_prep.models.topic import TopicRecord

    topic = session.exec(
        select(TopicRecord).where(TopicRecord.slug == topic_slug)
    ).first()
    if topic is None:
        raise HTTPException(status_code=404, detail="Topic not found")
    items = session.exec(
        select(TheoryRecord).where(TheoryRecord.topic_id == topic.id)
    ).all()
    return [
        TheoryRead(id=t.id, topic_id=t.topic_id, title=t.title, content=t.content)
        for t in items
    ]
