# Lab 8 — Build a Client with an AI Coding Agent

[Sync your fork](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/syncing-a-fork#syncing-a-fork-branch-from-the-command-line) regularly — the lab gets updated.

## Product brief

> Build a Telegram bot that lets users interact with the LMS backend through chat. Users should be able to check system health, browse labs and scores, and ask questions in plain language. The bot should use an LLM to understand what the user wants and fetch the right data. Deploy it alongside the existing backend on the VM.

This is what a customer might tell you. Your job is to turn it into a working product using an AI coding agent (Qwen Code) as your development partner.

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ┌──────────────┐     ┌──────────────────────────────────┐   │
│  │  Telegram    │────▶│  Your Bot                        │   │
│  │  User        │◀────│  (aiogram / python-telegram-bot) │   │
│  └──────────────┘     └──────┬───────────────────────────┘   │
│                              │                               │
│                              │ slash commands + plain text    │
│                              ├───────▶ /start, /help         │
│                              ├───────▶ /health, /labs        │
│                              ├───────▶ intent router ──▶ LLM │
│                              │                    │          │
│                              │                    ▼          │
│  ┌──────────────┐     ┌──────┴───────┐    tools/actions      │
│  │  Docker      │     │  LMS Backend │◀───── GET /items      │
│  │  Compose     │     │  (FastAPI)   │◀───── GET /analytics  │
│  │              │     │  + PostgreSQL│◀───── POST /sync      │
│  └──────────────┘     └──────────────┘                       │
└──────────────────────────────────────────────────────────────┘
```

## Architecture

The reference implementation has 8 Docker Compose services on a shared `lms-network`:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Docker Compose (lms-network)                                           │
│                                                                         │
│  ┌─────────────┐   ┌─────────────┐   ┌──────────────┐                  │
│  │  Telegram   │   │  Flutter    │   │  React       │                  │
│  │  Bot        │   │  Web App    │   │  Web App     │                  │
│  │  (aiogram)  │   │  /flutter   │   │  /           │                  │
│  └──────┬──────┘   └──────┬──────┘   └──────┬───────┘                  │
│         │ WebSocket        │ WebSocket        │ HTTP                    │
│         └────────┬─────────┘                  │                        │
│                  ▼                             │                        │
│         ┌────────────────┐                    │                        │
│         │  Caddy         │◀───────────────────┘                        │
│         │  (reverse      │  routes /items, /analytics, /ws/chat, etc.  │
│         │   proxy)       │                                             │
│         └───┬────────┬───┘                                             │
│             │        │                                                 │
│    /ws/chat │        │ /items, /analytics, ...                         │
│             ▼        ▼                                                 │
│    ┌──────────┐  ┌──────────────┐     ┌────────────┐                   │
│    │ Nanobot  │  │  Backend     │     │ PostgreSQL │                   │
│    │ (LLM     │  │  (FastAPI)   │────▶│            │                   │
│    │  gateway)│  │              │     └────────────┘                   │
│    └────┬─────┘  └──────────────┘                                      │
│         │ MCP tools    ▲                                               │
│         └──────────────┘                                               │
│           HTTP calls                                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Services

| Service | Technology | Role |
|---------|-----------|------|
| **backend** | FastAPI + SQLAlchemy | REST API — items, learners, interactions, analytics, ETL pipeline |
| **postgres** | PostgreSQL 18 | Stores items (labs/tasks), learners, and interaction logs |
| **nanobot** | nanobot-ai framework | LLM gateway — receives chat via WebSocket, reasons with tools, calls backend via MCP |
| **client-telegram-bot** | aiogram 3.x | Telegram bot — slash commands + forwards free-text to nanobot |
| **client-web-flutter** | Flutter 3.x | Web chat UI at `/flutter` — connects to nanobot via WebSocket |
| **client-web-react** | React + Vite | Dashboard SPA at `/` |
| **caddy** | Caddy 2.x | Reverse proxy — routes all traffic, serves static frontends |
| **pgadmin** | pgAdmin 4 | Database admin UI at `/utils/pgadmin` |

### Nanobot

Nanobot is the AI brain of the system. It uses the [nanobot-ai](https://pypi.org/project/nanobot-ai/) framework to orchestrate LLM-powered conversations.

```
nanobot/
├── entrypoint.py              # Resolves env vars, launches gateway
├── config.json                # Agent config (model, provider, MCP servers)
├── nanobot_webchat/           # WebSocket channel plugin
│   ├── channel.py             # WebChatChannel — per-session API key injection
│   ├── schemas.py             # Message schemas
│   └── structured.py          # Structured response rendering
└── workspace/
    └── skills/lms/SKILL.md    # Agent prompt — teaches tool usage + response types

mcp/mcp_lms/                   # MCP server (stdio, separate package)
├── client.py                  # Async HTTP client for backend API
├── server.py                  # Tool registry — lms_health, lms_labs, lms_scores, ...
└── __main__.py                # Entry point: python -m mcp_lms
```

**How it works:**

1. Clients connect via WebSocket at `/ws/chat`
2. User message arrives as `{"content": "..."}`
3. The agent reasons with an LLM (OpenRouter-compatible provider)
4. Agent calls `mcp_lms_*` tools → MCP server → `client.py` → backend HTTP API
5. Agent returns structured response: `text`, `choice` (buttons), `confirm`, or `composite`

**Response types** (defined in `SKILL.md`):

| Type | Description |
|------|-------------|
| `text` | Plain markdown response |
| `choice` | Buttons with options — returns selected value |
| `confirm` | Yes/no prompt |
| `composite` | Combines text + choice/confirm for progressive UI |

### Flutter Web Client

A Material Design chat UI that connects directly to nanobot via WebSocket.

```
client-web-flutter/lib/
├── main.dart           # App root — login/chat routing, localStorage persistence
├── login_screen.dart   # API key validation (GET /items/ with Bearer token)
├── chat_screen.dart    # Chat bubbles, command chips, 90s timeout, auto-scroll
└── llm_service.dart    # WebSocket client — sends/receives JSON to /ws/chat
```

**Features:** API key login (persisted in localStorage), message bubbles, quick-action command chips (labs, health, scores, sync), loading states with timeout, auto-reconnect detection.

### Backend API

FastAPI app with Bearer token auth on all endpoints.

**Data model** (PostgreSQL, 3 tables):
- **item** — tree structure (course → labs → tasks → steps) via `parent_id`
- **learner** — anonymized students with `external_id` from autochecker
- **interacts** — submission records with score, checks passed/total

**Endpoints:**

| Route | Method | Description |
|-------|--------|-------------|
| `/items/` | GET/POST | List or create learning items |
| `/items/{id}` | GET/PUT | Get or update a single item |
| `/learners/` | GET/POST | List or create learners |
| `/interactions/` | GET/POST | List or create interaction logs |
| `/pipeline/sync` | POST | ETL — fetch data from autochecker API, upsert into DB |
| `/analytics/pass-rates` | GET | Per-task average scores for a lab |
| `/analytics/timeline` | GET | Submissions per day |
| `/analytics/groups` | GET | Per-group average scores |
| `/analytics/top-learners` | GET | Ranked learners by average score |
| `/analytics/scores` | GET | Score histogram (quartile buckets) |
| `/analytics/completion-rate` | GET | Percentage of learners scoring >= 60 |

### Caddy routing

| Path | Target |
|------|--------|
| `/items*`, `/learners*`, `/interactions*`, `/pipeline*`, `/analytics*`, `/docs*` | backend |
| `/ws/chat` | nanobot (WebSocket) |
| `/flutter*` | Flutter SPA (static files) |
| `/utils/pgadmin*` | pgAdmin |
| `/` | React SPA (static files) |

### Message flow

**Free-text query (LLM-routed):**
```
User → Telegram/Flutter → WebSocket → Nanobot Agent → LLM reasoning
                                          ↓ mcp_lms_* tool calls
                                      MCP Server → HTTP → Backend → PostgreSQL
                                          ↓ structured response
                                      WebSocket → Telegram/Flutter → User
```

**Slash command (direct, no LLM):**
```
User → /scores lab-04 → Telegram Bot → HTTP → Backend → PostgreSQL
                                    ↓ formatted response
                              Telegram → User
```

## Requirements

### P0 — Must have

1. Testable handler architecture — handlers work without Telegram
2. CLI test mode: `cd bot && uv run bot.py --test "/command"` prints response to stdout
3. `/start` — welcome message
4. `/help` — lists all available commands
5. `/health` — calls backend, reports up/down status
6. `/labs` — lists available labs
7. `/scores <lab>` — per-task pass rates
8. Error handling — backend down produces a friendly message, not a crash

### P1 — Should have

1. Natural language intent routing — plain text interpreted by LLM
2. All 9 backend endpoints wrapped as LLM tools
3. Inline keyboard buttons for common actions
4. Multi-step reasoning (LLM chains multiple API calls)

### P2 — Nice to have

1. Rich formatting (tables, charts as images)
2. Response caching
3. Conversation context (multi-turn)

### P3 — Deployment

1. Bot containerized with Dockerfile
2. Added as service in `docker-compose.yml`
3. Deployed and running on VM
4. README documents deployment

## Learning advice

Notice the progression above: **product brief** (vague customer ask) → **prioritized requirements** (structured) → **task specifications** (precise deliverables + acceptance criteria). This is how engineering work flows.

You are not following step-by-step instructions — you are building a product with an AI coding agent. The learning comes from planning, building, testing, and debugging iteratively.

## Learning outcomes

By the end of this lab, you should be able to say:

1. I turned a vague product brief into a working Telegram bot.
2. I can ask it questions in plain language and it fetches the right data.
3. I used an AI coding agent to plan and build the whole thing.

## Tasks

### Prerequisites

1. Complete the [lab setup](./lab/setup/setup-simple.md#lab-setup)

> **Note**: First time in this course? Do the [full setup](./lab/setup/setup-full.md#lab-setup) instead.

### Required

1. [Plan and Scaffold](./lab/tasks/required/task-1.md) — P0: project structure + `--test` mode
2. [Backend Integration](./lab/tasks/required/task-2.md) — P0: slash commands + real data
3. [Intent-Based Natural Language Routing](./lab/tasks/required/task-3.md) — P1: LLM tool use
4. [Containerize and Document](./lab/tasks/required/task-4.md) — P3: containerize + deploy

### Optional

1. [Flutter Web Chatbot](./lab/tasks/optional/task-1.md)
