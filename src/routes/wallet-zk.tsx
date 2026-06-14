import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
  Lock,
  Loader2,
  X,
  EyeOff,
} from "lucide-react";
import { createWalletDepositFromBackend, depositStore } from "@/lib/deposit-store";
import { EXCHANGE_HOT_WALLET } from "@/lib/config";
import type { Deposit } from "@/lib/mock-data";
import { ZkProofPanel } from "@/components/chainsight/ZkProofPanel";

export const Route = createFileRoute("/wallet-zk")({
  head: () => ({
    meta: [
      { title: "Private Wallet (zk) — ChainSight" },
      {
        name: "description",
        content:
          "Demo wallet that sends shielded deposits through a privacy pool and proves clean funds with a zk-STARK.",
      },
    ],
  }),
  component: PrivateWalletPage,
});

const WALLET_ADDRESS = "zkW1Demo7Privacyooo1Shielded1Walletxxxxxxxxx";
type Scenario = "zk_clean" | "zk_tainted";

function PrivateWalletPage() {
  const [recipient, setRecipient] = useState(EXCHANGE_HOT_WALLET);
  const [amount, setAmount] = useState("0.4");
  const [busy, setBusy] = useState<Scenario | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Deposit | null>(null);

  async function send(scenario: Scenario) {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || !recipient || busy) return;
    setBusy(scenario);
    setError(null);
    try {
      const dep = await createWalletDepositFromBackend({
        sender: WALLET_ADDRESS,
        amount,
        token: "SOL",
        recipient,
        scenario,
      });
      // Surfaces in the dashboard live alerts / case list (and other tabs).
      depositStore.add(dep);
      setResult(dep);
    } catch (e) {
      console.error(e);
      setError("Screening backend nije dostupan — provjeri da Python risk API radi.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-[oklch(0.97_0.005_260)] flex flex-col">
      {/* Demo banner */}
      <div className="bg-violet-100 border-b border-violet-300 text-violet-900 text-xs px-4 py-2 flex items-center justify-center gap-2">
        <Lock className="size-3.5" />
        <span>
          Private (zk) demo wallet — deposits are shielded through a privacy pool and proven clean
          with a zk-STARK.
        </span>
        <Link to="/" className="underline font-medium ml-2 inline-flex items-center gap-1">
          Back to ChainSight <ExternalLink className="size-3" />
        </Link>
      </div>

      <div className="flex-1 grid place-items-center p-6">
        <div className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl bg-[oklch(0.18_0.01_260)] text-white">
          {/* Top bar */}
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <div className="text-violet-300 font-bold text-xl tracking-tight inline-flex items-center gap-2">
              <Lock className="size-4" /> Private Wallet
            </div>
            <span className="inline-flex items-center gap-1 text-xs text-white/70">
              <span className="size-4 rounded-full bg-violet-500/80 grid place-items-center text-[9px] font-bold">
                ◎
              </span>
              SOL
            </span>
          </div>

          <div className="px-5 pb-2">
            <div className="text-[11px] uppercase tracking-wider text-white/50">
              Shielded balance
            </div>
            <div className="text-violet-300 text-3xl font-bold tracking-tight inline-flex items-center gap-2">
              <EyeOff className="size-5" /> ••••• SOL
            </div>
            <div className="text-white/40 text-xs mt-1">
              Amounts are hidden on-chain — compliance is proven, not traced.
            </div>
          </div>

          {/* Form */}
          <div className="mx-5 mt-4 mb-5 rounded-xl bg-white/5 border border-white/10 p-4">
            <div className="text-[11px] uppercase tracking-wider text-white/50 mb-2">
              Withdraw to
            </div>
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Recipient address…"
              className="w-full bg-black/30 border border-white/10 rounded-md px-3 py-2 text-xs font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-violet-400/50"
            />
            <div className="mt-3 flex gap-2">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                className="flex-1 bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-violet-400/50"
              />
              <span className="inline-flex items-center gap-1.5 bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm font-medium text-white">
                SOL
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2">
              <button
                onClick={() => send("zk_clean")}
                disabled={!!busy}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-500 hover:bg-emerald-600 transition-colors py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy === "zk_clean" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ShieldCheck className="size-4" />
                )}
                Send clean funds (private)
              </button>
              <button
                onClick={() => send("zk_tainted")}
                disabled={!!busy}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-rose-500/90 hover:bg-rose-600 transition-colors py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy === "zk_tainted" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ShieldAlert className="size-4" />
                )}
                Send tainted funds (private)
              </button>
            </div>

            <p className="mt-3 text-[11px] text-white/40 leading-relaxed">
              Both route through the gone.wtf pool. Clean funds produce a valid zk-STARK clean-funds
              proof; tainted funds (sanctioned source) cannot, so the deposit is rejected.
            </p>

            {error && (
              <div className="mt-3 rounded-md bg-rose-500/10 border border-rose-400/40 px-3 py-2 text-xs text-rose-200">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Result modal */}
      {result && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200 overflow-y-auto"
          onClick={() => setResult(null)}
        >
          <div
            className="w-full max-w-lg my-8 rounded-2xl bg-[oklch(0.99_0_0)] text-foreground shadow-2xl border p-5 relative animate-pop-in"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setResult(null)}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Private deposit · {result.verdict === "CLEARED" ? "Accepted" : "Rejected"}
            </div>
            <h2 className="text-lg font-medium mb-3">
              {result.verdict === "CLEARED"
                ? "Clean funds proven — deposit accepted"
                : "Proof failed — deposit rejected"}
            </h2>
            {result.zkProof && <ZkProofPanel proof={result.zkProof} caseId={result.id} />}
            <div className="mt-4 text-right">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-sm rounded-md border px-3.5 py-2 hover:bg-accent"
              >
                Open in ChainSight <ExternalLink className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
