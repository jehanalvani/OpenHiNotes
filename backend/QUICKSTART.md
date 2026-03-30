# OpenHiNotes Backend - Quick Start

## 5-Minute Setup

### Prerequisites
- Python 3.11+
- PostgreSQL 13+
- Or Docker & Docker Compose

### Option 1: Local Development

```bash
# 1. Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Set up environment
cp .env.example .env

# 4. Start PostgreSQL (ensure it's running)
# - Local: psql default on localhost:5432
# - Or use: docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:15

# 5. Run migrations
alembic upgrade head

# 6. Start server
uvicorn app.main:app --reload

# Server running at http://localhost:8000
# API docs at http://localhost:8000/docs
```

### Option 2: Docker Compose

```bash
# 1. Set up environment
cp .env.example .env

# 2. Start all services
docker-compose up

# 3. Server running at http://localhost:8000
```

## First Steps

### 1. Admin Login
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@openhinotes.local",
    "password": "admin"
  }'
```

Save the `access_token` from response.

### 2. Create User
```bash
TOKEN="your-token-here"
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "display_name": "John Doe"
  }'
```

### 3. Upload Audio & Transcribe
```bash
TOKEN="user-token-here"
curl -X POST http://localhost:8000/api/transcriptions/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/audio.mp3" \
  -F "language=en"
```

### 4. Create Summary Template (Admin)
```bash
TOKEN="admin-token-here"
curl -X POST http://localhost:8000/api/templates \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Executive Summary",
    "description": "Brief summary for executives",
    "prompt_template": "Summarize the following transcript in 3 bullet points:\n\n{{transcript}}",
    "is_active": true
  }'
```

### 5. Generate Summary
```bash
TOKEN="user-token-here"
TRANSCRIPTION_ID="uuid-from-upload"
TEMPLATE_ID="uuid-from-template-creation"

curl -X POST http://localhost:8000/api/summaries \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transcription_id": "'$TRANSCRIPTION_ID'",
    "template_id": "'$TEMPLATE_ID'"
  }'
```

### 6. Chat with Streaming
```bash
TOKEN="user-token-here"

curl -X POST http://localhost:8000/api/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "What is this about?"}
    ],
    "transcription_id": "optional-uuid"
  }'
```

## API Documentation

Interactive API docs available at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Common Issues

### Database Connection Error
```
sqlalchemy.exc.ArgumentError: Could not parse rfc1738 URL
```
**Fix**: Check DATABASE_URL in `.env` is valid PostgreSQL URL

### WhisperX Not Available
```
HTTPError: WhisperX API error: 503
```
**Fix**: Ensure WhisperX service is running at WHISPERX_API_URL

### LLM API Not Found
```
HTTPError: LLM API error: 503
```
**Fix**: Ensure LLM service (Ollama/OpenAI) is running at LLM_API_URL

### Port Already in Use
```
Address already in use
```
**Fix**: Change port in startup or kill process: `lsof -i :8000 | grep LISTEN | awk '{print $2}' | xargs kill`

## File Upload

Supported formats: MP3, WAV, M4A, OGG, FLAC (via WhisperX)

Max file size: Limited by server config (typically 100MB+)

Files stored in: `/app/uploads/{user_id}/{filename}`

## Environment Variables

Key variables for development:

```bash
# Required
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/openhinotes
SECRET_KEY=dev-secret-key-change-in-production

# Optional (defaults shown)
WHISPERX_API_URL=http://whisperx:8000
WHISPERX_MODEL=large-v3
LLM_API_URL=http://localhost:11434/v1
LLM_MODEL=gpt-3.5-turbo
ADMIN_EMAIL=admin@openhinotes.local
ADMIN_PASSWORD=admin
```

## Production Deployment

1. Generate secure SECRET_KEY:
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

2. Update `.env` with production values

3. Set strong ADMIN_PASSWORD

4. Use production PostgreSQL database

5. Enable SSL/TLS (via reverse proxy like nginx)

6. Run migrations: `alembic upgrade head`

7. Start with: `uvicorn app.main:app --host 0.0.0.0 --port 8000`

## Next Steps

- Read [README.md](README.md) for detailed API documentation
- Read [DEVELOPMENT.md](DEVELOPMENT.md) for architecture details
- Check [.env.example](.env.example) for all available configuration options
- Review [app/main.py](app/main.py) for application structure
- Explore [app/routers/](app/routers/) for endpoint implementations

## Support

For issues or questions:
1. Check API docs at `/docs`
2. Review logs for detailed error messages
3. Check README.md for configuration guide
4. Review DEVELOPMENT.md for implementation details
