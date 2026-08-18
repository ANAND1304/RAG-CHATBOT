import logging
from functools import lru_cache
from langchain_huggingface import HuggingFaceEmbeddings
from config import settings

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_embeddings() -> HuggingFaceEmbeddings:
    """
    Load and cache HuggingFace sentence-transformer embeddings.
    Uses all-MiniLM-L6-v2: 384-dimensional, fast, high quality for semantic search.
    """
    logger.info(f"Loading embedding model: {settings.EMBEDDING_MODEL}")
    embeddings = HuggingFaceEmbeddings(
        model_name=settings.EMBEDDING_MODEL,
        model_kwargs={"device": "cpu"},
        encode_kwargs={
            "normalize_embeddings": True,  # Cosine similarity optimization
            "batch_size": 32,
        },
    )
    logger.info("Embedding model loaded successfully.")
    return embeddings
