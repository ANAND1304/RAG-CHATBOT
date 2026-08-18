import logging
import shutil
from pathlib import Path
from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from rag.pipeline import get_pipeline
from config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documents", tags=["documents"])

ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md"}
MAX_FILE_SIZE_MB = 50


@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    Upload and index a PDF or TXT document.
    The file is loaded, chunked, embedded, and stored in FAISS.
    """
    # Validate extension
    suffix = Path(file.filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{suffix}'. Allowed: {ALLOWED_EXTENSIONS}",
        )

    # Save file to disk
    dest = settings.DOCUMENTS_DIR / file.filename
    try:
        with dest.open("wb") as buffer:
            content = await file.read()
            # Check file size
            size_mb = len(content) / (1024 * 1024)
            if size_mb > MAX_FILE_SIZE_MB:
                raise HTTPException(
                    status_code=413,
                    detail=f"File too large ({size_mb:.1f} MB). Max: {MAX_FILE_SIZE_MB} MB",
                )
            buffer.write(content)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File save error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    # Index the document
    try:
        pipeline = get_pipeline()
        stats = pipeline.load_and_index_document(dest)
    except Exception as e:
        dest.unlink(missing_ok=True)
        logger.error(f"Indexing error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to index document: {str(e)}")

    return JSONResponse(
        content={
            "success": True,
            "message": f"Document '{file.filename}' uploaded and indexed successfully.",
            "stats": stats,
        }
    )


@router.get("/list")
async def list_documents():
    """List all uploaded documents."""
    docs = []
    for f in settings.DOCUMENTS_DIR.iterdir():
        if f.is_file() and f.suffix.lower() in ALLOWED_EXTENSIONS:
            stat = f.stat()
            docs.append(
                {
                    "name": f.name,
                    "size_kb": round(stat.st_size / 1024, 1),
                    "type": f.suffix.lstrip(".").upper(),
                }
            )
    return {"documents": docs, "count": len(docs)}


@router.delete("/clear")
async def clear_documents():
    """Remove all uploaded documents and clear the vector store."""
    try:
        pipeline = get_pipeline()
        pipeline.clear_knowledge_base()
        return {"success": True, "message": "All documents and vector store cleared."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def get_status():
    """Get the current state of the knowledge base."""
    pipeline = get_pipeline()
    return pipeline.get_status()
