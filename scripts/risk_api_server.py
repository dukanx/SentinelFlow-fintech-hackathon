"""FastAPI wrapper for the Solana risk runner."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from pydantic import BaseModel

from scripts.solana_risk_runner import (
    base_graph_and_context,
    run_single_wallet,
    run_test_runner,
    run_transfer_screening,
)


class ScreenWalletRequest(BaseModel):
    wallet: str


class ScreenTransferRequest(BaseModel):
    sender_wallet: str
    recipient_wallet: str
    amount: float
    token: str = "SOL"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Build the (expensive, deterministic) risk graph once at startup so the
    # first deposit/screen request is served from cache instead of paying the
    # ~10s build cost on the request path.
    base_graph_and_context()
    yield


app = FastAPI(title="ChainSight Risk API", version="1.0.0", lifespan=lifespan)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/risk/deposits")
def get_risk_deposits() -> list[dict]:
    return run_test_runner()


@app.post("/api/risk/screen")
def screen_wallet(request: ScreenWalletRequest) -> dict:
    return run_single_wallet(request.wallet)


@app.post("/api/risk/screen-transfer")
def screen_transfer(request: ScreenTransferRequest) -> dict:
    return run_transfer_screening(
        sender_wallet=request.sender_wallet,
        recipient_wallet=request.recipient_wallet,
        amount_sol=request.amount,
        token=request.token,
    )

