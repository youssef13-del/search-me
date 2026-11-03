"""FastAPI entry point for local paper search and Groq synthesis."""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

from api.config import SEARCH_TOP_K
from search.services import (
    SEARCH_SERVICE,
    analyze_with_groq,
    chat_with_groq,
    clear_pdf_cache,
    compare_with_groq,
    get_pdf_cache_stats,
)

app = FastAPI(
    title="Search Me API",
    description="Local semantic paper retrieval with Groq synthesis.",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500)
    top_k: int = Field(default=min(SEARCH_TOP_K, 5), ge=1, le=25)

    @field_validator("query")
    @classmethod
    def validate_query(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Query must contain at least one non-whitespace character")
        return value


class AnalyzeRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500)
    papers: list[dict[str, Any]] = Field(min_length=1, max_length=5)

    @field_validator("query")
    @classmethod
    def validate_query(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Query must contain at least one non-whitespace character")
        return value


class CompareRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500)
    papers: list[dict[str, Any]] = Field(min_length=2, max_length=5)

    @field_validator("query")
    @classmethod
    def validate_query(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Query must contain at least one non-whitespace character")
        return value


class ChatMessage(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(min_length=1, max_length=1200)


class ChatRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500)
    research_query: str | None = Field(default=None, max_length=500)
    papers: list[dict[str, Any]] = Field(min_length=1, max_length=5)
    messages: list[ChatMessage] = Field(default_factory=list, max_length=8)

    @field_validator("query")
    @classmethod
    def validate_query(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Query must contain at least one non-whitespace character")
        return value


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/search/")
def search(request: SearchRequest) -> dict[str, list[dict[str, Any]]]:
    try:
        return {"results": SEARCH_SERVICE.search(request.query.strip(), min(request.top_k, 5))}
    except (FileNotFoundError, RuntimeError, ValueError) as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


@app.post("/api/search/analyze/")
def analyze(request: AnalyzeRequest) -> dict[str, list[dict[str, Any]]]:
    try:
        return {"analyses": analyze_with_groq(request.query.strip(), request.papers[:5])}
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


@app.post("/api/search/compare/")
def compare(request: CompareRequest) -> dict[str, str]:
    try:
        return {"comparison": compare_with_groq(request.query.strip(), request.papers[:5])}
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


@app.post("/api/search/chat/")
def chat(request: ChatRequest) -> dict[str, Any]:
    try:
        return chat_with_groq(
            request.query.strip(),
            request.papers[:5],
            [message.model_dump() for message in request.messages],
            (request.research_query or "").strip(),
        )
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


@app.get("/api/cache/")
def cache_stats() -> dict[str, Any]:
    return get_pdf_cache_stats()


@app.delete("/api/cache/")
def clear_cache() -> dict[str, int]:
    return {"deleted": clear_pdf_cache()}
