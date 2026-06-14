"""In-memory Solana risk graph demo.

Builds a synthetic Solana transaction graph and runs three deterministic
off-ramp checks against blocked-wallet proximity rules.
"""

from __future__ import annotations

import json
import math
import random
import time
import sys
from collections import Counter, defaultdict, deque
from dataclasses import dataclass
from itertools import combinations
from typing import Any

import networkx as nx


# Solana addresses and signatures are base58-encoded (Bitcoin alphabet: no 0, O, I, l).
BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
NODE_COUNT = 5_000
MIN_EDGE_COUNT = 15_001
MAX_REVERSE_HOPS = 4
REVIEW_HOP_LIMIT = 3
STARTING_SLOT = 250_000_000
RANDOM_SEED = 42
IDENTITY_AUTO_MERGE_THRESHOLD = 0.86
IDENTITY_REVIEW_THRESHOLD = 0.72
CANDIDATE_BUCKET_LIMIT = 24
MAX_CANDIDATE_PAIRS = 80_000

# ── Solana entities (base58 addresses) ───────────────────────────────────────
# OFAC-sanctioned / blocked sources (rendered red, auto-rejected on a direct match).
LAZARUS_EXPLOIT = "VUjmGL66w6rsjKdvBmQ8q558Kut3cfE4JeG6dCeJYNRc"   # Lazarus Group — bridge exploit
LAZARUS_CASHOUT = "Swf8EfykLf9gTfioYikpCbLzzxJx959GRdL2ahe3c89C"   # Lazarus Group — cashout wallet
SANCTIONED_MIXER = "8s4FBoBZy1pFSen8wfnQcyqjyLPKpmdhFycEGsrjze8x"  # Sanctioned mixer (dusting source)

# Mixer hop (rendered purple; sits between a blocked source and the sender).
TORNADO_CASH = "jVurrm9Forgh3ifZPDLWBYRiXUyXfFzxpVADu6uX6pb1"      # Tornado Cash mixer

# Other legitimate wallets co-mixing through the mixer, shown as extra (valid) inflows.
TORNADO_DEPOSITORS = [
    "nSjNA25mBLXMTgZfs4Q171ggpUoeQP5fusG4cD3SRexD",
    "tvRwVUfxaMLoMyy7voaBLjwTHNnAxAphLE9zHvxb5gs2",
]

# Legitimate, labeled hubs.
UNISWAP_ROUTER = "kSU5tjpBxgh3EAmzMfJsvzThZyFwqnqWAbnCKUB5EvaH"  # Jupiter aggregator
BINANCE_HOT = "aKAVUGqDX5WtrLopkAZiXxPopUJYqZChZP4T22ZTkuLn"
COINBASE_HOT = "kFDXi8QAHf6T77JRgzMALEE9kC2UybrogPy3gXFT3pYW"

# Our own off-ramp / exchange hot wallet (the deposit destination in the graph).
# NOTE: must stay in sync with EXCHANGE_HOT_WALLET in src/lib/config.ts.
EXCHANGE_HOT_WALLET = "z9AL5864t9S8MfkszrWaQ6QGEA9J9EhH9QFf5m9EVpTk"

INTERMEDIARY_HOP = "E4VCTL8SHw62WEiu3JfSumbJ745cnoXpnPr51bQNY3tB"

TEST_WALLET_CLEAN = "G1yGSUm2pEksdQHpeXTcfQytcmnVmfRBU86itkaZygui"
TEST_WALLET_DIRECT_MATCH = LAZARUS_CASHOUT
TEST_WALLET_INDIRECT_TAINT = "9cbk2sgyQjTYb1mTDVTtSt3E4Z9YhWZVvjCFUV4tubUk"
TEST_WALLET_IDENTITY_LINKED = "xE9PkWjkdohYysYkAZVw1ji6eTTuJTDcF6nGgeAjBGEx"
TEST_WALLET_POISONED = "DpQ6wAz9eGRFQB4SCMjtd2rHDsudi98daGK5C8w6myzg"

# More sanctioned / mixer entities so each case can have a distinct graph topology.
GARANTEX = "W831iyZdfvfWNQqXUVoA6bg4jR2uQwQ9KPLPPu5Hn7Jf"        # OFAC-sanctioned exchange
SINBAD_MIXER = "jtpWodq3syzU1SwR3SMyzbEz7NnHjEXrpXsXYi1weWVM"    # Sinbad mixer (rendered purple, not auto-block)

# Additional scenario wallets, each producing a different graph.
WALLET_DIRECT_1HOP = "QXTTDhVfJ24NaZi3DMLMzRRyzd3nRfQfx4JJQLkNihqE"   # blocked source one hop away
WALLET_TORNADO_2HOP = "tsFTUsLneHr3KFsZuiGiqA6Hk7qemRRqhTpnr9dJ3HX5"  # Lazarus -> Tornado -> wallet
WALLET_SINBAD_2HOP = "zje4ubgNmqudTgbedY4EnbRDKdwuL9odEGjzFRfai5HY"   # Garantex -> Sinbad -> wallet
WALLET_PLAIN_CHAIN = "JfQAEVNfi1rdhFtNwH2zWaxCmh68AdNmjddv76SHDF2t"   # Garantex -> hop -> hop -> wallet
CHAIN_HOP_1 = "sZNbB7ha6gi2kTXmKYNHtm2vrhDovniAUSEKEbyorR6L"
CHAIN_HOP_2 = "TPEMmyiU2273u3LLWb2wNVwDqrJMhR7DZ4WFagk7ueML"

# Rare shared counterparties tying the identity-linked wallet to the tainted recipient.
RARE_COUNTERPARTIES = [
    "FzHKtQhoDL2vpKx9apt3iK9h6BnNLfoMqL31zCNBA8pc",
    "N4jQ3BPPdwUuH6GEiPoFaEvZeeqCskZ55xxD8Meqm4gu",
    "QRCZWw2n3EKHLUnVMfgu49bJtsXtFu2NM63TiPNFkS1R",
    "yQQDiWHe5WoUeBwxJsEA6hxKP6cV7BiKa5TShfw38sMn",
    "emocUaSxFLnNGDyGGHVSSoy5tVuoxih6FsFHVoeB5uWU",
    "ztU7ePBC4ZhxPW9Qib5JXLpDmYwuSppdKMqPtYZwbHHb",
    "gKktyv189EnxVbak6UYxxbNgrvSCxwY9tUbP3zCGD63h",
    "aqmmCHUsYKkbTxpnr5LAB3QsYMiePuTNqHUPuzSBo96t",
    "2boZANBdjVCRhZw9L4ySGCdDM4VkocBdtaD6T7SWEURw",
]

BLOCKED_WALLETS = {LAZARUS_EXPLOIT, LAZARUS_CASHOUT, SANCTIONED_MIXER, GARANTEX}

LEGITIMATE_HUBS = {
    UNISWAP_ROUTER: "Uniswap Router",
    BINANCE_HOT: "Binance 14 (hot wallet)",
    COINBASE_HOT: "Coinbase (hot wallet)",
}

