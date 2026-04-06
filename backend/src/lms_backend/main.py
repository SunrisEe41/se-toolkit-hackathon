"""Learning Management Service — FastAPI application."""

import logging
import time
import traceback
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import RequestResponseEndpoint
from starlette.responses import Response

from lms_backend.auth import verify_api_key
from lms_backend.routers import items
from lms_backend.settings import settings
from exam_prep.routers import health as exam_health, tasks, theory, topics

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # opentelemetry-instrument already installed the LoggingHandler on the root logger
    # (via OTEL_LOGS_EXPORTER=otlp). We only need to fix uvicorn.access, which has
    # propagate=False by default, so its HTTP access lines reach the OTel handler.
    logging.getLogger("uvicorn.access").propagate = True
    yield


app = FastAPI(
    title=settings.app_name,
    debug=settings.debug,
    description="A learning management service API.",
    version="0.1.0",
    lifespan=lifespan,
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Return error details in the response for easier debugging."""
    tb = traceback.format_exception(type(exc), exc, exc.__traceback__)
    logger.exception(
        "unhandled_exception",
        extra={"event": "unhandled_exception", "path": request.url.path},
    )
    return JSONResponse(
        status_code=500,
        content={
            "detail": str(exc),
            "type": type(exc).__name__,
            "path": request.url.path,
            "traceback": tb[-3:],  # last 3 lines of traceback
        },
    )


@app.middleware("http")
async def log_requests(
    request: Request, call_next: RequestResponseEndpoint
) -> Response:
    logger.info(
        "request_started",
        extra={
            "event": "request_started",
            "method": request.method,
            "path": request.url.path,
        },
    )
    t0 = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - t0) * 1000)
    level = logging.ERROR if response.status_code >= 500 else logging.INFO
    logger.log(
        level,
        "request_completed",
        extra={
            "event": "request_completed",
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "duration_ms": duration_ms,
        },
    )
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    items.router,
    prefix="/items",
    tags=["items"],
    dependencies=[Depends(verify_api_key)],
)

# Exam prep routes
app.include_router(
    exam_health.router,
    prefix="/exam/health",
    tags=["exam-prep"],
    dependencies=[Depends(verify_api_key)],
)

app.include_router(
    topics.router,
    prefix="/exam/topics",
    tags=["exam-prep"],
    dependencies=[Depends(verify_api_key)],
)

app.include_router(
    tasks.router,
    prefix="/exam/tasks",
    tags=["exam-prep"],
    dependencies=[Depends(verify_api_key)],
)

app.include_router(
    theory.router,
    prefix="/exam/theory",
    tags=["exam-prep"],
    dependencies=[Depends(verify_api_key)],
)
