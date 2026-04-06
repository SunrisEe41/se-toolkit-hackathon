"""Simple chat agent endpoint for the web UI."""

import json
import logging

import httpx
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from lms_backend.settings import settings

logger = logging.getLogger(__name__)

router = APIRouter()

# In-memory conversation store
_sessions: dict[str, list[dict]] = {}

SYSTEM_PROMPT = """You are an exam prep assistant for analytical geometry and linear algebra.
Help students practice by giving problems, checking answers, and explaining concepts.
Be concise but thorough. Use formatting (bold, lists) for readability.
When the user asks for a problem, give them a practice problem and wait for their answer.
When they answer, tell them if it's correct and explain why.
If you don't know something, say so honestly."""


@router.websocket("/ws/agent")
async def agent_ws(websocket: WebSocket):
    """WebSocket endpoint for the web chat agent."""
    await websocket.accept()

    # Auth
    try:
        auth_msg = await websocket.receive_json()
        token = auth_msg.get("token", "")
    except Exception:
        await websocket.close(code=4001, reason="Auth failed")
        return

    if token != settings.exam_api_key and token != settings.api_key:
        await websocket.close(code=4001, reason="Invalid key")
        return

    session_id = f"web-{id(websocket)}"
    if session_id not in _sessions:
        _sessions[session_id] = []

    history = _sessions[session_id]
    await websocket.send_json({"type": "auth_ok"})

    while True:
        try:
            data = await websocket.receive_json()
            user_text = data.get("text", "")
            if not user_text:
                continue

            history.append({"role": "user", "content": user_text})

            # Call LLM
            messages = [
                {"role": "system", "content": SYSTEM_PROMPT},
                *history,
            ]

            async with httpx.AsyncClient(timeout=60) as client:
                resp = await client.post(
                    f"http://localhost:42005/v1/chat/completions",
                    json={
                        "model": "coder-model",
                        "messages": messages,
                        "stream": True,
                        "max_tokens": 2048,
                    },
                    headers={
                        "Authorization": f"Bearer {settings.api_key}"
                    },
                )

                if resp.status_code != 200:
                    await websocket.send_json({
                        "type": "error",
                        "text": f"LLM error: {resp.status_code}"
                    })
                    continue

                # Stream response
                full_text = ""
                async for line in resp.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    payload = line[6:]
                    if payload.strip() == "[DONE]":
                        break
                    try:
                        chunk = json.loads(payload)
                        delta = chunk.get("choices", [{}])[0].get("delta", {})
                        content = delta.get("content", "")
                        if content:
                            full_text += content
                            await websocket.send_json({
                                "type": "chunk",
                                "delta": content,
                            })
                    except (json.JSONDecodeError, IndexError, KeyError):
                        continue

                if full_text:
                    history.append({"role": "assistant", "content": full_text})
                    await websocket.send_json({
                        "type": "done",
                    })

        except WebSocketDisconnect:
            break
        except Exception as exc:
            logger.exception("agent error")
            try:
                await websocket.send_json({"type": "error", "text": str(exc)})
            except Exception:
                break
