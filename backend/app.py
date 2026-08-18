import logging
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from routes import documents_router, chat_router
from config import settings

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup/shutdown lifecycle."""
    logger.info("=" * 60)
    logger.info(f"  {settings.APP_NAME} — RAG Backend Starting")
    logger.info(f"  Embedding model : {settings.EMBEDDING_MODEL}")
    logger.info(f"  Vector store    : {settings.VECTOR_STORE_DIR}")
    logger.info(f"  Documents dir   : {settings.DOCUMENTS_DIR}")
    logger.info("=" * 60)

    # Pre-warm embeddings model on startup
    from rag.embeddings import get_embeddings
    logger.info("Pre-loading embedding model...")
    get_embeddings()
    logger.info("Embedding model ready.")

    yield

    logger.info("Shutting down RAG backend.")


app = FastAPI(
    title="RAG Chatbot API",
    description="Document Q&A powered by Retrieval-Augmented Generation",
    version="1.0.0",
    lifespan=lifespan,
)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Routers
app.include_router(documents_router, prefix="/api")
app.include_router(chat_router, prefix="/api")


@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/chat/health",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info",
    )
