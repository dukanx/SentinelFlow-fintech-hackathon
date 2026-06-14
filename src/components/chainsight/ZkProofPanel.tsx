import { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  EyeOff,
  Download,
  Check,
  X as XIcon,
  Loader2,
  Fingerprint,
} from "lucide-react";
import {
  downloadProofJson,
  verifyCleanFundsProof,
  type ZkCleanFundsProof,
  type ZkVerifyResult,
} from "@/lib/zk-proof";

interface Props {
  proof: ZkCleanFundsProof;
  caseId: string;
}

function shortHex(hex: string, head = 10, tail = 6): string {
  if (!hex || hex.length <= head + tail + 1) return hex;
  return `${hex.slice(0, head)}…${hex.slice(-tail)}`;
}

export function ZkProofPanel({ proof, caseId }: Props) {
  const [result, setResult] = useState<ZkVerifyResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const provable = proof.valid;

  async function handleVerify() {
    setVerifying(true);
    // Tiny delay so the "verifying" state is perceptible in the demo.
    await new Promise((r) => setTimeout(r, 250));
    setResult(await verifyCleanFundsProof(proof));
    setVerifying(false);
  }

  const pi = proof.public_inputs;

  return (
    <div className="rounded-xl border bg-surface overflow-hidden">
      <div
        className={`px-5 py-3 border-b flex items-center justify-between gap-3 ${
          provable ? "bg-verdict-cleared-soft/30" : "bg-verdict-blocked-soft/30"
        }`}
      >
        <div className="flex items-center gap-2">
          {provable ? (
            <ShieldCheck className="size-4 text-verdict-cleared" />
          ) : (
            <ShieldAlert className="size-4 text-verdict-blocked" />
          )}
          <h3 className="text-sm font-medium">zk-STARK clean-funds proof</h3>
        </div>
        <span
          className={`text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full border ${
            provable
              ? "text-verdict-cleared border-verdict-cleared/40 bg-verdict-cleared-soft/40"
              : "text-verdict-blocked border-verdict-blocked/40 bg-verdict-blocked-soft/40"
          }`}
        >
          {provable ? "Provable" : "Unprovable"}
        </span>
      </div>

      <div className="p-5 space-y-4">
        <p className="text-xs text-muted-foreground leading-relaxed">{proof.statement}</p>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {proof.proof_system}
        </p>

        {/* Shielded witness — the private inputs the proof does NOT reveal */}
        <div className="rounded-lg border bg-surface-2/40 p-3">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
            <EyeOff className="size-3" />
            Shielded witness (hidden by the proof)
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            {(["sender", "recipient", "amount"] as const).map((k) => (
              <div key={k}>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
                <div className="font-mono text-muted-foreground/70 tracking-widest">••••••</div>
              </div>
            ))}
          </div>
        </div>

        {/* Public inputs — what is actually disclosed */}
        <div>
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
            <Fingerprint className="size-3" />
            Public inputs
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
            <Row label="Association root" value={shortHex(pi.association_root)} mono />
            <Row label="Nullifier" value={shortHex(pi.nullifier)} mono />
            <Row label="Pool" value={pi.pool_id} />
            <Row label="Ruleset hash" value={shortHex(pi.ruleset_hash)} mono />
            <Row label="Max hops" value={String(pi.max_hops)} />
            <Row
              label="Membership"
              value={pi.membership ? "in clean set" : "not in clean set"}
            />
          </dl>
        </div>

        {/* Proof metrics */}
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-muted-foreground">
          <span>{proof.metrics.proof_size_bytes} B</span>
          <span>{proof.metrics.security_bits}-bit security</span>
          <span>{proof.metrics.num_queries} FRI queries</span>
          <span>prover {proof.metrics.prover_ms} ms</span>
          <span>verifier {proof.metrics.verifier_ms} ms</span>
          <span>set size {proof.metrics.association_set_size}</span>
        </div>

        {/* Verification result */}
        {result && (
          <div
            className={`rounded-lg border p-3 ${
              result.valid
                ? "border-verdict-cleared/40 bg-verdict-cleared-soft/20"
                : "border-verdict-blocked/40 bg-verdict-blocked-soft/20"
            }`}
          >
            <div
              className={`text-sm font-medium mb-2 ${
                result.valid ? "text-verdict-cleared" : "text-verdict-blocked"
              }`}
            >
              {result.valid ? "Proof verified — funds provably clean" : "Proof invalid — cannot accept"}
            </div>
            <ul className="space-y-1">
              {result.checks.map((c) => (
                <li key={c.label} className="flex items-center gap-2 text-xs">
                  {c.ok ? (
                    <Check className="size-3.5 text-verdict-cleared shrink-0" />
                  ) : (
                    <XIcon className="size-3.5 text-verdict-blocked shrink-0" />
                  )}
                  <span className={c.ok ? "" : "text-muted-foreground"}>{c.label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleVerify}
            disabled={verifying}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border bg-primary/10 hover:bg-primary/20 disabled:opacity-60"
          >
            {verifying ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}
            {verifying ? "Verifying…" : "Verify proof"}
          </button>
          <button
            type="button"
            onClick={() => downloadProofJson(proof, caseId)}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border hover:bg-accent"
          >
            <Download className="size-3.5" />
            Download .json
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className={`truncate ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}
