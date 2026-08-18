import logging
import pickle
from pathlib import Path
from typing import Optional
from langchain_community.vectorstores import FAISS
from langchain.schema import Document
from rag.embeddings import get_embeddings
from config import settings

logger = logging.getLogger(__name__)

FAISS_INDEX_PATH = settings.VECTOR_STORE_DIR / "faiss_index"
METADATA_PATH = settings.VECTOR_STORE_DIR / "metadata.pkl"


class VectorRetriever:
    """
    Manages FAISS vector store: creation, persistence, and similarity search.
    
    HOW VECTOR SIMILARITY SEARCH WORKS:
    1. Documents are split into chunks and converted to dense vectors (embeddings)
       via a sentence-transformer model. Each vector is a point in 384-dimensional space.
    2. FAISS (Facebook AI Similarity Search) builds an index over these vectors.
    3. At query time, the question is embedded into the same vector space.
    4. FAISS finds the K nearest vectors to the query vector using cosine similarity
       (inner product after L2 normalization). This is O(log n) with HNSW indexing.
    5. The corresponding text chunks are returned as context for the LLM.
    
    Cosine similarity measures the angle between vectors — chunks semantically
    close to the question cluster nearby in embedding space, regardless of
    exact word overlap (unlike keyword search / BM25).
    """

    def __init__(self):
        self.vectorstore: Optional[FAISS] = None
        self.embeddings = get_embeddings()
        self._load_existing()

    def _load_existing(self):
        """Load persisted FAISS index if it exists."""
        if FAISS_INDEX_PATH.exists():
            try:
                logger.info("Loading existing FAISS index...")
                self.vectorstore = FAISS.load_local(
                    str(FAISS_INDEX_PATH),
                    self.embeddings,
                    allow_dangerous_deserialization=True,
                )
                logger.info(
                    f"FAISS index loaded with {self.vectorstore.index.ntotal} vectors."
                )
            except Exception as e:
                logger.warning(f"Failed to load FAISS index: {e}. Starting fresh.")
                self.vectorstore = None

    def add_documents(self, documents: list[Document]) -> int:
        """
        Embed documents and add to FAISS index.
        Returns total vector count after insertion.
        """
        if not documents:
            raise ValueError("No documents provided.")

        logger.info(f"Embedding and indexing {len(documents)} chunks...")

        if self.vectorstore is None:
            self.vectorstore = FAISS.from_documents(documents, self.embeddings)
        else:
            self.vectorstore.add_documents(documents)

        self._persist()
        total = self.vectorstore.index.ntotal
        logger.info(f"Indexed. Total vectors in store: {total}")
        return total

    def _persist(self):
        """Save FAISS index to disk."""
        if self.vectorstore:
            FAISS_INDEX_PATH.mkdir(parents=True, exist_ok=True)
            self.vectorstore.save_local(str(FAISS_INDEX_PATH))
            logger.info("FAISS index persisted to disk.")

    def similarity_search(
        self, query: str, k: int = None, score_threshold: float = None
    ) -> list[tuple[Document, float]]:
        """
        Perform similarity search and return (document, score) pairs.
        Scores are cosine similarity values in [0, 1] (higher = more relevant).
        """
        if self.vectorstore is None:
            raise RuntimeError(
                "Vector store is empty. Please upload documents first."
            )

        k = k or settings.TOP_K_RETRIEVAL
        threshold = score_threshold or settings.SIMILARITY_THRESHOLD

        results = self.vectorstore.similarity_search_with_relevance_scores(
            query, k=k
        )

        # Filter by similarity threshold to avoid irrelevant context
        filtered = [(doc, score) for doc, score in results if score >= threshold]

        if not filtered:
            logger.warning(
                f"No chunks above similarity threshold {threshold}. "
                "Returning top result anyway."
            )
            filtered = results[:1] if results else []

        logger.info(
            f"Retrieved {len(filtered)} chunks for query. "
            f"Scores: {[round(s, 3) for _, s in filtered]}"
        )
        return filtered

    def get_context(self, query: str) -> tuple[str, list[dict]]:
        """
        Build context string and source metadata for the LLM.
        Returns (context_text, sources_list).
        """
        results = self.similarity_search(query)

        context_parts = []
        sources = []

        for i, (doc, score) in enumerate(results, 1):
            context_parts.append(
                f"[Excerpt {i} — relevance: {score:.2f}]\n{doc.page_content.strip()}"
            )
            sources.append(
                {
                    "excerpt": i,
                    "source": doc.metadata.get("source", "Unknown"),
                    "page": doc.metadata.get("page", "N/A"),
                    "score": round(score, 3),
                    "preview": doc.page_content[:120] + "...",
                }
            )

        context = "\n\n".join(context_parts)
        return context, sources

    def has_documents(self) -> bool:
        return self.vectorstore is not None and self.vectorstore.index.ntotal > 0

    def get_stats(self) -> dict:
        if self.vectorstore is None:
            return {"total_vectors": 0, "has_index": False}
        return {
            "total_vectors": self.vectorstore.index.ntotal,
            "has_index": True,
            "index_path": str(FAISS_INDEX_PATH),
        }

    def clear(self):
        """Remove all vectors and delete persisted index."""
        self.vectorstore = None
        import shutil
        if FAISS_INDEX_PATH.exists():
            shutil.rmtree(FAISS_INDEX_PATH)
        logger.info("Vector store cleared.")


# Module-level singleton
_retriever: Optional[VectorRetriever] = None


def get_retriever() -> VectorRetriever:
    global _retriever
    if _retriever is None:
        _retriever = VectorRetriever()
    return _retriever
