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
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# Import and mount routers
from routers import valuation, passport, marketplace, heatmap, prevention, green, agents, auth
from routers import transactions, verification, seller, routing, search, cart
from routers import sell_agent, certified_seller, seller_inventory, seller_routing, rescue_engine, seller_analytics, delivery_partner, delivery_orders, full_orders
from routers import returns

app.include_router(valuation.router, prefix="/api/v1", tags=["Valuation"])
app.include_router(passport.router, prefix="/api/v1", tags=["Passport"])
app.include_router(marketplace.router, prefix="/api/v1", tags=["Marketplace"])
app.include_router(heatmap.router, prefix="/api/v1", tags=["Heatmap"])
app.include_router(prevention.router, prefix="/api/v1", tags=["Prevention"])
app.include_router(green.router, prefix="/api/v1", tags=["Green Credits"])
app.include_router(agents.router, prefix="/api/v1", tags=["Agents"])
app.include_router(auth.router, prefix="/api/v1", tags=["Auth"])
app.include_router(transactions.router, prefix="/api/v1", tags=["Transactions"])
app.include_router(verification.router, prefix="/api/v1", tags=["Verification"])
app.include_router(seller.router, prefix="/api/v1", tags=["Seller"])
app.include_router(routing.router, prefix="/api/v1", tags=["Routing"])
app.include_router(search.router, prefix="/api/v1", tags=["Search"])
app.include_router(cart.router, prefix="/api/v1", tags=["Cart"])
app.include_router(sell_agent.router, prefix="/api/v1", tags=["Sell Agent"])
app.include_router(certified_seller.router, prefix="/api/v1", tags=["Certified Seller"])
app.include_router(seller_inventory.router, prefix="/api/v1", tags=["Seller Inventory"])
app.include_router(seller_routing.router, prefix="/api/v1", tags=["Seller Routing"])
app.include_router(rescue_engine.router, prefix="/api/v1", tags=["Rescue Engine"])
app.include_router(seller_analytics.router, prefix="/api/v1", tags=["Seller Analytics"])
app.include_router(delivery_partner.router, prefix="/api/v1", tags=["Delivery Partner"])
app.include_router(delivery_orders.router, prefix="/api/v1", tags=["Delivery Orders"])
app.include_router(full_orders.router, prefix="/api/v1", tags=["Full Orders"])
app.include_router(returns.router, prefix="/api/v1", tags=["Returns"])
app.include_router(seller_analytics.router, prefix="/api/v1", tags=["Seller Analytics"])
app.include_router(seller_analytics.router, prefix="/api/v1", tags=["Seller Analytics"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "Amazon SecondLife AI"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
