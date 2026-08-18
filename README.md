# 🤖 RAG Chatbot — Document Q&A with Retrieval-Augmented Generation

A production-ready AI chatbot that answers questions from your uploaded documents using RAG. Zero hallucinations by design.

```
Upload PDF/TXT → Embed → FAISS Index → Retrieve → LLM → Grounded Answer + Sources
```

---

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    React Frontend                   │
│  FileUpload │ ChatInput │ ChatBubbles │ Sources UI  │
└──────────────────────┬──────────────────────────────┘
                       │ REST API (JSON)
┌──────────────────────▼──────────────────────────────┐
│              FastAPI Backend                        │
│                                                     │
│  POST /api/documents/upload                         │
│    → PyPDF/TextLoader → RecursiveTextSplitter       │
│    → HuggingFace Embeddings (all-MiniLM-L6-v2)      │
│    → FAISS Vector Store (persisted to disk)         │
│                                                     │
│  POST /api/chat/                                    │
│    → Embed query → FAISS similarity_search(top-k)   │
│    → Build grounded prompt (system + context + q)   │
│    → LLM (Mistral-7B or Anthropic API)              │
│    → Return answer + source citations               │
└─────────────────────────────────────────────────────┘
```

---

## 🧠 How RAG Reduces Hallucination

| Traditional LLM | RAG-powered LLM |
|---|---|
| Answers from parametric memory (weights) | Answers ONLY from retrieved document context |
| Can confabulate confidently | Forced to cite sources or say "I don't know" |
| Static knowledge cutoff | Live knowledge from YOUR documents |
| No transparency | Sources shown for every answer |

**The mechanism:**
1. Retrieved chunks are injected into the prompt as explicit context
2. System prompt strictly forbids using outside knowledge
3. Similarity threshold filters irrelevant/low-confidence chunks
4. If no relevant context found → model says "I don't know" (not guesses)

---

## 🔍 How Vector Similarity Search Works

```
Document chunk: "Revenue grew 12% in Q3"
         ↓  HuggingFace all-MiniLM-L6-v2
Embedding: [0.23, -0.71, 0.08, ..., 0.44]  ← 384-dim vector

User query: "What was Q3 performance?"
         ↓  same model
Query vec: [0.19, -0.68, 0.11, ..., 0.41]  ← very close in vector space!

FAISS: inner_product(normalize(query), normalize(chunk)) = 0.94  ✅ High match
```

FAISS stores all chunk vectors in a flat index (or HNSW for scale). At query time it computes cosine similarity between the query vector and all chunk vectors, returning the K most similar. This is semantic matching — it understands that "Q3 performance" and "revenue grew" are related, unlike keyword search.

---

## 📁 Project Structure

```
rag-chatbot/
├── backend/
│   ├── app.py                  # FastAPI app, CORS, lifespan
│   ├── config.py               # Pydantic settings, env vars
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env.example
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── chat.py             # POST /api/chat/
│   │   └── documents.py        # POST /api/documents/upload, etc.
│   ├── rag/
│   │   ├── __init__.py
│   │   ├── pipeline.py         # RAG orchestrator (load→chunk→embed→retrieve→answer)
│   │   ├── retriever.py        # FAISS vector store wrapper
│   │   ├── embeddings.py       # HuggingFace embeddings (cached)
│   │   └── llm.py              # LLM loader + prompt engineering
│   ├── services/               # (extend here: auth, rate-limiting, etc.)
│   └── utils/                  # (extend here: file validation, logging, etc.)
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tailwind.config.js
│   └── src/
│       ├── App.js
│       ├── index.js
│       ├── index.css
│       ├── api.js              # Axios API client
│       ├── hooks/
│       │   ├── useChat.js      # Chat state + history management
│       │   └── useDocuments.js # Document upload + KB status
│       ├── components/
│       │   ├── FileUpload.jsx  # Dropzone + progress + stats
│       │   ├── ChatMessage.jsx # Bubbles + markdown + sources
│       │   ├── ChatInput.jsx   # Auto-resize textarea + send
│       │   ├── Sidebar.jsx     # Collapsible sidebar
│       │   └── TypingIndicator.jsx
│       └── pages/
│           └── ChatPage.jsx    # Main layout + empty state
│
├── data/
│   ├── documents/              # Uploaded files stored here
│   └── vector_store/           # Persisted FAISS index
│
├── docker-compose.yml
└── README.md
```

---

## ⚡ Quick Start

### Option A: Anthropic API backend (recommended, no GPU needed)

**1. Clone and configure**
```bash
git clone <repo>
cd rag-chatbot/backend
cp .env.example .env
```

Edit `.env`:
```env
USE_ANTHROPIC_API=true
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

**2. Run backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

**3. Run frontend**
```bash
cd frontend
npm install
npm start
# Opens http://localhost:3000
```

---

### Option B: Local HuggingFace LLM (requires ~14GB RAM or GPU)

Edit `.env`:
```env
USE_ANTHROPIC_API=false
LLM_MODEL=mistralai/Mistral-7B-Instruct-v0.2
USE_4BIT=true      # Requires GPU + bitsandbytes
```

> ⚠️ First run downloads ~14GB. Set `HUGGINGFACE_HUB_TOKEN` for gated models.

Same run commands as Option A.

