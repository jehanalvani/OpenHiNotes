# OpenHiNotes Backend

FastAPI backend for managing audio transcriptions from HiDock recording devices.

## Features

- JWT-based authentication with admin/user roles
- Audio file upload and transcription via WhisperX API
- Transcription management (list, view, update speakers/notes, delete)
- Summary generation using OpenAI-compatible LLM API
- Chat interface with streaming responses
- Async database operations with SQLAlchemy
- Database migrations with Alembic
- PostgreSQL database with asyncpg

## Project Structure

```
backend/
├── app/
│   ├── main.py                 # FastAPI app, middleware, startup events
│   ├── config.py               # Settings from environment variables
│   ├── database.py             # Async SQLAlchemy setup
│   ├── dependencies.py         # JWT and authorization dependencies
│   ├── models/                 # SQLAlchemy models
│   ├── schemas/                # Pydantic request/response schemas
│   ├── routers/                # API route handlers
│   └── services/               # Business logic and external API calls
├── alembic/                    # Database migrations
└── requirements.txt            # Python dependencies
```

## Setup

### 1. Environment Variables

Copy `.env.example` to `.env` and update values:

```bash
cp .env.example .env
```

Key variables:
- `DATABASE_URL`: PostgreSQL connection string
- `SECRET_KEY`: JWT signing key (change in production!)
- `WHISPERX_API_URL`: URL to WhisperX transcription service
- `LLM_API_URL`: OpenAI-compatible API endpoint
- `ADMIN_EMAIL`/`ADMIN_PASSWORD`: Initial admin credentials

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Database Setup

Run migrations:

```bash
alembic upgrade head
```

### 4. Start Development Server

```bash
uvicorn app.main:app --reload
```

API will be available at `http://localhost:8000`
API docs at `http://localhost:8000/docs`

## Docker

Build and run with Docker:

```bash
docker build -t openhinotes-backend .
docker run -p 8000:8000 --env-file .env openhinotes-backend
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user info

### Users (Admin)
- `GET /api/users` - List all users
- `GET /api/users/{id}` - Get user details
- `PATCH /api/users/{id}/role` - Update user role

### Transcriptions
- `POST /api/transcriptions/upload` - Upload audio and transcribe
- `GET /api/transcriptions` - List user's transcriptions
- `GET /api/transcriptions/{id}` - Get transcription details
- `PATCH /api/transcriptions/{id}/speakers` - Update speaker names
- `PATCH /api/transcriptions/{id}/notes` - Add user notes
- `DELETE /api/transcriptions/{id}` - Delete transcription

### Templates (Admin)
- `GET /api/templates` - List active templates
- `POST /api/templates` - Create new template
- `GET /api/templates/{id}` - Get template details
- `PATCH /api/templates/{id}` - Update template
- `DELETE /api/templates/{id}` - Deactivate template

### Summaries
- `POST /api/summaries` - Generate summary from transcription
- `GET /api/summaries?transcription_id=X` - List summaries

### Chat
- `POST /api/chat` - Stream chat responses (Server-Sent Events)

## Authentication

Include JWT token in Authorization header:

```
Authorization: Bearer <access_token>
```

Tokens expire after 24 hours.

## Database Models

### User
- id (UUID)
- email (unique)
- hashed_password
- role (admin/user)
- display_name
- is_active
- created_at

### Transcription
- id (UUID)
- user_id (FK)
- filename, original_filename
- audio_duration (float)
- language
- text (full transcript)
- segments (JSON - list of segment objects with speaker info)
- speakers (JSON - mapping of speaker codes to custom names)
- status (pending/processing/completed/failed)
- error_message
- notes (user notes)
- created_at, updated_at

### SummaryTemplate
- id (UUID)
- name
- description
- prompt_template (with {{transcript}} placeholder)
- created_by (FK)
- is_active
- created_at, updated_at

### Summary
- id (UUID)
- transcription_id (FK)
- template_id (FK, optional)
- content (the summary text)
- model_used
- created_at

## External API Integration

### WhisperX API
Sends audio files to WhisperX for transcription:
- Endpoint: `{WHISPERX_API_URL}/v1/audio/transcriptions`
- Returns: text, segments (with speaker info), duration

### LLM API
Uses OpenAI-compatible API for:
- Summary generation: `POST {LLM_API_URL}/chat/completions`
- Chat responses (with streaming): `POST {LLM_API_URL}/chat/completions` with `stream: true`

## Development

### Run tests
```bash
pytest
```

### Code style
Uses standard Python formatting conventions.

## Default Admin User

On startup, if no admin user exists, one is created with credentials:
- Email: `admin@openhinotes.local`
- Password: `admin`

**Change these credentials immediately in production!**
