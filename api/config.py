"""Environment and filesystem configuration for the API."""

from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def load_dotenv(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_dotenv(BASE_DIR / ".env")

DATA_DIR = BASE_DIR / "data"
SEARCH_ASSETS = {
    "metadata": DATA_DIR / "processed" / "merged_clean_final.csv",
    "vectors": DATA_DIR / "processed" / "keyphrases_vectors_FINAL.csv",
    "index": DATA_DIR / "index" / "faiss_index.bin",
    "urls": DATA_DIR / "index" / "faiss_urls.pkl",
}
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
GROQ_API_URL = os.getenv(
    "GROQ_API_URL",
    "https://api.groq.com/openai/v1/chat/completions",
)
SEARCH_TOP_K = int(os.getenv("SEARCH_TOP_K", "10"))
