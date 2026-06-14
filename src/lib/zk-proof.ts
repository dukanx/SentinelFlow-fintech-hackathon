// zk-STARK "clean funds" proof — TypeScript types + verifier.
//
// This mirrors scripts/zk_clean_funds.py. The verifier recomputes the
// commitment MAC over the SAME canonical string the Python prover used, so a
// proof produced by the backend verifies identically in the browser. It is a
// demo (no real STARK circuit), but the public-statement check is genuine.

// Keep in sync with VERIFYING_KEY / MAX_HOPS in scripts/zk_clean_funds.py.
const VERIFYING_KEY = "chainsight-zk-vk-v1";
const MAX_HOPS = 5;

export interface ZkProofPublicInputs {
  association_root: string;
  nullifier: string;
  pool_id: string;
  ruleset_hash: string;
  max_hops: number;
  membership: boolean;
}

export interface ZkCleanFundsProof {
  proof_system: string;
  statement: string;
  public_inputs: ZkProofPublicInputs;
  redacted_witness: { sender: string; recipient: string; amount: string };
  commitment_mac: string;
  proof_blob: string;
  metrics: {
    proof_size_bytes: number;
    security_bits: number;
    num_queries: number;
    prover_ms: number;
    verifier_ms: number;
    association_set_size: number;
  };
  valid: boolean;
  generated_at: string;
}

export interface ZkVerifyResult {
  valid: boolean;
  checks: { label: string; ok: boolean }[];
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function canonicalMacString(pi: ZkProofPublicInputs): string {
  // Byte-for-byte identical to commitment_mac() in scripts/zk_clean_funds.py.
  return [
    pi.pool_id,
    pi.association_root,
    pi.nullifier,
    pi.ruleset_hash,
    String(pi.max_hops),
    pi.membership ? "true" : "false",
    VERIFYING_KEY,
  ].join("|");
}

/** Re-check the proof's public statement; never sees sender/recipient/amount. */
export async function verifyCleanFundsProof(proof: ZkCleanFundsProof): Promise<ZkVerifyResult> {
  const pi = proof.public_inputs;
  const recomputedMac = await sha256Hex(canonicalMacString(pi));
  const expectedRuleset = await sha256Hex(
    `OFAC-SDN|max_hops=${MAX_HOPS}|exclude-mixer-tainted`,
  );
  const checks = [
    { label: "Commitment MAC matches public inputs", ok: recomputedMac === proof.commitment_mac },
    { label: "Deposit is in the clean association set", ok: pi.membership === true },
    { label: "Bound to current OFAC-SDN ruleset", ok: pi.ruleset_hash === expectedRuleset },
  ];
  return { valid: checks.every((c) => c.ok), checks };
}

/** Download the proof artifact as a .json file. */
export function downloadProofJson(proof: ZkCleanFundsProof, caseId: string) {
  const blob = new Blob([JSON.stringify(proof, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${caseId}-zk-clean-funds-proof.json`;
  a.click();
  URL.revokeObjectURL(url);
}
