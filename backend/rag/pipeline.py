import logging
import os
from pathlib import Path
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain.schema import Document
from rag.retriever import get_retriever
from rag.llm import build_prompt
from config import settings


print("Debug:" , settings.use_anthropic_api, settings)  # Debug print to verify settings

logger = logging.getLogger(__name__)


class RAGPipeline:
    """
    Full RAG pipeline:
    Document → Load → Chunk → Embed → Store → Retrieve → Prompt → LLM → Answer

    HOW RAG REDUCES HALLUCINATION:
    Traditional LLMs answer from parametric memory (weights), which can be
    stale, incomplete, or confidently wrong. RAG grounds the LLM by:
    1. Supplying retrieved factual excerpts as explicit context in the prompt
    2. Instructing the LLM to ONLY use that context (strict system prompt)
    3. If no relevant context is found, the LLM is told to say "I don't know"
       rather than invent an answer
    4. The similarity threshold ensures only genuinely relevant chunks are used
    5. Sources are returned so users can verify answers against originals

    This transforms the LLM from a "knowledgeable guesser" to a "reader and
    summarizer" — dramatically reducing fabrication while preserving fluency.
    """

    def __init__(self):
        self.retriever = get_retriever()
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
            separators=["\n\n", "\n", ". ", "! ", "? ", " ", ""],
            length_function=len,
        )

        # Lazy-load LLM only if not using API
        self._llm = None

    def _get_llm(self):
        if self._llm is None and not settings.use_anthropic_api:
            from rag.llm import get_llm
            self._llm = get_llm()
            logger.info("Loaded local HuggingFace LLM")
        return self._llm

    def load_and_index_document(self, file_path: str | Path) -> dict:
        """
        Full ingestion pipeline for a single document.
        Returns stats about chunks indexed.
        """
        file_path = Path(file_path)
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        suffix = file_path.suffix.lower()

        # Step 1: Load
        logger.info(f"Loading document: {file_path.name}")
        if suffix == ".pdf":
            loader = PyPDFLoader(str(file_path))
            raw_docs = loader.load()
        elif suffix in (".txt", ".md"):
            loader = TextLoader(str(file_path), encoding="utf-8")
            raw_docs = loader.load()
        else:
            raise ValueError(f"Unsupported file type: {suffix}")

        # Enrich metadata
        for doc in raw_docs:
            doc.metadata["source"] = file_path.name
            doc.metadata["file_path"] = str(file_path)

        # Step 2: Chunk (split into overlapping windows)
        logger.info(f"Splitting {len(raw_docs)} pages into chunks...")
        chunks: list[Document] = self.text_splitter.split_documents(raw_docs)
        logger.info(f"Created {len(chunks)} chunks from {file_path.name}")

        # Step 3: Embed + Store in FAISS
        total_vectors = self.retriever.add_documents(chunks)

        return {
            "filename": file_path.name,
            "pages": len(raw_docs),
            "chunks": len(chunks),
            "total_indexed_vectors": total_vectors,
        }

    def answer(
        self,
        question: str,
        chat_history: list[dict] = None,
        stream: bool = False,
    ) -> dict:
        """
        Full RAG query pipeline:
        1. Retrieve top-k relevant chunks from FAISS
        2. Build grounded prompt (system + context + history + question)
        3. Generate answer via LLM
        4. Return answer + sources for transparency
        """
        if not self.retriever.has_documents():
            return {
                "answer": "No documents have been uploaded yet. Please upload a PDF or TXT file first.",
                "sources": [],
                "context_used": False,
            }

        # Step 1: Retrieve
        logger.info(f"Processing query: {question[:80]}...")
        context, sources = self.retriever.get_context(question)

        if not context:
            return {
                "answer": "I don't have enough information in the uploaded documents to answer this question.",
                "sources": [],
                "context_used": False,
            }

        # Step 2: Build prompt
        prompt = build_prompt(context, question, chat_history)

        # Step 3: Generate answer
        logger.info("Generating answer...")
        try:
            logger.info("Using local Ollama Qwen2.5 3B for generation")

            import httpx

            response = httpx.post(
                "http://localhost:11434/api/generate",
                json={
                    "model": "qwen2.5:3b-instruct",
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.1,
                        "top_p": 0.95,
                    },
                },
                timeout=120.0,
            )
            response.raise_for_status()

            data = response.json()
            answer_text = _clean_response(data["response"])
        except Exception as e:
            logger.error(f"LLM generation error: {e}")
            raise RuntimeError(f"Answer generation failed: {str(e)}")

        return {
            "answer": answer_text,
            "sources": sources,
            "context_used": True,
            "chunks_retrieved": len(sources),
        }

    def clear_knowledge_base(self):
        """Remove all indexed vectors and uploaded documents."""
        self.retriever.clear()
        # Optionally remove uploaded files
        for f in settings.DOCUMENTS_DIR.iterdir():
            if f.is_file():
                f.unlink()
        logger.info("Knowledge base cleared.")

    def get_status(self) -> dict:
        stats = self.retriever.get_stats()
        docs = list(settings.DOCUMENTS_DIR.iterdir())
        return {
            **stats,
            "uploaded_documents": [f.name for f in docs if f.is_file()],
            "document_count": len([f for f in docs if f.is_file()]),
            "llm_backend": "anthropic_api" if settings.use_anthropic_api else "local_huggingface",
            "embedding_model": settings.EMBEDDING_MODEL,
            "chunk_size": settings.CHUNK_SIZE,
            "top_k": settings.TOP_K_RETRIEVAL,
        }


def _clean_response(text: str) -> str:
    """Strip common model artifacts from generated text."""
    # Remove common instruction-following artifacts
    for marker in ["ANSWER:", "Answer:", "USER QUESTION:", "CONTEXT:"]:
        if marker in text:
            text = text.split(marker)[-1]

    # Strip leading/trailing whitespace and quotes
    text = text.strip().strip('"').strip("'")

    return text


# Module-level singleton
_pipeline: RAGPipeline | None = None


def get_pipeline() -> RAGPipeline:
    global _pipeline
    if _pipeline is None:
        _pipeline = RAGPipeline()
    return _pipeline
