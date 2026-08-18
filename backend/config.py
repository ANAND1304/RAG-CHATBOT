from pydantic_settings import BaseSettings
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    # App
    APP_NAME: str = "RAG Chatbot"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8000

# LLM Backend
    use_anthropic_api: bool = False
    anthropic_api_key: str  = ""

    # Paths
    DATA_DIR: Path = BASE_DIR / "data"
    DOCUMENTS_DIR: Path = BASE_DIR / "data" / "documents"
    VECTOR_STORE_DIR: Path = BASE_DIR / "data" / "vector_store"

    # Embeddings
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"

    # LLM (HuggingFace)
    LLM_MODEL: str = "google/flan-t5-base"  # Example: "google/flan-t5-xxl" or "NousResearch/Hermes-2-Pro-Mistral-7B-GGUF"
    LLM_MAX_NEW_TOKENS: int = 512
    LLM_TEMPERATURE: float = 0.1
    LLM_TOP_P: float = 0.95
    USE_4BIT: bool = True  # Quantization for memory efficiency

    # RAG
    CHUNK_SIZE: int = 512
    CHUNK_OVERLAP: int = 64
    TOP_K_RETRIEVAL: int = 4
    SIMILARITY_THRESHOLD: float = 0.3

    # CORS
    ALLOWED_ORIGINS: list = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

# Ensure directories exist
settings.DOCUMENTS_DIR.mkdir(parents=True, exist_ok=True)
settings.VECTOR_STORE_DIR.mkdir(parents=True, exist_ok=True)
