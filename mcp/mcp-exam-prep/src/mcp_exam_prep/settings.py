"""Settings for the Exam Prep MCP server."""

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    backend_url: str = Field(
        default="http://localhost:42002",
        alias="NANOBOT_EXAM_BACKEND_URL",
    )
    api_key: str = Field(
        default="",
        alias="NANOBOT_EXAM_API_KEY",
    )


settings = Settings.model_validate({})
