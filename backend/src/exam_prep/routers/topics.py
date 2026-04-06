"""Topic endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from exam_prep.database import get_session
from exam_prep.models.topic import TopicRead, TopicRecord

router = APIRouter()


@router.get("/", response_model=list[TopicRead])
def list_topics(*, session: Session = Depends(get_session)):
    """List all available topics."""
    topics = session.exec(select(TopicRecord)).all()
    return [
        TopicRead(id=t.id, slug=t.slug, title=t.title, description=t.description)
        for t in topics
    ]


@router.get("/{topic_slug}", response_model=TopicRead)
def get_topic(
    *,
    topic_slug: str,
    session: Session = Depends(get_session),
):
    """Get a single topic by slug."""
    topic = session.exec(
        select(TopicRecord).where(TopicRecord.slug == topic_slug)
    ).first()
    if topic is None:
        raise HTTPException(status_code=404, detail="Topic not found")
    return TopicRead(
        id=topic.id, slug=topic.slug, title=topic.title, description=topic.description
    )
