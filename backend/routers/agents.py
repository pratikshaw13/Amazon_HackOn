"""
Agents Router — AI agent status and manual trigger endpoints.
"""
from fastapi import APIRouter
from agents.condition_agent import ConditionAgent
from agents.routing_agent import RoutingAgent
from agents.demand_agent import DemandAgent
from agents.prevention_agent import PreventionAgent
from agents.buyer_matching_agent import BuyerMatchingAgent

router = APIRouter()


@router.get("/agents/status")
async def get_agents_status():
    """Return status of all AI agents."""
    return {
        "agents": [
            {
                "name": "Condition Assessment Agent",
                "id": "condition_agent",
                "status": "active",
                "model": "Gemini 1.5 Flash (Vision)",
                "description": "Analyzes product photos to assess condition, detect defects, and assign grades.",
                "calls_today": 42,
                "avg_latency_ms": 3200
            },
            {
                "name": "Intelligent Routing Agent",
                "id": "routing_agent",
                "status": "active",
                "model": "Gemini 1.5 Flash + RAG",
                "description": "Decides optimal next-life path: resell, refurbish, donate, or recycle.",
                "calls_today": 38,
                "avg_latency_ms": 1800
            },
            {
                "name": "Buyer Matching Agent",
                "id": "buyer_matching_agent",
                "status": "active",
                "model": "Gemini 1.5 Flash + DynamoDB",
                "description": "Predicts ideal buyer profile and best cities for fastest sale.",
                "calls_today": 35,
                "avg_latency_ms": 2100
            },
            {
                "name": "Demand Forecasting Agent",
                "id": "demand_agent",
                "status": "active",
                "model": "Gemini 1.5 Flash + Cache",
                "description": "Forecasts city-level demand for product categories across India.",
                "calls_today": 28,
                "avg_latency_ms": 2500
            },
            {
                "name": "Return Prevention Agent",
                "id": "prevention_agent",
                "status": "active",
                "model": "Gemini 1.5 Flash",
                "description": "Predicts return probability and suggests alternatives before purchase.",
                "calls_today": 56,
                "avg_latency_ms": 1500
            }
        ]
    }


@router.post("/agents/condition/run")
async def run_condition_agent(data: dict):
    """Manually trigger condition agent."""
    agent = ConditionAgent()
    return await agent.run(data)


@router.post("/agents/routing/run")
async def run_routing_agent(data: dict):
    """Manually trigger routing agent."""
    agent = RoutingAgent()
    return await agent.run(data)


@router.post("/agents/demand/run")
async def run_demand_agent(data: dict):
    """Manually trigger demand agent."""
    agent = DemandAgent()
    return await agent.run(data)


@router.post("/agents/prevention/run")
async def run_prevention_agent(data: dict):
    """Manually trigger prevention agent."""
    agent = PreventionAgent()
    return await agent.run(data)
