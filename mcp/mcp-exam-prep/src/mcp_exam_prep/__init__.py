"""MCP server for the Exam Prep API."""

import json
import logging
from contextlib import asynccontextmanager

import httpx
from mcp.server import Server
from mcp.types import TextContent, Tool

from mcp_exam_prep.models import (
    TaskResult,
    TheoryResult,
    TopicResult,
)
from mcp_exam_prep.settings import Settings

logger = logging.getLogger(__name__)

settings = Settings()


class ExamClient:
    """HTTP client for the Exam Prep backend."""

    def __init__(self, base_url: str, api_key: str):
        self._base_url = base_url.rstrip("/")
        self._headers = {"Authorization": f"Bearer {api_key}"}

    def _url(self, path: str) -> str:
        return f"{self._base_url}/{path.lstrip('/')}"

    async def get(self, path: str, params: dict | None = None) -> dict:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                self._url(path),
                params=params,
                headers=self._headers,
                timeout=15.0,
            )
            resp.raise_for_status()
            return resp.json()


# ── Tool definitions ──────────────────────────────────────────────────────────

TOOLS: list[Tool] = [
    Tool(
        name="exam_list_topics",
        description="List all available exam topics with their slugs, titles, and descriptions.",
    ),
    Tool(
        name="exam_get_task",
        description=(
            "Get a random task for a given topic. Use topic_id (integer) or topic_slug (string). "
            "Returns the question, difficulty, and correct answer with explanation."
        ),
    ),
    Tool(
        name="exam_check_answer",
        description=(
            "Check if a student's answer matches the expected answer for a given task. "
            "Provide task_id and the student's answer_text. Returns whether the answer is correct."
        ),
    ),
    Tool(
        name="exam_get_theory",
        description=(
            "Get theory pages for a topic. Provide topic_id (integer) or topic_slug (string). "
            "Returns title and content of each theory page."
        ),
    ),
    Tool(
        name="exam_health",
        description="Check exam prep API health. Returns counts of topics, tasks, and theory pages.",
    ),
]


async def handle_tool(name: str, arguments: dict) -> list[TextContent]:
    client = ExamClient(settings.backend_url, settings.api_key)

    if name == "exam_list_topics":
        topics = await client.get("exam/topics/")
        return [TextContent(type="text", text=json.dumps(topics, indent=2, ensure_ascii=False))]

    elif name == "exam_get_task":
        topic_id = arguments.get("topic_id")
        topic_slug = arguments.get("topic_slug")
        params = {}
        if topic_id is not None:
            params["topic_id"] = int(topic_id)
        task = await client.get("exam/tasks/random", params=params if params else None)
        return [TextContent(type="text", text=json.dumps(task, indent=2, ensure_ascii=False))]

    elif name == "exam_check_answer":
        task_id = arguments.get("task_id")
        answer_text = arguments.get("answer_text", "")
        # Fetch the task to get the correct answer
        all_tasks = await client.get("exam/tasks/", params={"topic_id": 1})  # we need by id
        # Find by id in the list
        task = None
        for t in all_tasks:
            if t["id"] == int(task_id):
                task = t
                break
        if task is None:
            # Try fetching all tasks without filter
            all_tasks = await client.get("exam/tasks/")
            for t in all_tasks:
                if t["id"] == int(task_id):
                    task = t
                    break
        if task is None:
            return [TextContent(type="text", text=f"Task {task_id} not found.")]
        # Simple comparison — the LLM will do fuzzy matching
        correct = task["answer"].strip().lower() == answer_text.strip().lower()
        result = {
            "task_id": task_id,
            "student_answer": answer_text,
            "correct_answer": task["answer"],
            "is_correct": correct,
            "explanation": task.get("explanation", ""),
        }
        return [TextContent(type="text", text=json.dumps(result, indent=2, ensure_ascii=False))]

    elif name == "exam_get_theory":
        topic_id = arguments.get("topic_id")
        topic_slug = arguments.get("topic_slug")
        if topic_slug:
            items = await client.get(f"exam/theory/{topic_slug}")
        elif topic_id:
            items = await client.get("exam/theory/", params={"topic_id": int(topic_id)})
        else:
            items = await client.get("exam/theory/")
        return [TextContent(type="text", text=json.dumps(items, indent=2, ensure_ascii=False))]

    elif name == "exam_health":
        health = await client.get("exam/health/")
        return [TextContent(type="text", text=json.dumps(health, indent=2, ensure_ascii=False))]

    else:
        return [TextContent(type="text", text=f"Unknown tool: {name}")]


# ── Server ─────────────────────────────────────────────────────────────────────


def create_server() -> Server:
    server = Server("exam-prep")

    @server.list_tools()
    async def list_tools() -> list[Tool]:
        return TOOLS

    @server.call_tool()
    async def call_tool(name: str, arguments: dict) -> list[TextContent]:
        return await handle_tool(name, arguments)

    return server


def main():
    import asyncio
    from mcp.server.stdio import stdio_server

    server = create_server()
    async def run():
        async with stdio_server() as (read_stream, write_stream):
            await server.run(read_stream, write_stream, server.create_initialization_options())
    asyncio.run(run())


if __name__ == "__main__":
    main()
