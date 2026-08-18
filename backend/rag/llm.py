import logging
from functools import lru_cache
from langchain_huggingface import HuggingFacePipeline
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline, BitsAndBytesConfig
import torch
from config import settings

logger = logging.getLogger(__name__)

# Carefully engineered system prompt to minimize hallucinations
SYSTEM_PROMPT = """You are a precise document assistant. Your ONLY job is to answer questions based strictly on the provided context excerpts from uploaded documents.

STRICT RULES:
1. Answer ONLY using information explicitly stated in the context below.
2. If the context does not contain enough information to answer the question, respond with: "I don't have enough information in the uploaded documents to answer this question."
3. NEVER make up facts, statistics, names, dates, or any information not present in the context.
4. NEVER use your general knowledge — only the context matters.
5. If the answer is partially present, provide what you can and clearly state what is missing.
6. Be concise and factual. Cite which part of the context supports your answer when helpful.

---
FEW-SHOT EXAMPLES:

Context: "The Eiffel Tower was built between 1887 and 1889. It stands 330 meters tall."
Question: When was the Eiffel Tower built?
Answer: The Eiffel Tower was built between 1887 and 1889.

Context: "Python is a high-level programming language created by Guido van Rossum."
Question: What is the capital of France?
Answer: I don't have enough information in the uploaded documents to answer this question.

Context: "The company's revenue in Q3 2023 was $4.2 billion, a 12% increase year-over-year."
Question: What was the revenue growth?
Answer: The company's revenue grew 12% year-over-year, reaching $4.2 billion in Q3 2023.

---
Now answer the user's question using ONLY the context provided below:
"""


def build_prompt(context: str, question: str, chat_history: list[dict] = None) -> str:
    """Build a structured prompt with context, history, and question."""
    history_text = ""
    if chat_history:
        recent = chat_history[-4:]  # last 2 exchanges
        for msg in recent:
            role = "User" if msg["role"] == "user" else "Assistant"
            history_text += f"{role}: {msg['content']}\n"

    prompt = f"""{SYSTEM_PROMPT}

CONTEXT FROM DOCUMENTS:
{context}

{"RECENT CONVERSATION:" + chr(10) + history_text if history_text else ""}
USER QUESTION: {question}

ANSWER:"""
    return prompt


@lru_cache(maxsize=1)
def get_llm() -> HuggingFacePipeline:
    """
    Load the LLM with optional 4-bit quantization.
    Defaults to Mistral-7B-Instruct for best quality/speed tradeoff.
    """
    logger.info(f"Loading LLM: {settings.LLM_MODEL}")

    tokenizer = AutoTokenizer.from_pretrained(
        settings.LLM_MODEL,
        trust_remote_code=True,
    )

    if settings.USE_4BIT and torch.cuda.is_available():
        quantization_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_compute_dtype=torch.float16,
            bnb_4bit_use_double_quant=True,
        )
        model = AutoModelForCausalLM.from_pretrained(
            settings.LLM_MODEL,
            quantization_config=quantization_config,
            device_map="auto",
            trust_remote_code=True,
        )
    else:
        model = AutoModelForCausalLM.from_pretrained(
            settings.LLM_MODEL,
            torch_dtype=torch.float32,
            device_map="cpu",
            trust_remote_code=True,
            low_cpu_mem_usage=True,
        )

    pipe = pipeline(
        "text-generation",
        model=model,
        tokenizer=tokenizer,
        max_new_tokens=settings.LLM_MAX_NEW_TOKENS,
        temperature=settings.LLM_TEMPERATURE,
        top_p=settings.LLM_TOP_P,
        do_sample=True,
        repetition_penalty=1.15,
        return_full_text=False,  # Only return the generated part
    )

    llm = HuggingFacePipeline(pipeline=pipe)
    logger.info("LLM loaded successfully.")
    return llm


def generate_with_claude_api(context: str, question: str, chat_history: list[dict] = None) -> str:
    """
    Alternative: Use Anthropic API as the LLM backend.
    Set USE_ANTHROPIC_API=true in .env to use this instead of local LLM.
    """
    import httpx

    api_key = settings.anthropic_api_key
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY not set")

    prompt = build_prompt(context, question, chat_history)

    response = httpx.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        json={
            "model": "claude-haiku-4-5-20251001",
            "max_tokens": settings.LLM_MAX_NEW_TOKENS,
            "messages": [{"role": "user", "content": prompt}],
        },
        timeout=60.0,
    )
    if response.status_code != 200:
        logger.error("Anthropic API error %s: %s", response.status_code, response.text)
        raise RuntimeError(
            f"Anthropic API error {response.status_code}: {response.text}"
        )

    data = response.json()
    return data["content"][0]["text"]