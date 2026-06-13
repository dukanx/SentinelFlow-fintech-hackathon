import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Copy, Check, ShieldCheck, ExternalLink, RefreshCw } from "lucide-react";
import { createWalletDeposit, depositStore } from "@/lib/deposit-store";
import { EXCHANGE_HOT_WALLET } from "@/lib/config";

export const Route = createFileRoute("/wallet")({
  head: () => ({
    meta: [
      { title: "Demo Wallet — ChainSight" },
      { name: "description", content: "Mockup wallet used to demonstrate ChainSight deposit screening." },
    ],
  }),
  component: WalletPage,
});

const WALLET_ADDRESS = "0x1488e397bc44c56d801a6e96217554a0e310ecb5";

interface Tx {
  id: string;
  kind: "in" | "out";
  amount: string;
  token: string;
  counterparty: string;
  at: Date;
  flagged?: boolean;
}

function WalletPage() {
  const [balance, setBalance] = useState(0.59755);
  const [recipient, setRecipient] = useState(EXCHANGE_HOT_WALLET);
  const [amount, setAmount] = useState("0.4");
  const [token, setToken] = useState<"ETH" | "USDC" | "BTC">("ETH");
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState<{ id: string; amount: string; token: string } | null>(null);
  const [history, setHistory] = useState<Tx[]>([
    {
      id: "tx-seed-1",
      kind: "out",
      amount: "0.4",
      token: "ETH",
      counterparty: "0x63a3…6bdb",
      at: new Date(Date.now() - 1000 * 60 * 60 * 4),
    },
    {
      id: "tx-seed-2",
      kind: "in",
      amount: "0.998",
      token: "ETH",
      counterparty: "0x9a12…ff04",
      at: new Date(Date.now() - 1000 * 60 * 60 * 5),
    },
  ]);

  const qrSrc = useMemo(
    () =>
      `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=0&data=ethereum:${WALLET_ADDRESS}`,
    [],
  );

  function copyAddr() {
    navigator.clipboard?.writeText(WALLET_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleSend() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || !recipient) return;
    const dep = createWalletDeposit({
      sender: WALLET_ADDRESS,
      amount: amount,
      token,
      recipient,
    });
    depositStore.add(dep);
    setHistory((h) => [
      {
        id: dep.id,
        kind: "out",
        amount,
        token,
        counterparty: recipient.length > 12 ? `${recipient.slice(0, 6)}…${recipient.slice(-4)}` : recipient,
        at: new Date(),
        flagged: true,
      },
      ...h,
    ]);
    setBalance((b) => Math.max(0, b - amt));
    setSent({ id: dep.id, amount, token });
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
                <span className="size-4 rounded-full bg-orange-500/80 grid place-items-center text-[9px] font-bold">₿</span>
                BTC
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-4 rounded-full bg-indigo-500/80 grid place-items-center text-[9px] font-bold">Ξ</span>
                ETH
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
              Your current Ethereum address
            </div>
            <button
              onClick={copyAddr}
              className="mt-1 flex items-center gap-2 text-xs font-mono text-white/80 hover:text-white"
            >
              <span className="truncate max-w-[230px]">{WALLET_ADDRESS}</span>
              {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
            </button>
          </div>

          {/* Balance + QR */}
          <div className="px-5 pt-4 pb-2 flex items-start justify-between">
            <div>
              <RefreshCw className="size-4 text-white/40 mb-2" />
              <div className="text-orange-400 text-sm font-medium">ETH</div>
              <div className="text-orange-400 text-3xl font-bold tracking-tight">
                {balance.toFixed(5)}
              </div>
              <div className="text-white/50 text-sm mt-1">
                ${(balance * 3380).toFixed(2)}
              </div>
            </div>
            <img
              src={qrSrc}
              alt="Wallet QR code"
              className="size-28 rounded bg-white p-1"
            />
          </div>

          {/* Send form */}
          <div className="mx-5 mt-4 mb-5 rounded-xl bg-white/5 border border-white/10 p-4">
            <div className="text-[11px] uppercase tracking-wider text-white/50 mb-2">
              Send to
            </div>
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x…"
              className="w-full bg-black/30 border border-white/10 rounded-md px-3 py-2 text-xs font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-orange-400/50"
            />
            <div className="mt-3 flex gap-2">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                className="flex-1 bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-orange-400/50"
              />
              <select
                value={token}
                onChange={(e) => setToken(e.target.value as typeof token)}
                className="bg-black/30 border border-white/10 rounded-md px-2 py-2 text-sm text-white focus:outline-none"
              >
                <option>ETH</option>
                <option>USDC</option>
                <option>BTC</option>
              </select>
            </div>
            <button
              onClick={handleSend}
              className="mt-3 w-full rounded-md bg-orange-500 hover:bg-orange-600 transition-colors py-2.5 text-sm font-semibold text-white"
            >
              Send
            </button>

            {sent && (
              <div className="mt-3 rounded-md bg-emerald-500/10 border border-emerald-400/30 px-3 py-2 text-xs text-emerald-200">
                Sent {sent.amount} {sent.token}. ChainSight flagged this deposit —{" "}
                <Link to="/" className="underline font-medium">
                  view in dashboard
                </Link>
                .
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
                      {tx.flagged && (
                        <span className="ml-2 text-amber-300">· flagged</span>
                      )}
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
    </div>
  );
}
