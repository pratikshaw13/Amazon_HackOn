"""
Amazon SecondLife AI — FastAPI Application Entry Point
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="Amazon SecondLife AI",
    description="AI-powered returns and sustainable resale platform",
    version="1.0.0"
)

# CORS configuration
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and mount routers
from routers import valuation, passport, marketplace, heatmap, prevention, green, agents, auth

app.include_router(valuation.router, prefix="/api/v1", tags=["Valuation"])
app.include_router(passport.router, prefix="/api/v1", tags=["Passport"])
app.include_router(marketplace.router, prefix="/api/v1", tags=["Marketplace"])
app.include_router(heatmap.router, prefix="/api/v1", tags=["Heatmap"])
app.include_router(prevention.router, prefix="/api/v1", tags=["Prevention"])
app.include_router(green.router, prefix="/api/v1", tags=["Green Credits"])
app.include_router(agents.router, prefix="/api/v1", tags=["Agents"])
app.include_router(auth.router, prefix="/api/v1", tags=["Auth"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "Amazon SecondLife AI"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
