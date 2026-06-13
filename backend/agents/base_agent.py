"""
Base Agent — Shared infrastructure for all AI agents.
"""
from services.gemini_service import GeminiService


class BaseAgent:
    def __init__(self):
        self.gemini = GeminiService()

    async def run(self, input_data: dict) -> dict:
        raise NotImplementedError("Subclasses must implement run()")
