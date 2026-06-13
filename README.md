# Amazon SecondLife AI

> "No usable product should become dead inventory."

AI-powered returns and sustainable resale platform. Every returned, unused, or outgrown product automatically finds its next best owner.

## Architecture

- **Frontend:** React + Next.js 14 (App Router) + Tailwind CSS (JSX only)
- **Backend:** FastAPI (Python)
- **Database:** AWS DynamoDB
- **Storage:** AWS S3
- **AI:** Google Gemini (Vision + Text) + LangChain RAG + FAISS

## Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Add your API keys to .env
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

## Project Structure

```
amazon-secondlife-ai/
├── /frontend        ← Next.js App (JSX only)
├── /backend         ← FastAPI (Python)
├── /infra           ← AWS setup scripts
└── README.md
```
