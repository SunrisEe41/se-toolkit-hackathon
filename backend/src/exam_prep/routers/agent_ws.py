"""Simple chat agent endpoint via HTTP POST."""

import json
import logging

import httpx
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from lms_backend.auth import verify_api_key
from lms_backend.settings import settings

logger = logging.getLogger(__name__)

router = APIRouter()

_sessions: dict[str, list[dict]] = {}

SYSTEM_PROMPT = """You are an exam prep assistant for analytical geometry and linear algebra.
Help students practice by giving problems, checking answers, and explaining concepts.
Be concise but thorough. Use formatting (bold, lists) for readability.
When the user asks for a problem, give them a practice problem and wait for their answer.
When they answer, tell them if it's correct and explain why.
If you don't know something, say so honestly."""


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str


@router.post("/chat", response_model=ChatResponse)
async def chat_post(
    req: ChatRequest,
    _key: str = Depends(verify_api_key),
):
    """Chat with the exam prep agent. Send a message, get a reply."""
    session_id = "web-default"
    if session_id not in _sessions:
        _sessions[session_id] = []

    history = _sessions[session_id]
    history.append({"role": "user", "content": req.message})

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        *history[-20:],  # keep last 20 messages
    ]

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            f"http://localhost:42005/v1/chat/completions",
            json={
                "model": "coder-model",
                "messages": messages,
                "stream": False,
                "max_tokens": 2048,
            },
            headers={"Authorization": f"Bearer {settings.api_key}"},
        )
        resp.raise_for_status()
        data = resp.json()

    reply = (
        data.get("choices", [{}])[0].get("message", {}).get("content", "No response.")
    )
    history.append({"role": "assistant", "content": reply})
    return ChatResponse(reply=reply)
