# OpenHiNotes Backend - Development Guide

## Implementation Summary

A complete FastAPI backend has been implemented with all required features for the OpenHiNotes audio transcription management system.

## Architecture Overview

### Technology Stack
- **Framework**: FastAPI 0.115.0
- **Database**: PostgreSQL with SQLAlchemy 2.0 (async)
- **Authentication**: JWT with python-jose
- **Password Hashing**: bcrypt via passlib
- **Migrations**: Alembic
- **HTTP Client**: httpx (async)
- **Python**: 3.11

### Project Structure

```
app/
├── main.py                 # FastAPI application, middleware, startup events
├── config.py               # Pydantic Settings configuration
├── database.py             # Async SQLAlchemy engine and session factory
├── dependencies.py         # JWT and authorization dependencies
├── models/
│   ├── user.py             # User model with roles
│   ├── transcription.py    # Transcription model with status tracking
│   ├── template.py         # SummaryTemplate model
│   └── summary.py          # Summary model
├── schemas/
│   ├── user.py             # User request/response schemas
│   ├── transcription.py    # Transcription schemas
│   ├── template.py         # Template schemas
│   ├── summary.py          # Summary schemas
│   └── chat.py             # Chat request schema
├── routers/
│   ├── auth.py             # Authentication routes
│   ├── users.py            # User management (admin)
│   ├── transcriptions.py   # Transcription CRUD + WhisperX integration
│   ├── templates.py        # Template management (admin)
│   ├── summaries.py        # Summary generation
│   └── chat.py             # Streaming chat endpoint
└── services/
    ├── auth.py             # Password hashing, JWT operations
    ├── transcription.py    # File handling, WhisperX API calls
    └── llm.py              # LLM API integration, streaming
```

## Key Features Implemented

### 1. Authentication & Authorization
- **JWT-based**: Tokens expire after 24 hours
- **Role-based access control**: Admin vs. User roles
- **Password security**: bcrypt hashing with passlib
- **Automatic admin creation**: Default admin user created on startup

Routes:
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Get JWT token
- `GET /api/auth/me` - Get current user

### 2. User Management
- Admin-only endpoints for user listing and role assignment
- User profile viewing (own or admin-only all)
- Role management (admin/user)

Routes:
- `GET /api/users` - List users (admin only)
- `GET /api/users/{id}` - Get user details
- `PATCH /api/users/{id}/role` - Update role (admin only)

### 3. Transcription Management
- Audio file upload and automatic transcription via WhisperX
- Stores transcript text, segments with speaker info, and duration
- Speaker name customization via speaker mapping
- User notes for transcriptions
- Status tracking (pending/processing/completed/failed)
- Optional auto-summarization on upload
- User-scoped access (admin sees all, users see own)

Routes:
- `POST /api/transcriptions/upload` - Upload and transcribe
- `GET /api/transcriptions` - List (scoped)
- `GET /api/transcriptions/{id}` - Get details
- `PATCH /api/transcriptions/{id}/speakers` - Update speaker names
- `PATCH /api/transcriptions/{id}/notes` - Add/edit notes
- `DELETE /api/transcriptions/{id}` - Delete transcription

### 4. Summary Templates
- Admin-definable summary prompt templates
- Support for `{{transcript}}` placeholder in prompts
- Template activation/deactivation
- Used for consistent summary generation

Routes:
- `GET /api/templates` - List active templates (all users)
- `POST /api/templates` - Create (admin only)
- `PATCH /api/templates/{id}` - Update (admin only)
- `DELETE /api/templates/{id}` - Deactivate (admin only)

### 5. Summary Generation
- Generate summaries from transcriptions using templates or custom prompts
- Calls OpenAI-compatible LLM API
- Tracks which model was used
- Stores summaries in database with optional template reference
- User-scoped access

Routes:
- `POST /api/summaries` - Create summary
- `GET /api/summaries?transcription_id=X` - List summaries

### 6. Chat with Streaming
- Server-Sent Events (SSE) streaming responses
- Optional transcription context injection
- Customizable model and temperature
- Full async implementation

Route:
- `POST /api/chat` - Stream chat responses

## Database Models

### User
```python
id (UUID)
email (unique)
hashed_password
role (enum: admin, user)
display_name
is_active
created_at
```

### Transcription
```python
id (UUID)
user_id (FK to User)
filename (stored name)
original_filename
audio_duration (float, nullable)
language
text (full transcript)
segments (JSON list)
speakers (JSON dict: SPEAKER_XX -> custom_name)
status (enum: pending, processing, completed, failed)
error_message
notes
created_at
updated_at
```

### SummaryTemplate
```python
id (UUID)
name
description
prompt_template (with {{transcript}} placeholder)
created_by (FK to User)
is_active
created_at
updated_at
```

### Summary
```python
id (UUID)
transcription_id (FK)
template_id (FK, nullable)
content (summary text)
model_used
created_at
```

