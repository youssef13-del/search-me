# Search Me

Search Me is a local semantic search interface for the preserved research-paper collection.
It uses the corrected CSV files and existing FAISS index included in `data/`; it does not scrape
arXiv during searches.

The local FAISS index and large vector/source exports are intentionally excluded from GitHub
because GitHub rejects files over 100 MB. Keep or regenerate these local assets before running
semantic search from a fresh clone.

## Project layout

```text
data/
  raw/merged_all.csv
  processed/merged_clean_final.csv
  processed/keyphrases_vectors_FINAL.csv
  index/faiss_index.bin
  index/faiss_urls.pkl
api/                     FastAPI application and configuration
search/                  Local FAISS retrieval and Groq service
web-app/                 React/Vite interface
docs/                    Architecture notes
notebooks/               Semantic arXiv pipeline reference notebook
```

The Colab pipeline used as the implementation reference is the private
[semantic-arxiv-pipeline](https://github.com/youssef13-del/semantic-arxiv-pipeline) repository.
Its `semantic_arxiv_pipeline.ipynb` notebook is included in `notebooks/` for local reference.

## Run locally

1. Install Python dependencies: `python -m pip install -r requirements.txt`.
2. Install frontend dependencies: `cd web-app; npm install`.
3. Paste your Groq free-tier key into `GROQ_API_KEY` in `.env`. Do not put it in any other
   setting. The default model is `openai/gpt-oss-120b`.
4. Start the FastAPI service from this directory:

   ```powershell
   python -m uvicorn api.main:app --reload
   ```

5. In another terminal, start the UI:

   ```powershell
   cd web-app
   npm run dev
   ```

Semantic search works with the local assets. Groq is the primary analysis model and uses
`openai/gpt-oss-120b` when the key is configured. The API does not scrape arXiv; it follows the
semantic pipeline's retrieval pattern against the existing corrected assets.
