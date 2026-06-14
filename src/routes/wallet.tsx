import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Check,
  ShieldCheck,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  X,
} from "lucide-react";
import { createWalletDepositFromBackend, depositStore } from "@/lib/deposit-store";
import { EXCHANGE_HOT_WALLET } from "@/lib/config";

export const Route = createFileRoute("/wallet")({
  head: () => ({
    meta: [
      { title: "Demo Wallet — ChainSight" },
      {
        name: "description",
        content: "Mockup wallet used to demonstrate ChainSight deposit screening.",
      },
    ],
  }),
  component: WalletPage,
});

const WALLET_ADDRESS = "RQFwdRxm4vrTRybpdfiHa9eSEiQdpVLPaSXteRXj1S1A";

interface Tx {
  id: string;
  kind: "in" | "out";
  amount: string;
  token: string;
  counterparty: string;
  at: Date;
  flagged?: boolean;
}

const TOKEN = "SOL" as const;
const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function shortenAddress(addr: string): string {
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

function randomTxHash(): string {
  // Solana transaction signatures are base58-encoded (~88 chars).
  let sig = "";
  for (let i = 0; i < 88; i++) sig += BASE58[Math.floor(Math.random() * BASE58.length)];
  return sig;
}

function WalletPage() {
  const [balance, setBalance] = useState(0.59755);
  const [recipient, setRecipient] = useState(EXCHANGE_HOT_WALLET);
  const [amount, setAmount] = useState("0.4");
  const [copied, setCopied] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ hash: string; amount: string; to: string } | null>(null);
  const [history, setHistory] = useState<Tx[]>([
    {
      id: "tx-seed-1",
      kind: "out",
      amount: "0.4",
      token: "SOL",
      counterparty: "7Xb2pQ…q9Fk",
      at: new Date(Date.now() - 1000 * 60 * 60 * 4),
    },
    {
      id: "tx-seed-2",
      kind: "in",
      amount: "0.998",
      token: "SOL",
      counterparty: "9mPqLd…2vLd",
      at: new Date(Date.now() - 1000 * 60 * 60 * 5),
    },
  ]);

  const qrSrc = useMemo(
    () =>
      `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=0&data=solana:${WALLET_ADDRESS}`,
    [],
  );

  function copyAddr() {
    navigator.clipboard?.writeText(WALLET_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleSend() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || !recipient || success) return;
    if (amt > balance) {
      setSendError(`Insufficient balance — you only have ${balance.toFixed(5)} SOL.`);
      return;
    }
    setSendError(null);

    // Optimistic, instant confirmation — the transaction "lands" right away.
    const hash = randomTxHash();
    setBalance((b) => Math.max(0, b - amt));
    setHistory((h) => [
      {
        id: hash,
        kind: "out",
        amount,
        token: TOKEN,
        counterparty: shortenAddress(recipient),
        at: new Date(),
        flagged: true,
      },
      ...h,
    ]);
    setSuccess({ hash, amount, to: recipient });

    // Submit to ChainSight screening in the background so the popup isn't blocked.
    createWalletDepositFromBackend({ sender: WALLET_ADDRESS, amount, token: TOKEN, recipient })
      .then((dep) => depositStore.add(dep, { announce: true }))
      .catch((error) => {
        console.error(error);
        setSendError("Screening backend nije dostupan — provjeri da Python risk API radi.");
      });
  }

  return (
    <div className="min-h-screen bg-[oklch(0.97_0.005_260)] flex flex-col">
      {/* Demo banner */}
      <div className="bg-amber-100 border-b border-amber-300 text-amber-900 text-xs px-4 py-2 flex items-center justify-center gap-2">
        <ShieldCheck className="size-3.5" />
        <span>This is a standalone mockup wallet for demo purposes — not part of ChainSight.</span>
        <Link to="/" className="underline font-medium ml-2 inline-flex items-center gap-1">
          Back to ChainSight <ExternalLink className="size-3" />
        </Link>
      </div>

      <div className="flex-1 grid place-items-center p-6">
        <div className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl bg-[oklch(0.18_0.01_260)] text-white">
          {/* Top bar */}
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <div className="text-orange-400 font-bold text-xl tracking-tight">Jaxx</div>
            <div className="flex items-center gap-3 text-xs text-white/70">
              <span className="inline-flex items-center gap-1">
                <span className="size-4 rounded-full bg-orange-500/80 grid place-items-center text-[9px] font-bold">
                  ₿
                </span>
                BTC
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-4 rounded-full bg-purple-500/80 grid place-items-center text-[9px] font-bold">
                  ◎
                </span>
                SOL
              </span>
            </div>
          </div>

          {/* Receive / Send tabs (purely decorative) */}
          <div className="grid grid-cols-2 border-y border-white/10 bg-white/5">
            <button className="flex items-center justify-center gap-2 py-3 text-sm text-white/70 hover:text-white transition-colors">
              <ArrowDown className="size-4" />
              Receive
            </button>
            <button className="flex items-center justify-center gap-2 py-3 text-sm text-white font-medium border-l border-white/10">
              <ArrowUp className="size-4" />
              Send
            </button>
          </div>

          {/* Address */}
          <div className="px-5 pt-4">
            <div className="text-[11px] uppercase tracking-wider text-white/50">
              Your current Solana address
            </div>
            <button
              onClick={copyAddr}
              className="mt-1 flex items-center gap-2 text-xs font-mono text-white/80 hover:text-white"
            >
              <span className="truncate max-w-57.5">{WALLET_ADDRESS}</span>
              {copied ? (
                <Check className="size-3.5 text-emerald-400" />
              ) : (
                <Copy className="size-3.5" />
              )}
            </button>
          </div>

          {/* Balance + QR */}
          <div className="px-5 pt-4 pb-2 flex items-start justify-between">
            <div>
              <RefreshCw className="size-4 text-white/40 mb-2" />
              <div className="text-orange-400 text-sm font-medium">SOL</div>
              <div className="text-orange-400 text-3xl font-bold tracking-tight">
                {balance.toFixed(5)}
              </div>
              <div className="text-white/50 text-sm mt-1">${(balance * 152.4).toFixed(2)}</div>
            </div>
            <img src={qrSrc} alt="Wallet QR code" className="size-28 rounded bg-white p-1" />
          </div>

          {/* Send form */}
          <div className="mx-5 mt-4 mb-5 rounded-xl bg-white/5 border border-white/10 p-4">
            <div className="text-[11px] uppercase tracking-wider text-white/50 mb-2">Send to</div>
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Recipient address…"
              className="w-full bg-black/30 border border-white/10 rounded-md px-3 py-2 text-xs font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-orange-400/50"
            />
            <div className="mt-3 flex gap-2">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                className="flex-1 bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-orange-400/50"
              />
              <span className="inline-flex items-center gap-1.5 bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm font-medium text-white">
                <span className="size-4 rounded-full bg-purple-500/80 grid place-items-center text-[9px] font-bold">
                  ◎
                </span>
                SOL
              </span>
            </div>
            <button
              onClick={handleSend}
              disabled={parseFloat(amount) > balance}
              className="mt-3 w-full rounded-md bg-orange-500 hover:bg-orange-600 transition-colors py-2.5 text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-orange-500"
            >
              {parseFloat(amount) > balance ? "Insufficient balance" : "Send"}
            </button>

            {sendError && (
              <div className="mt-3 rounded-md bg-rose-500/10 border border-rose-400/40 px-3 py-2 text-xs text-rose-200">
                {sendError}
              </div>
            )}
          </div>

          {/* History */}
          <div className="border-t border-white/10 bg-black/20">
            <div className="px-5 pt-3 pb-2 text-center text-xs text-white/60">
              Transaction History
            </div>
            <div className="divide-y divide-white/5">
              {history.map((tx) => (
                <div key={tx.id} className="px-5 py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="text-white/80">
                      {tx.at.toLocaleDateString(undefined, { month: "short", day: "numeric" })}{" "}
                      <span className="text-white/40">
                        {tx.at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="text-white/50">
                      {tx.kind === "out" ? `Sent to · ${tx.counterparty}` : "Confirmed"}
                      {tx.flagged && <span className="ml-2 text-amber-300">· flagged</span>}
                    </div>
                  </div>
                  <div
                    className={
                      tx.kind === "out" ? "text-rose-400 font-mono" : "text-emerald-400 font-mono"
                    }
                  >
                    {tx.kind === "out" ? "-" : "+"}
                    {tx.amount} {tx.token}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Success popup */}
      {success && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setSuccess(null)}
        >
          <div
            className="w-full max-w-xs rounded-2xl bg-[oklch(0.20_0.01_260)] text-white shadow-2xl border border-white/10 p-6 text-center relative animate-pop-in"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSuccess(null)}
              className="absolute top-3 right-3 text-white/40 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
            <div className="mx-auto size-14 rounded-full bg-emerald-500/15 grid place-items-center">
              <CheckCircle2 className="size-8 text-emerald-400" />
            </div>
            <div className="mt-4 text-lg font-semibold">Transaction sent</div>
            <div className="mt-1 text-2xl font-bold text-orange-400">-{success.amount} SOL</div>
            <div className="mt-3 space-y-1 text-xs text-white/60">
              <div>
                To <span className="font-mono text-white/80">{shortenAddress(success.to)}</span>
              </div>
              <div className="font-mono break-all">{shortenAddress(success.hash)}</div>
            </div>
            <div className="mt-4 rounded-md bg-amber-500/10 border border-amber-400/30 px-3 py-2 text-[11px] text-amber-200">
              Confirmed on-chain · submitted to ChainSight for screening
            </div>
            <div className="mt-4">
              <button
                onClick={() => setSuccess(null)}
                className="w-full rounded-md bg-orange-500 hover:bg-orange-600 transition-colors py-2.5 text-sm font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