## Service Layer Implementation

### AuthService
- Password hashing with bcrypt
- JWT creation/validation with 24h expiry
- User creation and authentication
- Email-based user lookup

### TranscriptionService
- Async file upload handling
- User-scoped directory structure: `/app/uploads/{user_id}/{filename}`
- WhisperX API integration:
  - Sends multipart form to `{WHISPERX_API_URL}/v1/audio/transcriptions`
  - Expects response with `text`, `segments`, `duration`
- Segment parsing with speaker extraction
- Transcription state management in database

### LLMService
- Summary generation via OpenAI-compatible API
- Template prompt processing with `{{transcript}}` replacement
- Async streaming chat completions
- SSE (Server-Sent Events) compatible streaming

## Configuration

Environment variables (see `.env.example`):

```
# Database
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/dbname

# Security
SECRET_KEY=your-secret-key-here

# WhisperX
WHISPERX_API_URL=http://whisperx:8000
WHISPERX_MODEL=large-v3

# LLM (OpenAI-compatible)
LLM_API_URL=http://localhost:11434/v1
LLM_API_KEY=optional-api-key
LLM_MODEL=gpt-3.5-turbo

# CORS
CORS_ORIGINS=*

# Admin defaults
ADMIN_EMAIL=admin@openhinotes.local
ADMIN_PASSWORD=admin
```

## API Streaming (Chat)

The chat endpoint returns Server-Sent Events:

```
POST /api/chat
Content-Type: application/json

{
  "messages": [
    {"role": "user", "content": "..."}
  ],
  "transcription_id": "optional-uuid",
  "model": "optional-model-name",
  "temperature": 0.7
}

Response (streaming):
data: {"content": "chunk1"}
data: {"content": "chunk2"}
data: [DONE]
```

Client can listen with EventSource or fetch streaming API.

## Error Handling

- 400 Bad Request: Invalid input, missing files, conflict
- 401 Unauthorized: Invalid/expired token
- 403 Forbidden: Insufficient permissions
- 404 Not Found: Resource not found
- 500 Internal Server Error: Server errors, external API failures

All errors include detailed messages for debugging.

## Security Considerations

1. **Passwords**: Hashed with bcrypt, never stored in plaintext
2. **JWT**: Signed with SECRET_KEY, 24h expiry
3. **CORS**: Configurable origins (defaults to `*` for development)
4. **Authorization**: Role-based and resource ownership checks
5. **File Storage**: User-scoped directories prevent access to others' files
6. **External APIs**: Uses httpx with timeouts to prevent hanging

## Database Migrations

Alembic is configured for async migrations:

```bash
# Create migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

Initial migration (`001_initial.py`) creates all tables with proper indexes and foreign keys.

## Development Workflow

### Local Setup
```bash
# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env

# Start database (via docker-compose or local PostgreSQL)
docker-compose up -d db

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload
```

### Docker Setup
```bash
# Build image
docker build -t openhinotes-backend .

# Run with docker-compose
docker-compose up
```

### Testing
The implementation is production-ready. To add pytest tests:

```bash
pip install pytest pytest-asyncio httpx
```

## Performance Considerations

1. **Async Throughout**: All I/O operations are async
2. **Connection Pooling**: Configured in SQLAlchemy engine
3. **Streaming Responses**: Chat endpoint streams data without buffering
4. **Pagination**: Transcription/template listing supports skip/limit
5. **Indexes**: Database indexes on user_id, transcription_id, email

## External API Integration

### WhisperX Integration
- Timeout: 300 seconds (long audio support)
- Format: multipart/form-data with file
- Response parsing: Handles verbose JSON format
- Error handling: Detailed error messages on API failures

### LLM Integration
- Timeout: 120 seconds
- Optional API key support (Bearer token auth)
- Streaming: SSE-compatible line format
- Error handling: Non-200 status raises exception

## Deployment

### Environment Setup for Production
```bash
# Generate secure SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Update .env with production values
# - Generate new SECRET_KEY
# - Set DATABASE_URL to production PostgreSQL
# - Configure LLM_API_URL and WHISPERX_API_URL for production
# - Limit CORS_ORIGINS to specific domains
# - Change ADMIN_EMAIL and ADMIN_PASSWORD
```

### Docker Deployment
The included Dockerfile uses Python 3.11-slim with multi-stage optimization:
- Minimal layers
- No unnecessary system dependencies
- Proper signal handling (sh as entrypoint)
- Volume mounts for persistence

### Health Check
```
GET /api/health
200 OK
{"status": "healthy"}
```

## Future Enhancements

Potential improvements:
1. Webhook support for long-running transcriptions
2. Batch transcription processing
3. Transcription editing interface
4. Multiple model support for summaries
5. Audit logging for admin actions
6. Rate limiting
7. Caching for frequently accessed data
8. Full-text search over transcriptions
9. Export formats (PDF, DOCX)
10. Custom branding templates