FRIENDLY_WALLET_LABELS = {
    TEST_WALLET_CLEAN: "Self-custody wallet",
    TEST_WALLET_INDIRECT_TAINT: "Downstream recipient",
    TEST_WALLET_IDENTITY_LINKED: "Linked cashout wallet",
    TEST_WALLET_POISONED: "Dusting victim wallet",
    LAZARUS_EXPLOIT: "OFAC: Lazarus Group",
    LAZARUS_CASHOUT: "OFAC: Lazarus Group (cashout)",
    SANCTIONED_MIXER: "Sanctioned mixer",
    TORNADO_CASH: "Tornado Cash mixer",
    INTERMEDIARY_HOP: "Pass-through wallet",
    TORNADO_DEPOSITORS[0]: "Depositor wallet",
    TORNADO_DEPOSITORS[1]: "Depositor wallet",
    GARANTEX: "OFAC: Garantex",
    SINBAD_MIXER: "Sinbad mixer",
    WALLET_DIRECT_1HOP: "Off-ramp wallet",
    WALLET_TORNADO_2HOP: "Off-ramp wallet",
    WALLET_SINBAD_2HOP: "Off-ramp wallet",
    WALLET_PLAIN_CHAIN: "Off-ramp wallet",
    CHAIN_HOP_1: "Pass-through wallet",
    CHAIN_HOP_2: "Pass-through wallet",
}


@dataclass(frozen=True)
class WalletFeatures:
    address: str
    active_hours: tuple[float, ...]
    active_days: tuple[float, ...]
    amount_buckets: tuple[float, ...]
    gas_buckets: tuple[float, ...]
    counterparties: frozenset[str]
    protocols: frozenset[str]
    tx_count: int
    round_amount_ratio: float
    median_gap_slots: float


@dataclass(frozen=True)
class IdentityLink:
    source: str
    target: str
    confidence: float
    status: str
    evidence: tuple[str, ...]


class UnionFind:
    def __init__(self, nodes: list[str]) -> None:
        self.parent = {node: node for node in nodes}
        self.rank = {node: 0 for node in nodes}

    def find(self, node: str) -> str:
        root = self.parent.setdefault(node, node)
        if root != node:
            self.parent[node] = self.find(root)
        return self.parent[node]

    def union(self, left: str, right: str) -> None:
        left_root = self.find(left)
        right_root = self.find(right)
        if left_root == right_root:
            return
        if self.rank[left_root] < self.rank[right_root]:
            left_root, right_root = right_root, left_root
        self.parent[right_root] = left_root
        if self.rank[left_root] == self.rank[right_root]:
            self.rank[left_root] += 1


@dataclass(frozen=True)
class RiskContext:
    features: dict[str, WalletFeatures]
    counterparty_index: dict[str, set[str]]
    identity_links: list[IdentityLink]
    identity_graph: nx.Graph
    union_find: UnionFind


def generate_sol_signature() -> str:
    """Generate a Solana-style base58 transaction signature (~88 chars)."""
    return "".join(random.choice(BASE58_ALPHABET) for _ in range(88))


def generate_sol_address(existing: set[str]) -> str:
    """Generate a unique Solana-style base58 address (44 chars)."""
    while True:
        candidate = "".join(random.choice(BASE58_ALPHABET) for _ in range(44))
        if candidate not in existing:
            existing.add(candidate)
            return candidate


def edge_metadata(amount_sol: float | None = None, slot: int | None = None) -> dict[str, Any]:
    return {
        "tx_signature": generate_sol_signature(),
        "amount_sol": round(amount_sol if amount_sol is not None else random.uniform(0.05, 12.0), 4),
        "slot": slot if slot is not None else STARTING_SLOT + random.randint(1, 10_000_000),
    }


def add_transaction(
    graph: nx.DiGraph,
    source: str,
    target: str,
    amount_sol: float | None = None,
    slot: int | None = None,
) -> None:
    graph.add_edge(source, target, **edge_metadata(amount_sol=amount_sol, slot=slot))


def normalized(counter: Counter[int], size: int) -> tuple[float, ...]:
    total = sum(counter.values())
    if total == 0:
        return tuple(0.0 for _ in range(size))
    return tuple(counter[index] / total for index in range(size))


def amount_bucket(amount_sol: float) -> int:
    if amount_sol < 1:
        return 0
    if amount_sol < 5:
        return 1
    if amount_sol < 20:
        return 2
    if amount_sol < 50:
        return 3
    return 4


def gas_bucket(slot: int, address: str) -> int:
    # Solana has no EVM gas price; this simulates fee-priority preference from slot/address entropy.
    return (slot + sum(ord(char) for char in address[:6])) % 5


