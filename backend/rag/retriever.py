"""
RAG Retriever — Simple keyword-based retrieval from product knowledge base.
Uses direct text matching (no external AI dependencies).
"""
from pathlib import Path

RAG_DIR = Path(__file__).parent
KNOWLEDGE_FILE = RAG_DIR / "product_knowledge.txt"


class Retriever:
    def __init__(self):
        self.chunks = []
        self._load_knowledge()

    def _load_knowledge(self):
        """Load and chunk the knowledge file."""
        if not KNOWLEDGE_FILE.exists():
            print("ℹ️  product_knowledge.txt not found. RAG retrieval disabled.")
            return

        with open(KNOWLEDGE_FILE, "r", encoding="utf-8") as f:
            content = f.read()

        # Split by double newlines (section breaks)
        sections = content.split("\n\n")
        self.chunks = [s.strip() for s in sections if s.strip() and len(s.strip()) > 20]
        print(f"✅ RAG loaded: {len(self.chunks)} knowledge chunks")

    def query(self, query_text: str, k: int = 3) -> str:
        """
        Simple keyword matching to find relevant chunks.
        Returns top-k chunks as a single context string.
        """
        if not self.chunks:
            return ""

        query_words = set(query_text.lower().split())

        # Score each chunk by keyword overlap
        scored = []
        for chunk in self.chunks:
            chunk_words = set(chunk.lower().split())
            overlap = len(query_words & chunk_words)
            scored.append((overlap, chunk))

        # Sort by relevance and take top-k
        scored.sort(key=lambda x: x[0], reverse=True)
        top_chunks = [chunk for _, chunk in scored[:k] if _ > 0]

        return "\n\n".join(top_chunks) if top_chunks else self.chunks[0]
