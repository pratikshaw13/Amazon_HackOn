"""
Base Agent — Shared infrastructure for all AI agents.
Uses Amazon Bedrock (Nova Lite) as the AI provider.
"""
from services.bedrock_service import BedrockService


class BaseAgent:
    def __init__(self):
        self.gemini = BedrockService()  # Named 'gemini' for backward compat with agent code

    async def run(self, input_data: dict) -> dict:
        raise NotImplementedError("Subclasses must implement run()")
