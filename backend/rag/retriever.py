"""
RAG Retriever — Query FAISS index for relevant knowledge chunks.
"""
import os
from pathlib import Path

RAG_DIR = Path(__file__).parent
INDEX_DIR = RAG_DIR / "faiss_index"


class Retriever:
    def __init__(self):
        self.vectorstore = None
        self._load_index()

    def _load_index(self):
        """Load FAISS index if it exists."""
        if not (INDEX_DIR / "index.faiss").exists():
            print("ℹ️  FAISS index not found. RAG retrieval will use fallback.")
            return

        try:
            from langchain_google_genai import GoogleGenerativeAIEmbeddings
            from langchain_community.vectorstores import FAISS

            api_key = os.getenv("GEMINI_API_KEY", "")
            if not api_key or api_key == "your_gemini_api_key_here":
                return

            embeddings = GoogleGenerativeAIEmbeddings(
                model="models/embedding-001",
                google_api_key=api_key
            )
            self.vectorstore = FAISS.load_local(
                str(INDEX_DIR), embeddings,
                allow_dangerous_deserialization=True
            )
            print("✅ FAISS index loaded for RAG retrieval")
        except Exception as e:
            print(f"⚠️  Failed to load FAISS index: {e}")

    def query(self, query_text: str, k: int = 3) -> str:
        """
        Query the vector store and return top-k relevant chunks as context string.
        """
        if not self.vectorstore:
            return self._fallback_context(query_text)

        try:
            docs = self.vectorstore.similarity_search(query_text, k=k)
            return "\n\n".join([doc.page_content for doc in docs])
        except Exception as e:
            print(f"RAG query error: {e}")
            return self._fallback_context(query_text)

    def _fallback_context(self, query: str) -> str:
        """Provide basic context when vector store is unavailable."""
        # Read from knowledge file directly as fallback
        knowledge_file = RAG_DIR / "product_knowledge.txt"
        if knowledge_file.exists():
            with open(knowledge_file, "r", encoding="utf-8") as f:
                content = f.read()
            # Return first 1000 chars as basic context
            return content[:1000]
        return "No knowledge base available."
