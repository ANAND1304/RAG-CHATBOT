import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from rag.pipeline import get_pipeline

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    chat_history: list[ChatMessage] = Field(default_factory=list)
    stream: bool = False


class ChatResponse(BaseModel):
    answer: str
    sources: list[dict]
    context_used: bool
    chunks_retrieved: int = 0


@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Main chat endpoint. Performs RAG retrieval and LLM generation.
    
    Flow:
    1. Retrieve top-k relevant chunks from FAISS
    2. Inject context into prompt
    3. Generate grounded answer via LLM
    4. Return answer + source citations
    """
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    try:
        pipeline = get_pipeline()
        history = [{"role": m.role, "content": m.content} for m in request.chat_history]
        result = pipeline.answer(
            question=request.question.strip(),
            chat_history=history if history else None,
        )
        return ChatResponse(**result)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get("/health")
async def health():
    """Health check endpoint."""
    pipeline = get_pipeline()
    status = pipeline.get_status()
    return {
        "status": "ok",
        "has_documents": status["has_index"],
        "vector_count": status["total_vectors"],
    }
