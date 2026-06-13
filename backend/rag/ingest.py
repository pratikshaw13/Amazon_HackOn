"""
RAG Ingest — Load product knowledge into FAISS vector store.
Run this once on startup if the index doesn't exist.
"""
import os
from pathlib import Path

# Determine paths
RAG_DIR = Path(__file__).parent
KNOWLEDGE_FILE = RAG_DIR / "product_knowledge.txt"
INDEX_DIR = RAG_DIR / "faiss_index"


def create_vector_store():
    """Create FAISS index from product knowledge text."""
    try:
        from langchain.text_splitter import RecursiveCharacterTextSplitter
        from langchain_google_genai import GoogleGenerativeAIEmbeddings
        from langchain_community.vectorstores import FAISS

        api_key = os.getenv("GEMINI_API_KEY", "")
        if not api_key or api_key == "your_gemini_api_key_here":
            print("⚠️  GEMINI_API_KEY not set. RAG index creation skipped.")
            return False

        # Load knowledge text
        if not KNOWLEDGE_FILE.exists():
            print(f"⚠️  Knowledge file not found: {KNOWLEDGE_FILE}")
            return False

        with open(KNOWLEDGE_FILE, "r", encoding="utf-8") as f:
            knowledge_text = f.read()

        # Split into chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=50,
            separators=["\n\n", "\n", ". ", " "]
        )
        chunks = text_splitter.split_text(knowledge_text)
        print(f"📚 Split knowledge base into {len(chunks)} chunks")

        # Create embeddings
        embeddings = GoogleGenerativeAIEmbeddings(
            model="models/embedding-001",
            google_api_key=api_key
        )

        # Create FAISS index
        vectorstore = FAISS.from_texts(chunks, embeddings)

        # Save to disk
        INDEX_DIR.mkdir(exist_ok=True)
        vectorstore.save_local(str(INDEX_DIR))
        print(f"✅ FAISS index saved to {INDEX_DIR}")
        return True

    except ImportError as e:
        print(f"⚠️  RAG dependencies not installed: {e}")
        return False
    except Exception as e:
        print(f"⚠️  RAG index creation failed: {e}")
        return False


def index_exists() -> bool:
    """Check if FAISS index already exists."""
    return (INDEX_DIR / "index.faiss").exists()


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / ".env")

    if index_exists():
        print("✅ FAISS index already exists. Delete faiss_index/ to rebuild.")
    else:
        create_vector_store()
