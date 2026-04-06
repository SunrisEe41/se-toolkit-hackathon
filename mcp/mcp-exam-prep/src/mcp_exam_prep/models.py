"""Typed response models for the Exam Prep MCP server."""

from pydantic import BaseModel


class TopicResult(BaseModel):
    id: int
    slug: str
    title: str
    description: str


class TaskResult(BaseModel):
    id: int
    topic_id: int
    question: str
    answer: str
    explanation: str
    difficulty: str


class TheoryResult(BaseModel):
    id: int
    topic_id: int
    title: str
    content: str
