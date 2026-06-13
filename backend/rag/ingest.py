"""
RAG Ingest — No longer needed since we use direct text retrieval.
Kept for backward compatibility. Does nothing.
"""

def create_vector_store():
    print("ℹ️  Vector store not needed — using direct keyword retrieval from product_knowledge.txt")
    return True

def index_exists():
    return True

if __name__ == "__main__":
    create_vector_store()
