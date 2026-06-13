# Amazon SecondLife AI — Backend

FastAPI backend with AI agents, RAG pipeline, and AWS integrations.

## Setup

```bash
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your API keys
```

## Run

```bash
uvicorn main:app --reload --port 8000
```

## API Docs

Once running, visit: http://localhost:8000/docs

## AI Agents

| Agent | Role | Model |
|---|---|---|
| Condition Agent | Photo analysis, grading | Gemini Vision |
| Routing Agent | Optimal resale path | Gemini Text + RAG |
| Demand Agent | City-level forecasting | Gemini Text + Cache |
| Buyer Matching Agent | Buyer profile prediction | Gemini Text |
| Prevention Agent | Return risk scoring | Gemini Text |

## RAG Setup

```bash
python rag/ingest.py
```

Creates FAISS vector index from product_knowledge.txt.
