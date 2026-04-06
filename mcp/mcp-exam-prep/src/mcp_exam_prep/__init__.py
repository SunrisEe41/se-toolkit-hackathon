"""MCP server for the Exam Prep API."""

from __future__ import annotations

import asyncio
import json
from collections.abc import Awaitable, Callable
from dataclasses import dataclass

import httpx
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import TextContent, Tool
from pydantic import BaseModel, Field

from mcp_exam_prep.settings import settings

ToolPayload = BaseModel | list[BaseModel]
ToolHandler = Callable[["ExamClient", BaseModel], Awaitable[ToolPayload]]


# ── Client ─────────────────────────────────────────────────────────────────────


class ExamClient:
    """HTTP client for the Exam Prep backend."""

    def __init__(self, base_url: str, api_key: str):
        self._base_url = base_url.rstrip("/")
        self._headers = {"Authorization": f"Bearer {api_key}"}

    def _url(self, path: str) -> str:
        return f"{self._base_url}/{path.lstrip('/')}"

    async def get(self, path: str, params: dict | None = None) -> dict | list:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                self._url(path),
                params=params,
                headers=self._headers,
                timeout=15.0,
            )
            resp.raise_for_status()
            return resp.json()

    async def post(self, path: str, body: dict) -> dict:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                self._url(path),
                json=body,
                headers=self._headers,
                timeout=15.0,
            )
            resp.raise_for_status()
            return resp.json()


# ── Schemas ────────────────────────────────────────────────────────────────────


class NoArgs(BaseModel):
    pass


class GetTaskArgs(BaseModel):
    topic_id: int | None = Field(default=None, description="Topic ID (integer)")
    topic_slug: str | None = Field(default=None, description="Topic slug (string)")


class CheckAnswerArgs(BaseModel):
    task_id: int = Field(description="Task ID to check")
    answer_text: str = Field(description="Student's answer")


class GetTheoryArgs(BaseModel):
    topic_id: int | None = Field(default=None, description="Topic ID (integer)")
    topic_slug: str | None = Field(default=None, description="Topic slug (string)")


class SubmitAnswerArgs(BaseModel):
    student_id: str = Field(description="Student identifier (name or email)")
    task_id: int = Field(description="Task ID to submit")
    user_answer: str = Field(description="Student's answer text")


class GetProgressArgs(BaseModel):
    student_id: str = Field(description="Student identifier")


class StartExamArgs(BaseModel):
    student_id: str = Field(description="Student identifier")
    num_tasks: int = Field(default=5, description="Number of tasks for the exam")


# ── ToolSpec ───────────────────────────────────────────────────────────────────


@dataclass(frozen=True, slots=True)
class ToolSpec:
    name: str
    description: str
    model: type[BaseModel]
    handler: ToolHandler

    def as_tool(self) -> Tool:
        schema = self.model.model_json_schema()
        schema.pop("$defs", None)
        schema.pop("title", None)
        return Tool(name=self.name, description=self.description, inputSchema=schema)


# ── Handlers ───────────────────────────────────────────────────────────────────


async def _exam_health(client: ExamClient, _args: BaseModel) -> ToolPayload:
    return await client.get("exam/health/")


async def _exam_list_topics(client: ExamClient, _args: BaseModel) -> ToolPayload:
    return await client.get("exam/topics/")


async def _exam_get_task(client: ExamClient, args: GetTaskArgs) -> ToolPayload:
    params = {}
    if args.topic_id is not None:
        params["topic_id"] = args.topic_id
    return await client.get("exam/tasks/random", params=params or None)


async def _exam_check_answer(client: ExamClient, args: CheckAnswerArgs) -> ToolPayload:
    all_tasks = await client.get("exam/tasks/")
    task = None
    for t in all_tasks:
        if t["id"] == args.task_id:
            task = t
            break
    if task is None:
        return {"error": f"Task {args.task_id} not found."}
    correct = task["answer"].strip().lower() == args.answer_text.strip().lower()
    return {
        "task_id": args.task_id,
        "student_answer": args.answer_text,
        "correct_answer": task["answer"],
        "is_correct": correct,
        "explanation": task.get("explanation", ""),
    }


