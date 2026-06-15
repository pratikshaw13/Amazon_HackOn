"""
Base Agent — Shared infrastructure for all AI agents.
Uses AIProviderChain for automatic multi-provider failover.
Chain: Amazon Bedrock → Gemini → Ollama → Rule-Based Fallback.
"""
from services.ai_provider import AIProviderChain


# Singleton chain instance (shared across all agents to avoid re-initialization)
_chain_instance = None


def _get_chain():
    global _chain_instance
    if _chain_instance is None:
        _chain_instance = AIProviderChain()
    return _chain_instance


class BaseAgent:
    def __init__(self):
        # Named 'gemini' for backward compat with all agent code that calls self.gemini.*
        # Now backed by AIProviderChain which tries Bedrock first, then cascades
        self.gemini = _get_chain()

    async def run(self, input_data: dict) -> dict:
        raise NotImplementedError("Subclasses must implement run()")
