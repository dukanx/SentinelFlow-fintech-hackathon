"""Simulated zk-STARK "clean funds" proofs for private (shielded) transactions.

This is a *demo* implementation: it is NOT a real STARK prover. It models the
"Privacy Pools" / proof-of-innocence idea — a withdrawer from a privacy pool
proves their deposit belongs to a curated CLEAN association set (all pool
deposits minus those with sanctioned/mixer-tainted provenance) WITHOUT revealing
which deposit is theirs, the recipient, or the amount.

What is real here: deterministic commitments (SHA-256, Poseidon-style label), a
binary Merkle root over the clean association set, a nullifier, and a verifier
that genuinely re-checks the public statement. What is simulated: the proof blob
and prover/verifier cost — there is no underlying STARK circuit.

The canonical string used for the commitment MAC is mirrored verbatim in
``src/lib/zk-proof.ts`` so the TypeScript verifier reproduces the same digest.
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Any

# Public, non-secret verifying key — both prover and verifier use it. Changing
# it here means changing VERIFYING_KEY in src/lib/zk-proof.ts too.
VERIFYING_KEY = "chainsight-zk-vk-v1"

# Fixed compliance ruleset the proof is bound to (OFAC SDN, max trace depth).
MAX_HOPS = 5
RULESET_HASH = ""  # filled below once _h is defined


def _h(*parts: str) -> str:
    """Poseidon-style hash label — deterministic SHA-256 over joined parts."""
    return hashlib.sha256("|".join(parts).encode("utf-8")).hexdigest()


def _b(value: bool) -> str:
    """Canonical boolean rendering shared with the TS verifier ("true"/"false")."""
    return "true" if value else "false"


RULESET_HASH = _h("OFAC-SDN", f"max_hops={MAX_HOPS}", "exclude-mixer-tainted")


def leaf_commitment(address: str) -> str:
    return _h("leaf", address)


def merkle_root(leaves: list[str]) -> str:
    """Binary Merkle root over leaf commitments (duplicate-last padding)."""
    if not leaves:
        return _h("empty-association-set")
    level = list(leaves)
    while len(level) > 1:
        if len(level) % 2 == 1:
            level.append(level[-1])
        level = [_h(level[i], level[i + 1]) for i in range(0, len(level), 2)]
    return level[0]


def build_clean_association_set(graph: Any, pool_node: str, blocked: set[str]) -> list[str]:
    """Clean (non-sanctioned) depositors feeding the pool, deterministically ordered.

    The tainted inflow (e.g. Garantex) is deliberately excluded, so a deposit
    funded by it cannot prove membership.
    """
    depositors = [
        pred
        for pred in graph.predecessors(pool_node)
        if pred not in blocked
    ]
    return sorted(set(depositors))


def commitment_mac(
    *,
    pool_id: str,
    association_root: str,
    nullifier: str,
    is_member: bool,
) -> str:
    # Canonical string — keep byte-for-byte identical to zk-proof.ts.
    return _h(
        pool_id,
        association_root,
        nullifier,
        RULESET_HASH,
        str(MAX_HOPS),
        _b(is_member),
        VERIFYING_KEY,
    )


def _proof_blob(sender: str, recipient: str, amount: float, association_root: str, nullifier: str) -> str:
    """Opaque, deterministic stand-in for STARK proof bytes (~512 hex chars)."""
    seed = _h(sender, recipient, f"{amount:.9f}", association_root, nullifier, "witness")
    blob = ""
    chunk = seed
    while len(blob) < 512:
        chunk = _h(chunk, "fri")
        blob += chunk
    return blob[:512]


def generate_clean_funds_proof(
    *,
    sender: str,
    recipient: str,
    amount: float,
    pool_id: str,
    leaves: list[str],
    is_member: bool,
) -> dict[str, Any]:
    """Build a (simulated) zk-STARK clean-funds proof.

    Public inputs reveal nothing about sender/recipient/amount. ``is_member``
    encodes whether the sender's deposit is in the clean association set; a
    tainted deposit produces ``is_member=False`` and will fail verification.
    """
    leaf_commitments = [leaf_commitment(addr) for addr in leaves]
    association_root = merkle_root(leaf_commitments)
    # Nullifier is a one-way function of the secret leaf — hides the sender but
    # is stable per (sender, pool), preventing proof replay/double use.
    nullifier = _h("nullifier", sender, pool_id, VERIFYING_KEY)
    blob = _proof_blob(sender, recipient, amount, association_root, nullifier)

    # Deterministic, plausible-looking cost metrics derived from the proof.
    metric_seed = int(_h(blob, "metrics")[:8], 16)
    prover_ms = 850 + metric_seed % 1600
    verifier_ms = 6 + metric_seed % 18

    return {
        "proof_system": "zk-STARK (transparent, simulated demo)",
        "statement": (
            "The deposit funding this withdrawal is a member of the CLEAN "
            f"association set of pool '{pool_id}' (no sanctioned source within "
            f"{MAX_HOPS} hops). Sender, recipient and amount are not revealed."
        ),
        "public_inputs": {
            "association_root": association_root,
            "nullifier": nullifier,
            "pool_id": pool_id,
            "ruleset_hash": RULESET_HASH,
            "max_hops": MAX_HOPS,
            "membership": is_member,
        },
        "redacted_witness": {
            "sender": "shielded",
            "recipient": "shielded",
            "amount": "shielded",
        },
        "commitment_mac": commitment_mac(
            pool_id=pool_id,
            association_root=association_root,
            nullifier=nullifier,
            is_member=is_member,
        ),
        "proof_blob": blob,
        "metrics": {
            "proof_size_bytes": len(blob) // 2,
            "security_bits": 96,
            "num_queries": 48,
            "prover_ms": prover_ms,
            "verifier_ms": verifier_ms,
            "association_set_size": len(leaves),
        },
        "valid": is_member,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


def verify_clean_funds_proof(proof: dict[str, Any]) -> dict[str, Any]:
    """Re-check the public statement. Mirrors verifyCleanFundsProof in TS."""
    pi = proof.get("public_inputs", {})
    recomputed = commitment_mac(
        pool_id=str(pi.get("pool_id", "")),
        association_root=str(pi.get("association_root", "")),
        nullifier=str(pi.get("nullifier", "")),
        is_member=bool(pi.get("membership", False)),
    )
    checks = [
        {"label": "Commitment MAC matches public inputs", "ok": recomputed == proof.get("commitment_mac")},
        {"label": "Deposit is in the clean association set", "ok": bool(pi.get("membership", False))},
        {"label": "Bound to current OFAC-SDN ruleset", "ok": pi.get("ruleset_hash") == RULESET_HASH},
    ]
    return {"valid": all(c["ok"] for c in checks), "checks": checks}


if __name__ == "__main__":
    # Smoke test: clean proof verifies, tainted proof does not.
    clean = generate_clean_funds_proof(
        sender="WALLET_CLEAN",
        recipient="EXCHANGE",
        amount=0.4,
        pool_id="gone.wtf mixer",
        leaves=["WALLET_CLEAN", "depositor-1", "depositor-2"],
        is_member=True,
    )
    tainted = generate_clean_funds_proof(
        sender="WALLET_TAINTED",
        recipient="EXCHANGE",
        amount=0.4,
        pool_id="gone.wtf mixer",
        leaves=["depositor-1", "depositor-2"],  # tainted sender NOT in set
        is_member=False,
    )
    print("clean:", verify_clean_funds_proof(clean))
    print("tainted:", verify_clean_funds_proof(tainted))
