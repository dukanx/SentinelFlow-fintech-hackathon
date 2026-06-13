export const REVIEW_THRESHOLD = 35;
export const BLOCK_THRESHOLD = 85;

export const EXCHANGE_HOT_WALLET = "0xe1c7df02b8a4566d801a6e96217554a0e310ec88";
export const EXCHANGE_NAME = "ChainSight Exchange Hot Wallet";

export const KNOWN_LABELS = {
  ofacLazarus: "OFAC: Lazarus Group",
  ofacSdn: "OFAC SDN List",
  tornado: "Tornado Cash mixer",
  sanctionedExchange: "Sanctioned exchange (Garantex)",
} as const;

export interface Analyst {
  id: string;
  name: string;
  initials: string;
  role: string;
  // tailwind classes for the avatar tint
  avatarBg: string;
  avatarText: string;
}

export const ANALYSTS: Record<string, Analyst> = {
  mr: {
    id: "mr",
    name: "Maya Rivera",
    initials: "MR",
    role: "Senior Compliance Analyst",
    avatarBg: "bg-[oklch(0.92_0.06_255)]",
    avatarText: "text-[oklch(0.38_0.14_255)]",
  },
  jk: {
    id: "jk",
    name: "Jordan Kim",
    initials: "JK",
    role: "Compliance Analyst",
    avatarBg: "bg-[oklch(0.92_0.07_30)]",
    avatarText: "text-[oklch(0.42_0.16_30)]",
  },
  ap: {
    id: "ap",
    name: "Amir Patel",
    initials: "AP",
    role: "Compliance Analyst",
    avatarBg: "bg-[oklch(0.92_0.07_150)]",
    avatarText: "text-[oklch(0.38_0.14_150)]",
  },
  sc: {
    id: "sc",
    name: "Sofia Chen",
    initials: "SC",
    role: "Compliance Analyst",
    avatarBg: "bg-[oklch(0.92_0.07_300)]",
    avatarText: "text-[oklch(0.40_0.16_300)]",
  },
};

// The signed-in analyst (mock).
export const CURRENT_ANALYST: Analyst = ANALYSTS.mr;