def slot_hour(slot: int) -> int:
    return ((slot - STARTING_SLOT) // 9_000) % 24


def slot_day(slot: int) -> int:
    return ((slot - STARTING_SLOT) // 216_000) % 7


def protocol_label(counterparty: str) -> str | None:
    return LEGITIMATE_HUBS.get(counterparty)


def histogram_similarity(left: tuple[float, ...], right: tuple[float, ...]) -> float:
    return sum(min(left_value, right_value) for left_value, right_value in zip(left, right))


def numeric_similarity(left: float, right: float, scale: float) -> float:
    return max(0.0, 1.0 - abs(left - right) / scale)


def weighted_jaccard(left: frozenset[str], right: frozenset[str], idf: dict[str, float]) -> float:
    union = left | right
    if not union:
        return 0.0
    intersection_weight = sum(idf.get(item, 1.0) for item in left & right)
    union_weight = sum(idf.get(item, 1.0) for item in union)
    return intersection_weight / union_weight


def median(values: list[int]) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    middle = len(ordered) // 2
    if len(ordered) % 2:
        return float(ordered[middle])
    return (ordered[middle - 1] + ordered[middle]) / 2


def build_scale_free_graph() -> nx.DiGraph:
    random.seed(RANDOM_SEED)

    raw_graph = nx.scale_free_graph(NODE_COUNT, seed=RANDOM_SEED)
    addresses: set[str] = set(BLOCKED_WALLETS) | set(LEGITIMATE_HUBS) | {
        TEST_WALLET_CLEAN,
        TEST_WALLET_INDIRECT_TAINT,
        TEST_WALLET_IDENTITY_LINKED,
        TEST_WALLET_POISONED,
    }
    id_to_address = {
        node_id: generate_sol_address(addresses)
        for node_id in raw_graph.nodes
    }

    graph = nx.DiGraph()
    for address in id_to_address.values():
        graph.add_node(address, label="synthetic_wallet", source="scale_free")

    for source_id, target_id in raw_graph.edges(keys=False):
        if source_id == target_id:
            continue
        add_transaction(graph, id_to_address[source_id], id_to_address[target_id])

    ensure_minimum_edges(graph)
    inject_test_scenarios(graph)
    return graph


def ensure_wallet_node(graph: nx.DiGraph, wallet_address: str, label: str = "Screened wallet") -> None:
    if wallet_address not in graph:
        graph.add_node(wallet_address, label=label, source="screen_request")


def simulate_transfer_into_wallet(
    graph: nx.DiGraph,
    sender_wallet: str,
    recipient_wallet: str,
    amount_sol: float,
    token: str = "SOL",
) -> None:
    ensure_wallet_node(graph, sender_wallet, label="Submitted sender wallet")
    ensure_wallet_node(graph, recipient_wallet, label="Exchange deposit address")

    transfer_slot = STARTING_SLOT + 60_000_000 + random.randint(1, 50_000)
    add_transaction(graph, sender_wallet, recipient_wallet, amount_sol, transfer_slot)

    # Pick a taint channel at random so each send produces a different graph.
    pattern = random.choice(["tornado", "sinbad", "direct", "chain"])
    scaled = max(0.3, amount_sol * 1.4)

    if pattern == "tornado":
        ensure_wallet_node(graph, LAZARUS_EXPLOIT, label="OFAC: Lazarus Group")
        ensure_wallet_node(graph, TORNADO_CASH, label="Tornado Cash mixer")
        add_transaction(graph, LAZARUS_EXPLOIT, TORNADO_CASH, max(0.5, amount_sol * 2.0), transfer_slot - 420)
        add_transaction(graph, TORNADO_CASH, sender_wallet, scaled, transfer_slot - 180)
    elif pattern == "sinbad":
        ensure_wallet_node(graph, GARANTEX, label="OFAC: Garantex")
        ensure_wallet_node(graph, SINBAD_MIXER, label="Sinbad mixer")
        add_transaction(graph, GARANTEX, SINBAD_MIXER, max(0.5, amount_sol * 2.2), transfer_slot - 420)
        add_transaction(graph, SINBAD_MIXER, sender_wallet, scaled, transfer_slot - 180)
    elif pattern == "direct":
        ensure_wallet_node(graph, LAZARUS_EXPLOIT, label="OFAC: Lazarus Group")
        add_transaction(graph, LAZARUS_EXPLOIT, sender_wallet, scaled, transfer_slot - 180)
    else:  # plain peel chain, no mixer
        hop = "".join(random.choice(BASE58_ALPHABET) for _ in range(44))
        ensure_wallet_node(graph, GARANTEX, label="OFAC: Garantex")
        graph.add_node(hop, label="Pass-through wallet", source="screen_request")
        add_transaction(graph, GARANTEX, hop, max(0.5, amount_sol * 1.8), transfer_slot - 420)
        add_transaction(graph, hop, sender_wallet, scaled, transfer_slot - 180)


def ensure_minimum_edges(graph: nx.DiGraph) -> None:
    nodes = list(graph.nodes)
    weighted_nodes = [
        node
        for node in nodes
        for _ in range(max(1, graph.degree(node)))
    ]

    while graph.number_of_edges() < MIN_EDGE_COUNT:
        source = random.choice(nodes)
        target = random.choice(weighted_nodes)
        if source != target and not graph.has_edge(source, target):
            add_transaction(graph, source, target)


def inject_test_scenarios(graph: nx.DiGraph) -> None:
    for hub, label in LEGITIMATE_HUBS.items():
        graph.add_node(hub, label=label, source="legitimate_hub")

    # Clean wallet funded entirely from labeled, legitimate hubs.
    graph.add_node(TEST_WALLET_CLEAN, label="Self-custody wallet", source="test_scenario")
    add_transaction(graph, UNISWAP_ROUTER, TEST_WALLET_CLEAN, 3.40)
    add_transaction(graph, TEST_WALLET_CLEAN, BINANCE_HOT, 1.20)
    add_transaction(graph, COINBASE_HOT, TEST_WALLET_CLEAN, 0.80)

    # Directly sanctioned wallet (Lazarus cashout) — auto-rejected on a direct match.
    graph.add_node(TEST_WALLET_DIRECT_MATCH, label="OFAC: Lazarus Group (cashout)", source="blocked_wallet")
    random_counterparties = random.sample(list(graph.nodes), 8)
    for counterparty in random_counterparties[:4]:
        if counterparty != TEST_WALLET_DIRECT_MATCH:
            add_transaction(graph, TEST_WALLET_DIRECT_MATCH, counterparty)
    for counterparty in random_counterparties[4:]:
        if counterparty != TEST_WALLET_DIRECT_MATCH:
            add_transaction(graph, counterparty, TEST_WALLET_DIRECT_MATCH)

    # Indirect taint: Lazarus Group -> Tornado Cash -> pass-through -> recipient.
    graph.add_node(LAZARUS_EXPLOIT, label="OFAC: Lazarus Group", source="blocked_wallet")
    graph.add_node(TORNADO_CASH, label="Tornado Cash mixer", source="mixer")
    graph.add_node(INTERMEDIARY_HOP, label="Pass-through wallet", source="test_scenario")
    graph.add_node(TEST_WALLET_INDIRECT_TAINT, label="Downstream recipient", source="test_scenario")

    add_transaction(graph, LAZARUS_EXPLOIT, TORNADO_CASH, 18.0, STARTING_SLOT + 20_000_001)
    add_transaction(graph, TORNADO_CASH, INTERMEDIARY_HOP, 11.5, STARTING_SLOT + 20_000_123)
    add_transaction(graph, INTERMEDIARY_HOP, TEST_WALLET_INDIRECT_TAINT, 4.2, STARTING_SLOT + 20_000_456)

    # Other legitimate wallets co-mixing through Tornado Cash (valid inflows).
    for offset, depositor in enumerate(TORNADO_DEPOSITORS):
        graph.add_node(depositor, label="Depositor wallet", source="mixer_inflow")
        add_transaction(graph, depositor, TORNADO_CASH, round(0.8 + offset * 0.6, 4), STARTING_SLOT + 20_000_040 + offset * 25)

    clean_inflows = random.sample(list(graph.nodes), 2)
    add_transaction(graph, clean_inflows[0], INTERMEDIARY_HOP, 1.2, STARTING_SLOT + 20_000_300)
    add_transaction(graph, clean_inflows[1], TEST_WALLET_INDIRECT_TAINT, 0.4, STARTING_SLOT + 20_000_700)

    # Identity-linked hidden cashout wallet (shares rare counterparties with the recipient).
    graph.add_node(TEST_WALLET_IDENTITY_LINKED, label="Linked cashout wallet", source="test_scenario")
    for counterparty in RARE_COUNTERPARTIES:
        graph.add_node(counterparty, label="Shared OTC counterparty", source="test_scenario")

    for offset, counterparty in enumerate(RARE_COUNTERPARTIES):
        amount = 0.5 + offset * 0.05
        slot = STARTING_SLOT + 30_000_000 + offset * 9_200
        add_transaction(graph, TEST_WALLET_INDIRECT_TAINT, counterparty, amount, slot)
        add_transaction(graph, TEST_WALLET_IDENTITY_LINKED, counterparty, amount + 0.02, slot + 180)

    # Dusting victim: a single tiny inbound from a sanctioned mixer, no outbound movement.
    graph.add_node(TEST_WALLET_POISONED, label="Dusting victim wallet", source="test_scenario")
    add_transaction(graph, SANCTIONED_MIXER, TEST_WALLET_POISONED, 0.0009, STARTING_SLOT + 40_000_000)
    add_transaction(graph, UNISWAP_ROUTER, TEST_WALLET_POISONED, 2.2)

    # Short direct taint: Lazarus -> wallet (1 hop, no mixer).
    graph.add_node(WALLET_DIRECT_1HOP, label="Off-ramp wallet", source="test_scenario")
    add_transaction(graph, LAZARUS_EXPLOIT, WALLET_DIRECT_1HOP, 0.85, STARTING_SLOT + 41_000_000)

    # Tornado, two hops: Lazarus -> Tornado Cash -> wallet (mixer in path).
    graph.add_node(WALLET_TORNADO_2HOP, label="Off-ramp wallet", source="test_scenario")
    add_transaction(graph, TORNADO_CASH, WALLET_TORNADO_2HOP, 1.6, STARTING_SLOT + 42_000_000)

    # Alternative mixer: Garantex -> Sinbad mixer -> wallet (different sanctioned source + mixer).
    graph.add_node(GARANTEX, label="OFAC: Garantex", source="blocked_wallet")
    graph.add_node(SINBAD_MIXER, label="Sinbad mixer", source="mixer")
    graph.add_node(WALLET_SINBAD_2HOP, label="Off-ramp wallet", source="test_scenario")
    add_transaction(graph, GARANTEX, SINBAD_MIXER, 9.0, STARTING_SLOT + 43_000_000)
    add_transaction(graph, SINBAD_MIXER, WALLET_SINBAD_2HOP, 3.7, STARTING_SLOT + 43_000_200)

    # Plain peel chain, no mixer: Garantex -> hop -> hop -> wallet (3 hops).
    graph.add_node(CHAIN_HOP_1, label="Pass-through wallet", source="test_scenario")
    graph.add_node(CHAIN_HOP_2, label="Pass-through wallet", source="test_scenario")
    graph.add_node(WALLET_PLAIN_CHAIN, label="Off-ramp wallet", source="test_scenario")
    add_transaction(graph, GARANTEX, CHAIN_HOP_1, 20.0, STARTING_SLOT + 44_000_000)
    add_transaction(graph, CHAIN_HOP_1, CHAIN_HOP_2, 12.0, STARTING_SLOT + 44_000_150)
    add_transaction(graph, CHAIN_HOP_2, WALLET_PLAIN_CHAIN, 5.5, STARTING_SLOT + 44_000_300)


def build_wallet_features(graph: nx.DiGraph) -> dict[str, WalletFeatures]:
    features: dict[str, WalletFeatures] = {}
    for address in graph.nodes:
        hour_counter: Counter[int] = Counter()
        day_counter: Counter[int] = Counter()
        amount_counter: Counter[int] = Counter()
        gas_counter: Counter[int] = Counter()
        counterparties: set[str] = set()
        protocols: set[str] = set()
        slots: list[int] = []
        round_amounts = 0
        tx_count = 0

        incident_edges = list(graph.in_edges(address, data=True)) + list(graph.out_edges(address, data=True))
        for source, target, data in incident_edges:
            counterparty = source if target == address else target
            amount = float(data["amount_sol"])
            slot = int(data["slot"])
            tx_count += 1
            counterparties.add(counterparty)
            slots.append(slot)
            hour_counter[slot_hour(slot)] += 1
            day_counter[slot_day(slot)] += 1
            amount_counter[amount_bucket(amount)] += 1
            gas_counter[gas_bucket(slot, address)] += 1
            if abs(amount - round(amount)) < 0.001 or amount % 10 < 0.001:
                round_amounts += 1
            label = protocol_label(counterparty)
            if label:
                protocols.add(label)

        slot_gaps = [right - left for left, right in zip(sorted(slots), sorted(slots)[1:])]
        features[address] = WalletFeatures(
            address=address,
            active_hours=normalized(hour_counter, 24),
            active_days=normalized(day_counter, 7),
            amount_buckets=normalized(amount_counter, 5),
            gas_buckets=normalized(gas_counter, 5),
            counterparties=frozenset(counterparties),
            protocols=frozenset(protocols),
            tx_count=tx_count,
            round_amount_ratio=round_amounts / tx_count if tx_count else 0.0,
            median_gap_slots=median(slot_gaps),
        )
    return features


def build_counterparty_index(features: dict[str, WalletFeatures]) -> dict[str, set[str]]:
    index: dict[str, set[str]] = defaultdict(set)
    for address, wallet_features in features.items():
        for counterparty in wallet_features.counterparties:
            index[counterparty].add(address)
    return dict(index)


def build_idf(counterparty_index: dict[str, set[str]], wallet_count: int) -> dict[str, float]:
    return {
        counterparty: math.log((1 + wallet_count) / (1 + len(wallets))) + 1
        for counterparty, wallets in counterparty_index.items()
    }


def generate_candidate_pairs(counterparty_index: dict[str, set[str]]) -> set[tuple[str, str]]:
    candidates: set[tuple[str, str]] = set()
    for wallets in counterparty_index.values():
        if 1 < len(wallets) <= CANDIDATE_BUCKET_LIMIT:
            for left, right in combinations(sorted(wallets), 2):
                candidates.add((left, right))
                if len(candidates) >= MAX_CANDIDATE_PAIRS:
                    return candidates
    return candidates


def score_identity_pair(
    left: WalletFeatures,
    right: WalletFeatures,
    idf: dict[str, float],
) -> tuple[float, tuple[str, ...]]:
    counterparty_score = weighted_jaccard(left.counterparties, right.counterparties, idf)
    hour_score = histogram_similarity(left.active_hours, right.active_hours)
    day_score = histogram_similarity(left.active_days, right.active_days)
    amount_score = histogram_similarity(left.amount_buckets, right.amount_buckets)
    gas_score = histogram_similarity(left.gas_buckets, right.gas_buckets)
    protocol_score = weighted_jaccard(left.protocols, right.protocols, defaultdict(lambda: 1.0))
    round_score = numeric_similarity(left.round_amount_ratio, right.round_amount_ratio, 1.0)
    gap_score = numeric_similarity(left.median_gap_slots, right.median_gap_slots, 250_000.0)

    confidence = (
        counterparty_score * 0.48
        + hour_score * 0.14
        + day_score * 0.07
        + amount_score * 0.14
        + gas_score * 0.07
        + protocol_score * 0.04
        + round_score * 0.03
        + gap_score * 0.03
    )

    evidence: list[str] = []
    shared_counterparties = left.counterparties & right.counterparties
    rare_shared = [
        counterparty
        for counterparty in shared_counterparties
        if idf.get(counterparty, 1.0) >= 6.0
    ]
    if rare_shared:
        evidence.append(f"{len(rare_shared)} rare shared counterparties")
    if counterparty_score >= 0.55:
        evidence.append(f"counterparty weighted-jaccard {counterparty_score:.2f}")
    if hour_score >= 0.72:
        evidence.append(f"activity-hour profile {hour_score:.2f}")
    if amount_score >= 0.72:
        evidence.append(f"value profile {amount_score:.2f}")
    if gas_score >= 0.68:
        evidence.append(f"fee-priority profile {gas_score:.2f}")

    return round(confidence, 4), tuple(evidence)


def build_identity_links(
    features: dict[str, WalletFeatures],
    counterparty_index: dict[str, set[str]],
) -> list[IdentityLink]:
    idf = build_idf(counterparty_index, len(features))
    links: list[IdentityLink] = []
    for left_address, right_address in generate_candidate_pairs(counterparty_index):
        confidence, evidence = score_identity_pair(features[left_address], features[right_address], idf)
        if confidence >= IDENTITY_REVIEW_THRESHOLD:
            links.append(
                IdentityLink(
                    source=left_address,
                    target=right_address,
                    confidence=confidence,
                    status="AUTO_MERGE" if confidence >= IDENTITY_AUTO_MERGE_THRESHOLD else "REVIEW",
                    evidence=evidence,
                )
            )
    return sorted(links, key=lambda link: link.confidence, reverse=True)


def build_risk_context(graph: nx.DiGraph) -> RiskContext:
    features = build_wallet_features(graph)
    counterparty_index = build_counterparty_index(features)
    identity_links = build_identity_links(features, counterparty_index)
    identity_graph = nx.Graph()
    identity_graph.add_nodes_from(graph.nodes)
    union_find = UnionFind(list(graph.nodes))

    for link in identity_links:
        identity_graph.add_edge(
            link.source,
            link.target,
            confidence=link.confidence,
            status=link.status,
            evidence=link.evidence,
        )
        if link.status == "AUTO_MERGE":
            union_find.union(link.source, link.target)

    return RiskContext(
        features=features,
        counterparty_index=counterparty_index,
        identity_links=identity_links,
        identity_graph=identity_graph,
        union_find=union_find,
    )


def address_label(graph: nx.DiGraph, address: str, fallback: str = "Unknown wallet") -> str:
    if address in FRIENDLY_WALLET_LABELS:
        return FRIENDLY_WALLET_LABELS[address]
    label = graph.nodes.get(address, {}).get("label")
    if isinstance(label, str) and label and label != "synthetic_wallet":
        return label
    if address in LEGITIMATE_HUBS:
        return LEGITIMATE_HUBS[address]
    if address in BLOCKED_WALLETS:
        return "Blocked wallet"
    return fallback


def classify_node_kind(graph: nx.DiGraph, address: str, *, is_sender: bool = False) -> str:
    # A directly-matched sanctioned wallet stays red even when it's the sender.
    if address in BLOCKED_WALLETS:
        return "sanctioned"
    if is_sender:
        return "sender"
    if graph.nodes.get(address, {}).get("source") == "mixer_inflow":
        return "wallet"
    label = address_label(graph, address).lower()
    if "mixer" in label or "mixer" in address.lower():
        return "mixer"
    if address in LEGITIMATE_HUBS:
        return "wallet"
    return "intermediary"


def edge_amount(graph: nx.DiGraph, source: str, target: str) -> float | None:
    if graph.has_edge(source, target):
        return float(graph[source][target]["amount_sol"])
    return None


def edge_label(graph: nx.DiGraph, source: str, target: str, fallback: str = "behavioral link") -> str:
    amount = edge_amount(graph, source, target)
    if amount is None:
        return fallback
    return f"{amount:.4f} SOL"


def derive_deposit_amount(graph: nx.DiGraph, wallet: str, value_path: list[str] | None = None) -> float:
    """The SOL amount associated with a wallet's deposit/off-ramp.

    Prefers the wallet's largest outbound transfer; falls back to the funds that
    arrived along the taint path, then to its largest inbound transfer.
    """
    out_amounts = [float(data["amount_sol"]) for _, _, data in graph.out_edges(wallet, data=True)]
    if out_amounts:
        return round(max(out_amounts), 4)
    if value_path is not None and len(value_path) >= 2:
        amount = edge_amount(graph, value_path[-2], value_path[-1])
        if amount is not None:
            return round(amount, 4)
    in_amounts = [float(data["amount_sol"]) for _, _, data in graph.in_edges(wallet, data=True)]
    if in_amounts:
        return round(max(in_amounts), 4)
    return 0.0


def off_ramp_label(graph: nx.DiGraph, checked_wallet: str, value_path: list[str] | None = None) -> str:
    """SOL amount the sender forwards to the exchange, as an edge label."""
    amount = derive_deposit_amount(graph, checked_wallet, value_path)
    return f"{amount:.4f} SOL" if amount > 0 else ""


def signal_breakdown(
    graph: nx.DiGraph,
    value_path: list[str] | None,
    identity_exposure: dict[str, Any] | None,
    quarantine: dict[str, Any] | None,
) -> dict[str, Any]:
    if quarantine is not None:
        blocked_source = str(quarantine["blocked_source"])
        mixer_detected = "mixer" in blocked_source.lower() or "mixer" in address_label(graph, blocked_source).lower()
        return {
            "hops_to_sanctioned": 1,
            "mixer_in_path": mixer_detected,
            "mixer_label": "Quarantined mixer source" if mixer_detected else None,
            "exposed_volume_sol": float(quarantine["quarantined_amount_sol"]),
            "hops_traced": 1,
            "sanction_label": address_label(graph, blocked_source, fallback="Blocked source"),
        }

    if value_path is not None and len(value_path) > 0:
        amounts: list[float] = []
        for source, target in zip(value_path, value_path[1:]):
            amount = edge_amount(graph, source, target)
            if amount is not None:
                amounts.append(amount)
        mixer_nodes = [node for node in value_path[:-1] if classify_node_kind(graph, node) == "mixer"]
        # On a direct match the path is a single node (no edges), so fall back to the
        # wallet's own deposit amount instead of reporting 0 exposed volume.
        exposed = min(amounts) if amounts else derive_deposit_amount(graph, value_path[-1])
        return {
            "hops_to_sanctioned": max(0, len(value_path) - 1),
            "mixer_in_path": len(mixer_nodes) > 0,
            "mixer_label": address_label(graph, mixer_nodes[0]) if mixer_nodes else None,
            "exposed_volume_sol": exposed,
            "hops_traced": min(MAX_REVERSE_HOPS, max(1, len(value_path) - 1)),
            "sanction_label": address_label(graph, value_path[0], fallback="Blocked source"),
        }

    if identity_exposure is not None:
        path = identity_exposure.get("path_to_blocked")
        amounts: list[float] = []
        if isinstance(path, list):
            for source, target in zip(path, path[1:]):
                amount = edge_amount(graph, source, target)
                if amount is not None:
                    amounts.append(amount)
        return {
            "hops_to_sanctioned": int(identity_exposure["linked_wallet_hops_to_blocked"]),
            "mixer_in_path": False,
            "mixer_label": None,
            "exposed_volume_sol": min(amounts) if amounts else 0.0,
            "hops_traced": MAX_REVERSE_HOPS,
            "sanction_label": "Blocked-linked entity via identity graph",
        }

    return {
        "hops_to_sanctioned": 99,
        "mixer_in_path": False,
        "mixer_label": None,
        "exposed_volume_sol": 0.0,
        "hops_traced": MAX_REVERSE_HOPS,
        "sanction_label": None,
    }


def build_neighborhood_graph(graph: nx.DiGraph, checked_wallet: str) -> dict[str, Any]:
    predecessors = sorted(
        list(graph.predecessors(checked_wallet)),
        key=lambda address: graph.in_degree(address) + graph.out_degree(address),
        reverse=True,
    )[:2]

    nodes: list[dict[str, Any]] = []
    edges: list[dict[str, Any]] = []
    for row, predecessor in enumerate(predecessors):
        node_kind = classify_node_kind(graph, predecessor)
        nodes.append({
            "id": predecessor,
            "type": node_kind,
            "position": {"x": 0, "y": row * 120},
            "data": {"label": address_label(graph, predecessor), "address": predecessor},
        })
        edges.append({
            "id": f"e-{predecessor}-sender",
            "source": predecessor,
            "target": "sender",
            "label": edge_label(graph, predecessor, checked_wallet),
            "className": "edge-clean",
            "type": "smoothstep",
        })

    nodes.append({
        "id": "sender",
        "type": "sender",
        "position": {"x": 280, "y": 0},
        "data": {"label": "Sender", "address": checked_wallet},
    })
    nodes.append({
        "id": "exchange",
        "type": "exchange",
        "position": {"x": 560, "y": 0},
        "data": {"label": "Your hot wallet", "address": EXCHANGE_HOT_WALLET},
    })
    edges.append({
        "id": "e-sender-exchange",
        "source": "sender",
        "target": "exchange",
        "label": off_ramp_label(graph, checked_wallet),
        "className": "edge-clean",
        "type": "smoothstep",
    })
    return {"nodes": nodes, "edges": edges}


def build_transaction_graph(
    graph: nx.DiGraph,
    checked_wallet: str,
    value_path: list[str] | None,
    identity_exposure: dict[str, Any] | None,
    quarantine: dict[str, Any] | None,
) -> dict[str, Any]:
    if value_path is None and identity_exposure is None and quarantine is None:
        return build_neighborhood_graph(graph, checked_wallet)

    nodes: list[dict[str, Any]] = []
    edges: list[dict[str, Any]] = []
    by_address: dict[str, str] = {}
    existing_ids: set[str] = set()

    def add_node(
        address: str,
        col: int,
        row: int = 0,
        force_sender: bool = False,
        node_id: str | None = None,
    ) -> str:
        resolved_id = node_id or ("sender" if force_sender else address)
        if resolved_id in existing_ids:
            return resolved_id
        existing_ids.add(resolved_id)
        # A normal sender is labeled "Sender"; a directly-blocked sender keeps its
        # sanction label so the red node reads as the OFAC entity it matched.
        if force_sender and address not in BLOCKED_WALLETS:
            node_label = "Sender"
        else:
            node_label = address_label(graph, address)
        nodes.append({
            "id": resolved_id,
            "type": classify_node_kind(graph, address, is_sender=force_sender),
            "position": {"x": col * 280, "y": row * 120},
            "data": {"label": node_label, "address": address},
        })
        by_address[address] = resolved_id
        return resolved_id

    def add_mixer_inflows(path: list[str]) -> None:
        """Show up to two other (valid) wallets that also deposited into a mixer in the path."""
        for index, address in enumerate(path):
            if index == 0 or classify_node_kind(graph, address) != "mixer":
                continue
            mixer_id = by_address.get(address)
            if mixer_id is None:
                continue
            upstream = path[index - 1]
            extras = [
                pred
                for pred in graph.predecessors(address)
                if pred != upstream and pred not in BLOCKED_WALLETS
            ]
            # Prefer the explicitly labeled co-mixing depositors, then deterministic order.
            extras.sort(key=lambda pred: (graph.nodes[pred].get("source") != "mixer_inflow", pred))
            for row, source in enumerate(extras[:1], start=1):
                source_id = add_node(source, max(0, index - 1), row=row)
                edges.append({
                    "id": f"e-{source_id}-{mixer_id}",
                    "source": source_id,
                    "target": mixer_id,
                    "label": edge_label(graph, source, address),
                    "className": "edge-clean",
                    "type": "smoothstep",
                })

    if quarantine is not None:
        blocked_source = str(quarantine["blocked_source"])
        source_id = add_node(blocked_source, 0)
        sender_id = add_node(checked_wallet, 1, force_sender=True)
        edges.append({
            "id": f"e-{source_id}-{sender_id}",
            "source": source_id,
            "target": sender_id,
            "label": f"{float(quarantine['quarantined_amount_sol']):.4f} SOL",
            "className": "edge-danger",
            "type": "smoothstep",
        })
    elif value_path is not None and len(value_path) > 0:
        for index, address in enumerate(value_path):
            add_node(address, index, force_sender=index == len(value_path) - 1)
        for source, target in zip(value_path, value_path[1:]):
            source_id = by_address[source]
            target_id = by_address[target]
            source_kind = classify_node_kind(graph, source)
            edges.append({
                "id": f"e-{source_id}-{target_id}",
                "source": source_id,
                "target": target_id,
                "label": edge_label(graph, source, target),
                "className": "edge-danger" if source_kind in {"sanctioned", "mixer"} else "edge-tainted",
                "type": "smoothstep",
            })
        add_mixer_inflows(value_path)
    elif identity_exposure is not None:
        path_to_blocked = identity_exposure.get("path_to_blocked")
        if isinstance(path_to_blocked, list) and len(path_to_blocked) > 0:
            for index, address in enumerate(path_to_blocked):
                add_node(address, index, node_id="linked-wallet" if index == len(path_to_blocked) - 1 else None)
            for source, target in zip(path_to_blocked, path_to_blocked[1:]):
                source_id = by_address[source]
                target_id = by_address[target]
                source_kind = classify_node_kind(graph, source)
                edges.append({
                    "id": f"e-{source_id}-{target_id}",
                    "source": source_id,
                    "target": target_id,
                    "label": edge_label(graph, source, target),
                    "className": "edge-danger" if source_kind in {"sanctioned", "mixer"} else "edge-tainted",
                    "type": "smoothstep",
                })
            add_mixer_inflows(path_to_blocked)
            linked_id = by_address[path_to_blocked[-1]]
            sender_id = add_node(checked_wallet, len(path_to_blocked), force_sender=True)
            edges.append({
                "id": "e-linked-wallet-sender",
                "source": linked_id,
                "target": sender_id,
                "label": f"identity {float(identity_exposure['confidence']):.2f}",
                "className": "edge-clean",
                "type": "smoothstep",
            })

    if "sender" not in existing_ids:
        add_node(checked_wallet, 1, force_sender=True)

    max_col = max(int(node["position"]["x"] / 280) for node in nodes) if nodes else 1
    nodes.append({
        "id": "exchange",
        "type": "exchange",
        "position": {"x": (max_col + 1) * 280, "y": 0},
        "data": {"label": "Your hot wallet", "address": EXCHANGE_HOT_WALLET},
    })
    # A quarantined (dusting) wallet never forwarded funds to the exchange, so the
    # off-ramp edge reads "no off-ramp" instead of mislabeling an unrelated inflow.
    off_ramp = "no off-ramp" if quarantine is not None else off_ramp_label(graph, checked_wallet, value_path)
    edges.append({
        "id": "e-sender-exchange",
        "source": "sender",
        "target": "exchange",
        "label": off_ramp,
        "className": "edge-tainted-faded",
        "type": "smoothstep",
    })
    return {"nodes": nodes, "edges": edges}


def evaluate_wallet_risk(
    graph: nx.DiGraph,
    wallet_address: str,
    context: RiskContext | None = None,
) -> dict[str, Any]:
    result = _classify_wallet_risk(graph, wallet_address, context)
    result["deposit_amount"] = derive_deposit_amount(graph, wallet_address)
    return result


def _classify_wallet_risk(
    graph: nx.DiGraph,
    wallet_address: str,
    context: RiskContext | None = None,
) -> dict[str, Any]:
    started_at = time.perf_counter()
    context = context or build_risk_context(graph)

    if wallet_address in BLOCKED_WALLETS:
        value_path = [wallet_address]
        return format_result(
            started_at,
            wallet_address,
            "MATCH",
            0,
            risk_sources=["direct blocked-wallet match"],
            explanation="Wallet is explicitly present in BLOCKED_WALLETS.",
            signal_breakdown=signal_breakdown(graph, value_path, None, None),
            transaction_graph=build_transaction_graph(graph, wallet_address, value_path, None, None),
        )

    poisoning_exposure = detect_poisoning_exposure(graph, wallet_address)
    if poisoning_exposure is not None:
        return format_result(
            started_at,
            wallet_address,
            "NO MATCH",
            None,
            risk_sources=["quarantined inbound exposure"],
            explanation=(
                "Wallet only received a tiny unsolicited inbound transfer from a blocked source; "
                "no outbound movement detected, so exposure is quarantined rather than flagged."
            ),
            signal_breakdown=signal_breakdown(graph, None, None, poisoning_exposure),
            transaction_graph=build_transaction_graph(graph, wallet_address, None, None, poisoning_exposure),
            quarantine=poisoning_exposure,
        )

    value_path = find_blocked_source_path(graph, wallet_address)
    value_hops = len(value_path) - 1 if value_path is not None else None
    if value_hops is not None and value_hops <= REVIEW_HOP_LIMIT:
        return format_result(
            started_at,
            wallet_address,
            "REVIEW",
            value_hops,
            risk_sources=["value-taint path"],
            explanation=f"Reverse traversal found blocked source {value_hops} hops upstream.",
            signal_breakdown=signal_breakdown(graph, value_path, None, None),
            transaction_graph=build_transaction_graph(graph, wallet_address, value_path, None, None),
        )

    identity_exposure = find_identity_exposure(graph, context, wallet_address)
    if identity_exposure is not None:
        return format_result(
            started_at,
            wallet_address,
            "REVIEW",
            None,
            risk_sources=["identity-link inherited risk"],
            explanation=(
                "Probabilistic identity link points to a wallet with deterministic taint; "
                "kept as REVIEW instead of MATCH."
            ),
            signal_breakdown=signal_breakdown(graph, None, identity_exposure, None),
            transaction_graph=build_transaction_graph(graph, wallet_address, None, identity_exposure, None),
            identity_link=identity_exposure,
        )

    return format_result(
        started_at,
        wallet_address,
        "NO MATCH",
        None,
        risk_sources=[],
        explanation="No blocked source within value traversal and no risky identity link.",
        signal_breakdown=signal_breakdown(graph, None, None, None),
        transaction_graph=build_transaction_graph(graph, wallet_address, None, None, None),
    )


def detect_poisoning_exposure(graph: nx.DiGraph, wallet_address: str) -> dict[str, Any] | None:
    inbound_blocked_edges = [
        (source, data)
        for source, _, data in graph.in_edges(wallet_address, data=True)
        if source in BLOCKED_WALLETS
    ]
    if len(inbound_blocked_edges) != 1 or graph.out_degree(wallet_address) > 0:
        return None

    source, data = inbound_blocked_edges[0]
    amount = float(data["amount_sol"])
    if amount > 0.01:
        return None

    return {
        "blocked_source": source,
        "quarantined_amount_sol": amount,
        "tx_signature": data["tx_signature"],
        "reason": "single tiny inbound transfer with no outbound movement",
    }


def find_blocked_source_path(graph: nx.DiGraph, wallet_address: str) -> list[str] | None:
    visited = {wallet_address}
    parent: dict[str, str | None] = {wallet_address: None}
    queue: deque[tuple[str, int]] = deque([(wallet_address, 0)])

    while queue:
        current_wallet, depth = queue.popleft()
        if depth >= MAX_REVERSE_HOPS:
            continue

        for predecessor in graph.predecessors(current_wallet):
            next_depth = depth + 1
            if predecessor in visited:
                continue
            if predecessor in BLOCKED_WALLETS:
                parent[predecessor] = current_wallet
                path: list[str] = [predecessor]
                while path[-1] != wallet_address:
                    next_wallet = parent[path[-1]]
                    if next_wallet is None:
                        break
                    path.append(next_wallet)
                return path
            visited.add(predecessor)
            parent[predecessor] = current_wallet
            queue.append((predecessor, next_depth))

    return None


def find_identity_exposure(
    graph: nx.DiGraph,
    context: RiskContext,
    wallet_address: str,
) -> dict[str, Any] | None:
    if wallet_address not in context.identity_graph:
        return None

    best_match: dict[str, Any] | None = None
    for linked_wallet in context.identity_graph.neighbors(wallet_address):
        edge = context.identity_graph[wallet_address][linked_wallet]
        path_to_blocked = find_blocked_source_path(graph, linked_wallet)
        linked_hops = len(path_to_blocked) - 1 if path_to_blocked is not None else None
        if linked_hops is None and linked_wallet in BLOCKED_WALLETS:
            linked_hops = 0
            path_to_blocked = [linked_wallet]
        if linked_hops is None:
            continue

        confidence = float(edge["confidence"])
        inherited_risk = round(confidence * 100, 2)
        candidate = {
            "linked_wallet": linked_wallet,
            "confidence": confidence,
            "inherited_risk_score": inherited_risk,
            "linked_wallet_hops_to_blocked": linked_hops,
            "status": edge["status"],
            "evidence": list(edge["evidence"]),
            "path_to_blocked": path_to_blocked,
        }
        if best_match is None or inherited_risk > best_match["inherited_risk_score"]:
            best_match = candidate
    return best_match


def compute_risk_score(
    verdict: str,
    hops_detected: int | None,
    signal_breakdown: dict[str, Any],
    identity_link: dict[str, Any] | None,
    quarantine: dict[str, Any] | None,
) -> int:
    """Deterministic 0–100 risk score derived from the verdict and signals.

    Direct sanctions hits dominate; quarantined dust is near-zero; review cases
    are spread across a band based on hop distance, mixer presence, and exposed
    volume so distinct cases get distinct scores.
    """
    if verdict == "MATCH":
        return 100
    if quarantine is not None:
        return 14
    if identity_link is not None:
        return round(float(identity_link["inherited_risk_score"]))
    if verdict == "REVIEW":
        hops = hops_detected
        if hops is None:
            hops = signal_breakdown.get("hops_to_sanctioned") or 3
        # Closer to the sanctioned source = higher; a mixer and larger exposed
        # volume push it up further.
        score = 84 - (hops - 1) * 9
        if signal_breakdown.get("mixer_in_path"):
            score += 7
        score += min(8, round(float(signal_breakdown.get("exposed_volume_sol", 0.0))))
        return max(40, min(96, score))
    return 6


def _fmt_sol(amount: float) -> str:
    if amount <= 0:
        return "0 SOL"
    if amount < 1:
        return f"{amount:.4f} SOL"
    return f"{amount:.2f} SOL"


def _hops_phrase(hops: int) -> str:
    return "1 hop" if hops == 1 else f"{hops} hops"


def build_reasoning(
    verdict: str,
    hops_detected: int | None,
    signal_breakdown: dict[str, Any],
    identity_link: dict[str, Any] | None,
    quarantine: dict[str, Any] | None,
) -> tuple[list[dict[str, str]], str]:
    """Single source of truth for the case narrative.

    Returns an ordered list of structured risk factors (rendered as "Why this
    verdict") and a pre-filled audit note derived from the *same* data, so the
    two always agree and stay specific to the case.
    """
    sb = signal_breakdown
    exposed = float(sb.get("exposed_volume_sol", 0.0))
    sanction = sb.get("sanction_label") or "a sanctioned source"
    mixer_in = bool(sb.get("mixer_in_path"))
    mixer_label = sb.get("mixer_label") or "a known mixer"

    if verdict == "MATCH":
        factors = [
            {"type": "match", "text": f"Sender address is a direct match to {sanction} on the sanctions list."},
            {"type": "exposed", "text": f"Deposit amount: {_fmt_sol(exposed)}."},
            {"type": "policy", "text": "Direct OFAC matches are auto-rejected at the off-ramp — no analyst discretion."},
        ]
        note = (
            f"Direct sanctions hit: sender matches {sanction}. "
            f"Deposit of {_fmt_sol(exposed)} auto-rejected per policy (direct OFAC match)."
        )
        return factors, note

    if quarantine is not None:
        factors = [
            {"type": "quarantine", "text": f"Received {_fmt_sol(exposed)} of unsolicited dust from {sanction}."},
            {"type": "clean", "text": "No outbound movement — the exposure is isolated, not propagated downstream."},
            {"type": "policy", "text": "Quarantined instead of flagging the wallet; protects against dusting / taint-poisoning."},
        ]
        note = (
            f"Quarantined: {_fmt_sol(exposed)} dust received from {sanction}; no outbound movement detected. "
            "Exposure isolated — wallet not flagged. Accepted."
        )
        return factors, note

    if identity_link is not None:
        confidence = float(identity_link["confidence"]) * 100
        evidence = "; ".join(identity_link.get("evidence", [])) or "behavioral overlap"
        linked_hops = int(identity_link["linked_wallet_hops_to_blocked"])
        factors = [
            {"type": "identity", "text": f"Behaviorally linked to a tainted wallet with {confidence:.1f}% confidence."},
            {"type": "identity", "text": f"Evidence: {evidence}."},
            {"type": "hops", "text": f"The linked wallet sits {_hops_phrase(linked_hops)} from a blocked source."},
            {"type": "policy", "text": "Identity links are probabilistic, so the case is reviewed rather than auto-blocked."},
        ]
        note = (
            f"Flagged via identity link: behaviorally matched to a tainted wallet "
            f"({confidence:.1f}% confidence; {evidence}). Linked wallet is {_hops_phrase(linked_hops)} "
            "from a blocked source. Probabilistic match — routed to analyst review."
        )
        return factors, note

    if verdict == "REVIEW":
        hops = hops_detected if hops_detected is not None else int(sb.get("hops_to_sanctioned", 0))
        factors = [
            {"type": "hops", "text": f"Funds reached the sender {_hops_phrase(hops)} downstream of {sanction}."},
        ]
        if mixer_in:
            factors.append({"type": "mixer", "text": f"Path routes through {mixer_label}, used to obscure fund origin."})
        factors.append({"type": "exposed", "text": f"Tainted volume reaching the wallet: {_fmt_sol(exposed)}."})
        factors.append({"type": "policy", "text": "Indirect taint within the review hop-window requires analyst review, not an auto-block."})

        note_parts = [f"Flagged: tainted funds reached the sender {_hops_phrase(hops)} after {sanction}."]
        if mixer_in:
            note_parts.append(f"Path includes {mixer_label}, used to obscure origin.")
        note_parts.append(f"Exposed volume {_fmt_sol(exposed)}. Routed to analyst review per policy.")
        return factors, " ".join(note_parts)

    # NO MATCH, no quarantine — genuinely clean.
    hops_traced = int(sb.get("hops_traced", MAX_REVERSE_HOPS))
    factors = [
        {"type": "clean", "text": f"No blocked source found within the {hops_traced}-hop reverse search."},
        {"type": "clean", "text": "No risky identity links detected."},
    ]
    note = "No sanctions exposure within traced hops and no risky identity links. Auto-accepted."
    return factors, note


def format_result(
    started_at: float,
    checked_wallet: str,
    verdict: str,
    hops_detected: int | None,
    risk_sources: list[str],
    explanation: str,
    signal_breakdown: dict[str, Any],
    transaction_graph: dict[str, Any],
    identity_link: dict[str, Any] | None = None,
    quarantine: dict[str, Any] | None = None,
) -> dict[str, Any]:
    risk_factors, audit_note = build_reasoning(
        verdict, hops_detected, signal_breakdown, identity_link, quarantine
    )
    result = {
        "checked_wallet": checked_wallet,
        "verdict": verdict,
        "hops_detected": hops_detected,
        "execution_time_ms": round((time.perf_counter() - started_at) * 1000, 3),
        "risk_score": compute_risk_score(
            verdict, hops_detected, signal_breakdown, identity_link, quarantine
        ),
        "risk_sources": risk_sources,
        "explanation": explanation,
        "risk_factors": risk_factors,
        "audit_note": audit_note,
        "signal_breakdown": signal_breakdown,
        "transaction_graph": transaction_graph,
    }
    if identity_link is not None:
        result["identity_link"] = identity_link
    if quarantine is not None:
        result["quarantine"] = quarantine
    return result


# The scale-free graph and identity context are deterministic (fixed seed) and
# expensive to build, so cache them at module scope. Screening then reuses the
# cached graph (read-only) or a cheap copy, keeping every request fast.
_CACHED_GRAPH: nx.DiGraph | None = None
_CACHED_CONTEXT: RiskContext | None = None


def base_graph_and_context() -> tuple[nx.DiGraph, RiskContext]:
    global _CACHED_GRAPH, _CACHED_CONTEXT
    if _CACHED_GRAPH is None:
        _CACHED_GRAPH = build_scale_free_graph()
        _CACHED_CONTEXT = build_risk_context(_CACHED_GRAPH)
    assert _CACHED_CONTEXT is not None
    return _CACHED_GRAPH, _CACHED_CONTEXT


def run_test_runner() -> list[dict[str, Any]]:
    graph, context = base_graph_and_context()
    # Each wallet produces a distinct graph topology (direct match, mixer paths,
    # plain peel chain, identity link, dusting, clean). The first three REVIEW
    # cases seed the "Pending" column and the next two seed "Awaiting documents"
    # (see column seeding in ChainSightApp).
    test_wallets = [
        TEST_WALLET_DIRECT_MATCH,     # BLOCKED — direct OFAC match
        WALLET_TORNADO_2HOP,          # REVIEW  — pending
        WALLET_SINBAD_2HOP,           # REVIEW  — pending
        WALLET_PLAIN_CHAIN,           # REVIEW  — pending
        WALLET_DIRECT_1HOP,           # REVIEW  — awaiting
        TEST_WALLET_IDENTITY_LINKED,  # REVIEW  — awaiting (identity link)
        TEST_WALLET_POISONED,         # CLEARED — quarantined dust
        TEST_WALLET_CLEAN,            # CLEARED — clean
    ]
    return [evaluate_wallet_risk(graph, wallet, context) for wallet in test_wallets]


def run_single_wallet(wallet_address: str) -> dict[str, Any]:
    graph, context = base_graph_and_context()
    return evaluate_wallet_risk(graph, wallet_address, context)


def run_transfer_screening(
    sender_wallet: str,
    recipient_wallet: str,
    amount_sol: float,
    token: str,
) -> dict[str, Any]:
    base_graph, base_context = base_graph_and_context()
    graph = base_graph.copy()
    simulate_transfer_into_wallet(
        graph=graph,
        sender_wallet=sender_wallet,
        recipient_wallet=recipient_wallet,
        amount_sol=amount_sol,
        token=token,
    )
    # The injected taint channel guarantees a deterministic value path to the
    # sender, so the cached identity context is sufficient (no rebuild needed).
    result = evaluate_wallet_risk(graph, sender_wallet, base_context)
    result["screen_request"] = {
        "sender_wallet": sender_wallet,
        "recipient_wallet": recipient_wallet,
        "amount": amount_sol,
        "token": token,
    }
    return result


if __name__ == "__main__":
    if len(sys.argv) > 1:
        print(json.dumps(run_single_wallet(sys.argv[1]), indent=2))
    else:
        print(json.dumps(run_test_runner(), indent=2))
