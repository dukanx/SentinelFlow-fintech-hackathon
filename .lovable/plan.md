
# ChainSight — Crypto Deposit Screening (Front-end Mock)

The project is currently the blank Lovable template, so I'll build ChainSight from scratch with the revised spec already applied (no threshold-editing UI, Needs Review as a kanban board, default landing on Needs Review).

## Scope

Three screens inside one TanStack route (`/`), client-side view switching via component state — no auth, no settings, no backend.

1. **App shell** — dark sidebar, light content area. Sidebar shows product name "ChainSight" with a Lucide `ShieldCheck` icon and nav items in this order: **Needs Review** (default), **Blocked**, **Cleared**, **All**. Top of content area: summary stat cards (deposits today, needs-review count, blocked count).
2. **Needs Review** — Kanban board with three columns: *Pending review*, *Awaiting documents*, *Ready for re-review*. Live column-header counts. Cards show truncated sender address, amount + token, color risk chip, hops-to-sanctioned, and a mixer warning icon when a mixer is in the path. Clicking a card opens Case Detail.
3. **Blocked / Cleared / All** — table/list views (terminal states, no workflow). Same row format as the original inbox: truncated sender, amount, time, risk score, verdict badge.
4. **Case Detail (centerpiece)** —
   - Deposit summary (sender, amount, destination hot wallet, timestamp).
   - Large risk score + read-only 3-zone bar (green/amber/red) with position marker and threshold lines.
   - **Transaction graph** with `@xyflow/react`: left-to-right node graph, edges labeled with amounts. Distinct styles for sender (neutral), mixer (amber w/ warning icon + "Tornado Cash" label), sanctioned endpoint (red w/ `Ban` icon), exchange wallet (highlighted).
   - "Why this verdict" panel: 2–3 plain-language sentences.
   - Signal breakdown: hops to nearest sanctioned, mixer in path (Yes/No), exposed volume, hops traced.
   - Action buttons for REVIEW cases: **Block deposit**, **Request EDD**, **Mark documents received** (only when awaiting), **Accept deposit**.
   - **Audit note textarea** pre-filled with a derived note (e.g. "Flagged: funds reached sender 2 hops after an OFAC-sanctioned address; path includes Tornado Cash mixer."). On any decision, auto-append `Action: <name> — HH:MM`.

## Verdict + workflow logic

- Thresholds hardcoded in `src/lib/config.ts` (`REVIEW_THRESHOLD`, `BLOCK_THRESHOLD`). No UI to edit them.
- Verdict computed from mock signals: direct OFAC hit → **BLOCKED**; within N hops or mixer present → **REVIEW**; else **CLEARED**.
- Kanban state per REVIEW case stored in a single React state map: `{ caseId: 'pending' | 'awaiting' | 'ready' }`.
- Actions transition state:
  - Request EDD: pending → awaiting
  - Mark documents received: awaiting → ready
  - Block: removes from kanban, verdict overridden to BLOCKED in the local store → appears in Blocked list
  - Accept: removes from kanban, verdict overridden to CLEARED → appears in Cleared list

## Mock data (`src/lib/mock-data.ts`)

8 deposits total:
- 1 **BLOCKED** (direct OFAC Lazarus hit).
- 4 **REVIEW** seeded across kanban columns:
  - 2 in *Pending review* (one with Tornado Cash mixer in path, one proximity-only).
  - 1 in *Awaiting documents*.
  - 1 in *Ready for re-review*.
- 3 **CLEARED**.

Each REVIEW/BLOCKED deposit carries its own `nodes` + `edges` arrays for xyflow (sender → intermediaries (optionally mixer) → sanctioned endpoint, plus an edge into the exchange hot wallet). Known labels hardcoded: `OFAC: Lazarus Group wallet`, `Tornado Cash mixer`, `Sanctioned exchange`.

## File plan

```
src/
  lib/
    config.ts            # hardcoded thresholds, exchange wallet label
    mock-data.ts         # deposits, graphs, known labels
    verdict.ts           # score → verdict helper, derived audit-note builder
    format.ts            # truncateAddress, formatTime
  components/
    chainsight/
      AppShell.tsx       # sidebar + header + stat cards
      StatCards.tsx
      NeedsReviewBoard.tsx
      KanbanCard.tsx
      DepositTable.tsx   # used by Blocked / Cleared / All
      VerdictBadge.tsx
      RiskBar.tsx        # 3-zone read-only bar
      CaseDetail.tsx     # full-screen overlay / panel
      TransactionGraph.tsx     # @xyflow/react wrapper
      nodes/
        SenderNode.tsx
        MixerNode.tsx
        SanctionedNode.tsx
        ExchangeNode.tsx
        IntermediaryNode.tsx
      WhyVerdict.tsx
      SignalBreakdown.tsx
      ActionBar.tsx
      AuditNote.tsx
  routes/
    index.tsx            # mounts <ChainSightApp /> (view state + selected case)
```

A single `ChainSightApp` component owns: active nav tab, selected case id, kanban column map, and per-case verdict overrides + audit notes. Passes setters down. No router changes beyond the existing `/` route, plus updated `head()` metadata (title "ChainSight — Deposit Screening", matching description / OG tags).

## Design

- Refined dark theme (the spec allows either; dark reads more "compliance ops"). Neutral slate background, single subtle accent for interactive elements; **green/amber/red reserved for verdicts only**.
- Typography: IBM Plex Sans (body) + IBM Plex Mono (addresses, amounts, hashes). Loaded via Google Fonts `<link>` in `__root.tsx` head.
- Semantic tokens added to `src/styles.css`: `--verdict-cleared`, `--verdict-review`, `--verdict-blocked` (+ `-foreground` variants), `--sidebar`, `--graph-edge`, `--graph-mixer`, etc. All oklch. No hardcoded colors in components.
- Lucide-only icons: `ShieldCheck`, `Inbox`, `Ban`, `CheckCircle2`, `Layers`, `AlertTriangle`, `FileText`, `ArrowRight`, `Clock`.

## Dependencies to add

- `@xyflow/react`

## Out of scope (explicitly NOT building)

- Authentication, user profile, settings page.
- Editable risk thresholds / sliders.
- Real backend, Lovable Cloud, persistence across reloads.
- Anything beyond the four nav tabs and the Case Detail view.

## Verification

After implementing I'll open the preview, confirm: Needs Review loads by default with 4 cards across 3 columns; clicking a Pending card opens Case Detail with a rendered xyflow graph including a mixer node; Request EDD moves it to Awaiting documents; Mark documents received moves it to Ready for re-review; Block sends it to the Blocked list; counts update live; Blocked tab shows the direct-OFAC deposit; audit note is pre-filled and gets the action line appended.