---

### Option C: Docker Compose (full stack)

```bash
# Set your API key
export ANTHROPIC_API_KEY=sk-ant-your-key-here

# Build and run
docker-compose up --build

# Frontend: http://localhost:3000
# Backend API docs: http://localhost:8000/docs
```

---

## 🔌 API Reference

### Upload Document
```http
POST /api/documents/upload
Content-Type: multipart/form-data

file: <PDF or TXT file>

Response:
{
  "success": true,
  "message": "Document 'report.pdf' uploaded and indexed successfully.",
  "stats": { "filename": "report.pdf", "pages": 12, "chunks": 48, "total_indexed_vectors": 48 }
}
```

### Chat
```http
POST /api/chat/
Content-Type: application/json

{
  "question": "What were the Q3 revenue figures?",
  "chat_history": [
    { "role": "user", "content": "Tell me about the company" },
    { "role": "assistant", "content": "The company was founded in..." }
  ]
}

Response:
{
  "answer": "According to the document, Q3 revenue was $4.2 billion...",
  "sources": [
    {
      "excerpt": 1,
      "source": "annual_report.pdf",
      "page": 7,
      "score": 0.912,
      "preview": "Q3 revenue reached $4.2 billion, a 12% year-over-year increase..."
    }
  ],
  "context_used": true,
  "chunks_retrieved": 3
}
```

### Other Endpoints
```http
GET  /api/documents/list      # List uploaded documents
GET  /api/documents/status    # KB stats (vector count, model info)
DELETE /api/documents/clear   # Wipe all documents + FAISS index
GET  /api/chat/health         # Health check
GET  /docs                    # Swagger UI (auto-generated)
```

---

## ⚙️ Configuration Reference

| Variable | Default | Description |
|---|---|---|
| `USE_ANTHROPIC_API` | `true` | Use Anthropic API instead of local LLM |
| `ANTHROPIC_API_KEY` | — | Your Anthropic API key |
| `LLM_MODEL` | `mistralai/Mistral-7B-Instruct-v0.2` | HuggingFace model ID |
| `EMBEDDING_MODEL` | `sentence-transformers/all-MiniLM-L6-v2` | Embedding model |
| `CHUNK_SIZE` | `512` | Characters per document chunk |
| `CHUNK_OVERLAP` | `64` | Overlap between consecutive chunks |
| `TOP_K_RETRIEVAL` | `4` | Number of chunks retrieved per query |
| `SIMILARITY_THRESHOLD` | `0.3` | Minimum cosine similarity to use a chunk |
| `USE_4BIT` | `true` | 4-bit quantization (GPU only) |

---

## 🎯 Prompt Engineering Strategy

The system prompt uses three techniques to minimize hallucination:

1. **Hard constraint**: "Answer ONLY using information explicitly stated in the context"
2. **Fallback instruction**: "If the context does not contain enough information → say 'I don't know'"
3. **Few-shot examples**: Three examples demonstrate correct behavior for found/not-found cases

```
SYSTEM_PROMPT
├── Hard rules (5 numbered constraints)
├── Few-shot examples (3: found / not-found / partial)
└── Context injection (top-k retrieved chunks with relevance scores)
     └── Chat history (last 4 messages for conversation memory)
          └── User question
```

---

## 🔧 Extending the Project

**Add more file types:**
Edit `pipeline.py` → add loader for `.docx`, `.csv`, `.html`, etc.

**Add streaming responses:**
Use `StreamingResponse` in FastAPI + `TextIteratorStreamer` from HuggingFace transformers.

**Scale the vector store:**
Replace FAISS flat index with `Chroma`, `Pinecone`, or `Weaviate` for millions of vectors.

**Add authentication:**
Add `fastapi-users` or JWT middleware in `app.py`.

**Improve chunking:**
Try semantic chunking (split on sentence boundaries) via `langchain_experimental.text_splitter.SemanticChunker`.

---

## 🐛 Troubleshooting

| Problem | Fix |
|---|---|
| `CUDA out of memory` | Set `USE_4BIT=true` or switch to `USE_ANTHROPIC_API=true` |
| `Model not found` | Set `HUGGINGFACE_HUB_TOKEN` for gated models |
| `Slow first response` | Normal — embedding model loads on first request (~30s) |
| `CORS error` | Add your frontend URL to `ALLOWED_ORIGINS` in config.py |
| `No context found` | Lower `SIMILARITY_THRESHOLD` to 0.1, or try re-phrasing |
| Frontend can't reach API | Check `REACT_APP_API_URL` in `.env` or use `"proxy"` in package.json |

---

## 📦 Tech Stack Summary

| Layer | Technology | Why |
|---|---|---|
| API Framework | FastAPI | Async, fast, auto-docs |
| RAG Framework | LangChain | Document loaders, splitters, chains |
| Vector DB | FAISS (CPU) | No infra, fast, persistent |
| Embeddings | all-MiniLM-L6-v2 | 384-dim, 80MB, excellent quality |
| LLM (local) | Mistral-7B-Instruct | Best open-source instruction model |
| LLM (API) | Claude (Anthropic) | Highest quality, no GPU needed |
| Frontend | React + Tailwind | Fast, modern, responsive |
| Containerization | Docker Compose | One-command deployment |
