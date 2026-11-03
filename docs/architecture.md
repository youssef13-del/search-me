# Search Me architecture

The application is intentionally offline-first:

- `data/processed/merged_clean_final.csv` is the cleaned paper metadata.
- `data/processed/keyphrases_vectors_FINAL.csv` contains the existing embedding vectors.
- `data/index/faiss_index.bin` and `data/index/faiss_urls.pkl` are the existing FAISS search assets.
- FastAPI loads those assets lazily and never scrapes arXiv at request time.
- Groq is the synthesis layer and is called by the analysis endpoint when `GROQ_API_KEY` is configured.

The Colab pipeline reference is maintained in the private
[semantic-arxiv-pipeline](https://github.com/youssef13-del/semantic-arxiv-pipeline) repository.
Its `semantic_arxiv_pipeline.ipynb` notebook is included in `notebooks/` for local reference. The
local application consumes the already-corrected assets instead of rerunning its collection or
PDF extraction stages.
