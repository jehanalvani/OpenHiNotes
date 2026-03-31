# OpenHiNotes

A web application for managing, transcribing, and summarizing audio recordings from HiDock devices. Connect your HiDock via WebUSB, transcribe recordings using [VoxBench](https://github.com/ghecko/VoxBench), rename speakers from diarization, and chat with an LLM about your transcripts.

## Features

- **WebUSB device connection** — browse, download, and manage audio files directly from HiDock H1, H1E, P1, and P1 Mini devices in the browser
- **Server-side transcription** — audio is uploaded to the FastAPI backend, which proxies requests to a [VoxBench](https://github.com/ghecko/VoxBench) API server (OpenAI-compatible)
- **VoxBench Job Mode** — async transcription with real-time progress streaming via SSE for long audio files
- **Speaker diarization & renaming** — color-coded speakers with inline click-to-edit renaming
- **Summary templates** — admins define reusable prompt templates; users generate summaries from any transcription with one click
- **Transcribe & Summarize combo** — run both operations directly from the recordings list
- **LLM chat** — send any transcript as context to an OpenAI-compatible chat endpoint and ask questions about it (streaming responses with typing animation)
- **Authentication & roles** — JWT-based auth with admin and user roles
- **Dark mode** — system-aware theme with manual toggle, glass-morphism UI
- **Fully dockerized** — four-service Docker Compose setup with PostgreSQL, FastAPI, Vite, and Caddy (HTTPS required for WebUSB)

## Architecture

```
┌──────────────┐       ┌──────────────┐       ┌──────────────────┐
│   Browser    │ WebUSB│   HiDock     │       │  VoxBench API    │
│  (React +   │◄─────►│   Device     │       │  Server          │
│   Vite)     │       └──────────────┘       └────────▲─────────┘
│              │                                      │
│  uploads audio via /api                             │
│              │                                      │
└──────┬───────┘                                      │
       │ HTTPS                                        │
┌──────▼───────┐       ┌──────────────┐               │
│    Caddy     │──────►│   FastAPI    │───────────────┘
│  (reverse    │       │   Backend    │
│   proxy)     │       │              │───────► LLM API (chat/summaries)
└──────────────┘       └──────┬───────┘
                              │
                       ┌──────▼───────┐
                       │  PostgreSQL  │
                       └──────────────┘
```

## Quick Start

### Prerequisites

- Docker and Docker Compose
- A [VoxBench](https://github.com/ghecko/VoxBench) server for transcription
- Optionally, an OpenAI-compatible LLM endpoint for chat and summaries (e.g. Ollama, LM Studio, OpenAI)

### Setup

```bash
# Clone the repository
git clone https://github.com/ghecko/OpenHiNotes.git
cd OpenHiNotes

# Copy and edit environment variables
cp .env.example .env
# Edit .env with your VoxBench URL, LLM endpoint, secret key, etc.

# Start all services
docker compose up --build
```

Open **https://localhost:8443** in your browser (accept the self-signed certificate). Caddy provides HTTPS, which is required for WebUSB to work.

### Default Admin Account

| Field    | Value                      |
|----------|----------------------------|
| Email    | `admin@openhinotes.local`  |
| Password | `admin`                    |

Change these via the `ADMIN_EMAIL` and `ADMIN_PASSWORD` environment variables before first startup.

## Configuration

All configuration is done through environment variables (see [`.env.example`](.env.example)):

| Variable              | Description                                      | Default                                |
|-----------------------|--------------------------------------------------|----------------------------------------|
| `SECRET_KEY`          | JWT signing key — change in production           | `change-me-...`                        |
| `ADMIN_EMAIL`         | Initial admin account email                      | `admin@openhinotes.local`              |
| `ADMIN_PASSWORD`      | Initial admin account password                   | `admin`                                |
| `WHISPERX_API_URL`    | URL of the VoxBench transcription API            | `http://whisperx:8000`                 |
| `WHISPERX_MODEL`      | Whisper model to use                             | `large-v3`                             |
| `WHISPERX_VERIFY_SSL` | SSL verification for VoxBench API calls          | `true`                                 |
| `LLM_API_URL`         | OpenAI-compatible chat completions endpoint      | `http://host.docker.internal:11434/v1` |
| `LLM_API_KEY`         | API key for the LLM endpoint (if required)       | *(empty)*                              |
| `LLM_MODEL`           | Model name for chat and summaries                | `gpt-3.5-turbo`                        |
| `LLM_VERIFY_SSL`      | SSL verification for LLM API calls               | `true`                                 |
| `CORS_ORIGINS`        | Allowed CORS origins                             | `*`                                    |

### SSL Verification

The `*_VERIFY_SSL` settings accept three values:
- `"true"` — use the system CA store (default)
- `"false"` — disable SSL verification (for self-signed certs in development)
- A file path — use a custom CA bundle (e.g. `/etc/ssl/certs/ca-certificates.crt`)

## Project Structure

```
OpenHiNotes/
├── backend/                  # Python FastAPI application
│   ├── app/
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   ├── routers/          # API route handlers
│   │   ├── services/         # Business logic (auth, transcription, LLM)
│   │   ├── main.py           # FastAPI app entry point
│   │   ├── config.py         # Settings from environment
│   │   ├── database.py       # Async SQLAlchemy setup
│   │   └── dependencies.py   # Auth dependencies
│   ├── alembic/              # Database migrations
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                 # React + Vite + TypeScript application
│   ├── src/
│   │   ├── api/              # Backend API client modules
│   │   ├── components/       # Reusable UI components
│   │   ├── hooks/            # React hooks (device connection)
│   │   ├── pages/            # Route pages
│   │   ├── services/         # WebUSB device protocol
│   │   ├── store/            # Zustand state management
│   │   └── types/            # TypeScript type definitions
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml        # Development orchestration
├── docker-compose.prod.yml   # Production orchestration
├── Caddyfile                 # Reverse proxy with HTTPS
└── .env.example              # Environment template
```

## API Endpoints

| Method | Path                                    | Auth     | Description                              |
|--------|-----------------------------------------|----------|------------------------------------------|
| POST   | `/api/auth/register`                    | Public   | Create a new user account                |
| POST   | `/api/auth/login`                       | Public   | Obtain a JWT token                       |
| GET    | `/api/auth/me`                          | User     | Get current user profile                 |
| GET    | `/api/users`                            | Admin    | List all users                           |
| PATCH  | `/api/users/{id}/role`                  | Admin    | Change a user's role                     |
| POST   | `/api/transcriptions/upload`            | User     | Upload audio and transcribe              |
| POST   | `/api/transcriptions/upload-stream`     | User     | Upload and transcribe with SSE progress  |
| GET    | `/api/transcriptions`                   | User     | List transcriptions                      |
| GET    | `/api/transcriptions/{id}`              | User     | Get a single transcription               |
| PATCH  | `/api/transcriptions/{id}/speakers`     | User     | Rename speakers                          |
| PATCH  | `/api/transcriptions/{id}/notes`        | User     | Update notes                             |
| DELETE | `/api/transcriptions/{id}`              | User     | Delete a transcription                   |
| GET    | `/api/templates`                        | User     | List summary templates                   |
| POST   | `/api/templates`                        | Admin    | Create a summary template                |
| PATCH  | `/api/templates/{id}`                   | Admin    | Update a template                        |
| DELETE | `/api/templates/{id}`                   | Admin    | Delete a template                        |
| POST   | `/api/summaries`                        | User     | Generate a summary                       |
| GET    | `/api/summaries`                        | User     | List summaries for a transcription       |
| POST   | `/api/chat`                             | User     | Chat with LLM (streaming SSE)           |
| GET    | `/api/health`                           | Public   | Health check                             |

## Supported Devices

| Device         | Product IDs          |
|----------------|----------------------|
| HiDock H1      | `0xAF0C`             |
| HiDock H1E     | `0xAF0D`, `0xB00D`   |
| HiDock P1      | `0xAF0E`, `0xB00E`   |
| HiDock P1 Mini | `0xAF0F`             |

## Development

To run services individually without Docker:

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# Set DATABASE_URL to a local PostgreSQL instance
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` requests to `http://localhost:8000` automatically.

## Tech Stack

| Layer      | Technology                                                        |
|------------|-------------------------------------------------------------------|
| Frontend   | React 18, Vite 5, TypeScript, Tailwind CSS 3, Zustand, React Router 6 |
| Backend    | Python 3.11, FastAPI, SQLAlchemy 2 (async), Alembic, Pydantic    |
| Database   | PostgreSQL 16                                                     |
| Auth       | JWT (python-jose), bcrypt (passlib)                               |
| Device     | WebUSB API (browser-native)                                       |
| Transcription | [VoxBench](https://github.com/ghecko/VoxBench) (OpenAI-compatible) |
| Deployment | Docker Compose, Caddy 2                                           |

## Acknowledgments

This project is a full rewrite of [HiDock Next](https://github.com/HiDock/hidock-next), the original open-source web client for HiDock recording devices. The WebUSB protocol implementation and device communication layer are derived from that project. OpenHiNotes replaces the client-only architecture with a FastAPI backend, adds server-side transcription via [VoxBench](https://github.com/ghecko/VoxBench), authentication, summary templates, and LLM chat capabilities.

## License

See [LICENSE](LICENSE) for details.
