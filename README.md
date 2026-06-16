# SentinelFlow

**Crypto Sanctions & AML Screening Console** — built at **Garaža Hack 2026**.

SentinelFlow is a compliance console that screens Solana deposits for sanctions exposure.
It traces the sender backwards across a transaction graph, finds any link to a blocked
(OFAC) source, and returns a **deterministic, explainable** risk verdict — **Accepted /
Review / Blocked** — with full case-review tooling for analysts. For private (shielded)
deposits, where on-chain tracing is impossible, it falls back to a **zk-STARK
"proof-of-innocence"** instead.

> **Note:** the on-chain data is a deterministic **synthetic Solana graph** (fixed seed),
> so the demo is fully reproducible without an RPC node. The risk logic, verdicts, and
> proof verification are real; only the underlying chain data is simulated.

---

## Table of contents

- [Features](#features)
- [How it works](#how-it-works)
- [Verdict model](#verdict-model)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Getting started](#getting-started)
- [API](#api)
- [Project structure](#project-structure)
- [Disclaimer](#disclaimer)

---

## Features

- **Sanctions tracing** — reverse BFS (up to 4 hops) from the sender to any blocked
  wallet, surfacing the exact tainted value path.
- **Explainable verdicts** — every decision ships with structured `risk_factors`, a 0–100
  `risk_score`, and a pre-filled audit note derived from the *same* signals (UI and notes
  never disagree).
- **Detection signals beyond direct hits:**
  - **Mixer-aware tracing** — flags paths routed through privacy mixers (gone.wtf, Sinbad).
  - **Behavioral identity-linking** — clusters wallets via weighted-Jaccard counterparty
    overlap + activity/value/fee profiles (union-find), inheriting risk across likely
    same-owner wallets.
  - **Velocity / structuring** — detects peel-chain patterns (many micro-transfers in a
    short window).
  - **Dusting quarantine** — isolates unsolicited dust from a blocked source instead of
    falsely flagging the victim wallet.
- **zk-STARK proof-of-innocence** — for shielded deposits, proves membership in a pool's
  *clean association set* without revealing sender / recipient / amount; the exchange
  **verifies** the proof instead of tracing. Verification is real and cross-language
  (identical SHA-256 statement in Python and the browser).
- **Analyst console** — Kanban case board, case detail with interactive transaction graph,
  SAR draft + PDF export, EDD checklist, audit log, and a live alert feed.

## How it works

```
 sender wallet ──▶ (mixer / hops) ──▶ exchange hot wallet
       │
       ▼  reverse traversal (≤ 4 hops)
 is there a blocked/OFAC source upstream?
       │
   ┌───┴───────────────┬────────────────────┬─────────────────────┐
 direct match     value-taint path     identity link         clean
 → Blocked        ≤3 hops → Review     → Review              → Accepted
```

**Public deposits are traced; private deposits are proven.**
When funds enter a privacy pool, the sender/recipient/amount are hidden, so tracing is
impossible. SentinelFlow then attaches a zk-STARK clean-funds proof: a valid proof means
the deposit provably belongs to the clean association set (no sanctioned origin) →
Accepted; if the funds trace to a sanctioned source, no valid proof can be produced →
rejected.

## Verdict model

| Engine verdict | UI label    | Meaning |
| -------------- | ----------- | ------- |
| `MATCH`        | **Blocked** | Direct OFAC/blocked-wallet hit — auto-rejected, no analyst discretion. |
| `REVIEW`       | **Review**  | Indirect taint, identity link, or behavioral signal — routed to an analyst. |
| `NO MATCH`     | **Accepted**| No sanctions exposure within traced hops and no risky link. |

The risk graph is built with a fixed seed (`RANDOM_SEED = 42`), so the same wallet always
yields the same verdict, score, and evidence path.

## Tech stack

| Layer        | Tech |
| ------------ | ---- |
| Frontend     | React 19, TypeScript, **TanStack Start / Router / Query**, Tailwind CSS v4, Radix UI, `@xyflow/react` (graph viz), Recharts, jsPDF |
| Backend      | Python, **FastAPI**, Uvicorn |
| Risk engine  | **NetworkX** (directed transaction graph + identity graph), custom reverse-BFS, union-find clustering |
| zk layer     | Deterministic zk-STARK simulation (`hashlib`); real, cross-language statement verification (Python ↔ Web Crypto) |

## Architecture

```
Browser (React / TanStack)
  └─ TanStack server functions  (src/lib/api/risk.functions.ts)
        └─ HTTP ─▶ FastAPI       (scripts/risk_api_server.py)
                      └─ Risk engine (scripts/solana_risk_runner.py)
                            ├─ NetworkX graph build + reverse-BFS tracing
                            ├─ identity-link clustering
                            └─ zk clean-funds proof (scripts/zk_clean_funds.py)
```

The TanStack server functions act as a typed proxy from the React app to the Python
risk API (base URL from `RISK_API_BASE_URL`).

## Getting started

### Prerequisites

- **Node.js** 18+ and a package manager (npm / bun)
- **Python** 3.10+

### 1. Install dependencies

```bash
npm install
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
# RISK_API_BASE_URL=http://127.0.0.1:8000
```

### 3. Start the Python risk API

```bash
npm run api
# or directly:
# python -m uvicorn scripts.risk_api_server:app --host 127.0.0.1 --port 8000
```

The risk graph is built once at startup (deterministic, ~10s) and cached.

### 4. Start the frontend (in a second terminal)

```bash
npm run dev
```

Then open the URL printed by Vite (e.g. `http://localhost:5173`).

### Key routes

| Route        | Description |
| ------------ | ----------- |
| `/`          | Analyst dashboard — case board, alerts, metrics |
| `/wallet`    | Public demo wallet — send a deposit and watch it get traced |
| `/wallet-zk` | Private (shielded) demo wallet — clean vs. tainted zk-proof flows |

## API

The FastAPI service exposes:

| Method | Endpoint                    | Description |
| ------ | --------------------------- | ----------- |
| `GET`  | `/health`                   | Liveness check |
| `GET`  | `/api/risk/deposits`        | Seed dataset of pre-screened demo deposits |
| `POST` | `/api/risk/screen`          | Screen a single wallet address |
| `POST` | `/api/risk/screen-transfer` | Screen a transfer; optional `scenario: "zk_clean" \| "zk_tainted"` for shielded deposits |

You can also run the engine standalone:

```bash
python -m scripts.solana_risk_runner               # full demo dataset (JSON)
python -m scripts.solana_risk_runner <WALLET_ADDR> # screen one wallet
python -m scripts.zk_clean_funds                   # zk smoke test (clean=valid, tainted=invalid)
```

> The base graph is cached at startup, so **restart the API after backend changes.**

## Project structure

```
.
├── scripts/                      # Python backend
│   ├── risk_api_server.py        # FastAPI app
│   ├── solana_risk_runner.py     # graph build + risk engine
│   └── zk_clean_funds.py         # zk-STARK clean-funds proof (gen/verify/merkle)
├── src/
│   ├── routes/                   # TanStack file-based routes (/, /wallet, /wallet-zk)
│   ├── components/chainsight/    # console UI (board, case detail, graph, zk panel, …)
│   └── lib/
│       ├── api/risk.functions.ts # typed server functions → Python API
│       └── zk-proof.ts           # browser-side proof verifier (Web Crypto)
├── requirements.txt
└── package.json
```

## Disclaimer

SentinelFlow is a **hackathon prototype**. The transaction graph is synthetic, and the
zk-STARK layer is an honest, clearly-labeled **simulation** — commitments, Merkle root,
nullifier, and the public-statement verification are real and deterministic, but there is
no production STARK circuit (no cryptographic soundness guarantee). It is **not** intended
for production compliance use.

---

Built by a 4-person team in ~40 hours at Garaža Hack 2026.
