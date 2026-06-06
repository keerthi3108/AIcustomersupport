# SupportAI — AI Customer Support Automation Platform

Production-style SaaS application with **React**, **FastAPI**, **MongoDB Atlas**, **ChromaDB**, and **Google Gemini**. Optimized for **Render Free Tier (512 MB RAM)** — no Redis, Celery, Docker, or local LLMs.

## Data storage

| Layer | Technology | Purpose |
|-------|------------|---------|
| Application data | **MongoDB Atlas** | Users, tickets, knowledge metadata, audit logs |
| Vector search | **ChromaDB** (local files) | Semantic RAG embeddings & retrieval |

## Features

- JWT authentication with role-based access (user / admin)
- Ticket management with AI classification, sentiment analysis, and RAG-grounded responses
- Knowledge base (20–50 documents) with semantic retrieval and source citations
- SLA tracking and breach detection
- Admin analytics dashboard and evaluation metrics
- Modern enterprise UI (plain CSS, blue/indigo theme)

## Prerequisites

- Python 3.11+
- Node.js 18+
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster (free tier works)
- [Google Gemini API key](https://aistudio.google.com/apikey)

## Quick Start (Local)

### 1. MongoDB Atlas

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. **Database Access** → create a user with read/write on your database
3. **Network Access** → add your IP (or `0.0.0.0/0` for dev only)
4. **Connect** → copy the connection string (`mongodb+srv://...`)

### 2. Backend

```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Edit `.env`:

```env
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=ticket_rag
SECRET_KEY=your-secret-key
GEMINI_API_KEY=your-gemini-api-key
CORS_ORIGINS=http://localhost:5173
```

### 3. Build ChromaDB (local only)

Embeddings are generated on your machine; commit/deploy the `backend/chroma_db` folder.

```bash
cd backend
python scripts/build_chroma.py
python scripts/seed_knowledge_metadata.py
```

### 4. Run API

```bash
uvicorn main:app --reload --port 8000
```

Default admin (auto-seeded on startup): `admin@supportai.io` / `Admin@12345`

Health check: `GET /api/health` includes MongoDB connection status.

### 5. Frontend

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Open http://localhost:5173

## Deployment

### Backend — Render (Free)

1. New **Web Service** → root directory `backend`
2. Build: `pip install -r requirements.txt`
3. Start: `uvicorn main:app --host 0.0.0.0 --port $PORT --workers 1`
4. Environment variables:
   - `MONGODB_URI` — Atlas connection string
   - `MONGODB_DB_NAME` — e.g. `ticket_rag`
   - `GEMINI_API_KEY`, `SECRET_KEY`, `CORS_ORIGINS`
5. Commit `chroma_db/` (built locally) for RAG

Use **1 worker** only to stay within 512 MB RAM.

### Frontend — Vercel

- Root: `frontend`
- Env: `VITE_API_URL=https://your-api.onrender.com/api`

## MongoDB collections

- `users` — accounts & roles
- `tickets` — tickets with embedded `messages` and `sources`
- `knowledge_documents` — uploaded file metadata
- `audit_logs` — security audit trail
- `counters` — auto-increment IDs

## RAG pipeline

1. Ticket text → **ChromaDB** semantic search (top-K)
2. Retrieved chunks + context → **Gemini** (grounded generation)
3. Sources saved on the ticket document in MongoDB

## License

MIT — Final year project / portfolio use.