async def _exam_get_theory(client: ExamClient, args: GetTheoryArgs) -> ToolPayload:
    if args.topic_slug:
        return await client.get(f"exam/theory/{args.topic_slug}")
    elif args.topic_id is not None:
        return await client.get("exam/theory/", params={"topic_id": args.topic_id})
    return await client.get("exam/theory/")


async def _exam_submit_answer(
    client: ExamClient, args: SubmitAnswerArgs
) -> ToolPayload:
    body = {
        "student_id": args.student_id,
        "task_id": args.task_id,
        "user_answer": args.user_answer,
    }
    return await client.post("exam/progress/submit", body=body)


async def _exam_get_progress(client: ExamClient, args: GetProgressArgs) -> ToolPayload:
    return await client.get(f"exam/progress/{args.student_id}")


async def _exam_start_exam_mode(client: ExamClient, args: StartExamArgs) -> ToolPayload:
    body = {
        "student_id": args.student_id,
        "num_tasks": args.num_tasks,
    }
    return await client.post("exam/progress/exam-mode", body=body)


TOOL_SPECS: tuple[ToolSpec, ...] = (
    ToolSpec(
        "exam_list_topics",
        "List all available exam topics with their slugs, titles, and descriptions.",
        NoArgs,
        _exam_list_topics,
    ),
    ToolSpec(
        "exam_get_task",
        "Get a random task for a given topic. Use topic_id (integer) or topic_slug (string).",
        GetTaskArgs,
        _exam_get_task,
    ),
    ToolSpec(
        "exam_check_answer",
        "Check if a student's answer matches the expected answer for a given task.",
        CheckAnswerArgs,
        _exam_check_answer,
    ),
    ToolSpec(
        "exam_get_theory",
        "Get theory pages for a topic. Provide topic_id (integer) or topic_slug (string).",
        GetTheoryArgs,
        _exam_get_theory,
    ),
    ToolSpec(
        "exam_health",
        "Check exam prep API health. Returns counts of topics, tasks, and theory pages.",
        NoArgs,
        _exam_health,
    ),
    ToolSpec(
        "exam_submit_answer",
        "Submit an answer for a task. Records the attempt and returns whether it was correct.",
        SubmitAnswerArgs,
        _exam_submit_answer,
    ),
    ToolSpec(
        "exam_get_progress",
        "Get progress stats for a student: total attempts, correct/wrong count, accuracy, topics.",
        GetProgressArgs,
        _exam_get_progress,
    ),
    ToolSpec(
        "exam_start_exam_mode",
        "Start exam mode: pick N random tasks from all topics without showing answers.",
        StartExamArgs,
        _exam_start_exam_mode,
    ),
)

TOOLS_BY_NAME = {spec.name: spec for spec in TOOL_SPECS}


# ── Server ─────────────────────────────────────────────────────────────────────


def _text(data: ToolPayload) -> list[TextContent]:
    if isinstance(data, BaseModel):
        payload = data.model_dump()
    else:
        payload = data
    return [
        TextContent(type="text", text=json.dumps(payload, ensure_ascii=False, indent=2))
    ]


def create_server(client: ExamClient) -> Server:
    server = Server("exam-prep")

    @server.list_tools()
    async def list_tools() -> list[Tool]:
        return [spec.as_tool() for spec in TOOL_SPECS]

    @server.call_tool()
    async def call_tool(name: str, arguments: dict) -> list[TextContent]:
        spec = TOOLS_BY_NAME.get(name)
        if spec is None:
            return [TextContent(type="text", text=f"Unknown tool: {name}")]
        try:
            args = spec.model.model_validate(arguments or {})
            return _text(await spec.handler(client, args))
        except Exception as exc:
            return [
                TextContent(type="text", text=f"Error: {type(exc).__name__}: {exc}")
            ]

    _ = list_tools, call_tool
    return server


async def main() -> None:
    client = ExamClient(settings.backend_url, settings.api_key)
    server = create_server(client)
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream, write_stream, server.create_initialization_options()
        )


def run():
    asyncio.run(main())


if __name__ == "__main__":
    run()
