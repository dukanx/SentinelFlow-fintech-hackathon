import { jsPDF } from "jspdf";
import type { Deposit } from "./mock-data";
import { CURRENT_ANALYST, INSTITUTION_NAME } from "./config";
import { formatDateTime } from "./format";
import { estimateTaintPercent, type FilingType } from "./sar-draft";

export interface SarPdfInput {
  deposit: Deposit;
  filingType: FilingType;
  analystDecision?: "BLOCKED" | "ACCEPTED";
}

const PAGE_W = 612; // US Letter, portrait (pt)
const PAGE_H = 792;
const MARGIN = 36;
const CONTENT_W = PAGE_W - MARGIN * 2;

function dateParts(iso: string): { mm: string; dd: string; yyyy: string } {
  const d = new Date(iso);
  return {
    mm: String(d.getMonth() + 1).padStart(2, "0"),
    dd: String(d.getDate()).padStart(2, "0"),
    yyyy: String(d.getFullYear()),
  };
}

/**
 * Renders a FinCEN Form 109 (SAR by MSB) styled PDF draft, filled from the
 * deposit's screening data and the analyst's blocking rationale. It is a demo
 * template, not a legal filing.
 */
export function generateSarPdf(input: SarPdfInput): jsPDF {
  const { deposit, filingType, analystDecision } = input;
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  let y = MARGIN;

  const ensure = (h: number) => {
    if (y + h > PAGE_H - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };

  const sectionHeader = (title: string) => {
    ensure(20);
    doc.setFillColor(34, 34, 34);
    doc.rect(MARGIN, y, CONTENT_W, 16, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(title, MARGIN + 5, y + 11);
    doc.setTextColor(0);
    y += 16;
  };

  const field = (label: string, value: string, x: number, w: number, h = 30) => {
    doc.setDrawColor(170);
    doc.setLineWidth(0.5);
    doc.rect(x, y, w, h);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(110);
    doc.text(label.toUpperCase(), x + 4, y + 8);
    doc.setFontSize(9);
    doc.setTextColor(0);
    const lines = doc.splitTextToSize(value || "—", w - 8) as string[];
    doc.text(lines.slice(0, 2), x + 4, y + 20);
  };

  const checkbox = (x: number, yy: number, checked: boolean, label: string) => {
    doc.setDrawColor(60);
    doc.setLineWidth(0.7);
    doc.rect(x, yy - 7.5, 9, 9);
    if (checked) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("X", x + 1.6, yy - 0.5);
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(0);
    doc.text(label, x + 14, yy - 0.5);
  };

  const paragraph = (text: string, size = 8.5, gap = 4) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(0);
    const lines = doc.splitTextToSize(text, CONTENT_W) as string[];
    for (const line of lines) {
      ensure(size + 2);
      doc.text(line, MARGIN, y + size);
      y += size + 2;
    }
    y += gap;
  };

  // Bold field heading that sits clearly above its checkbox row.
  const subLabel = (text: string) => {
    ensure(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(0);
    doc.text(text, MARGIN, y + 8);
    y += 22;
  };

  // ---- Title block --------------------------------------------------------
  doc.setDrawColor(34);
  doc.setLineWidth(1);
  doc.rect(MARGIN, y, CONTENT_W, 46);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("FinCEN Form 109", MARGIN + 8, y + 16);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.text("March 2011", MARGIN + 8, y + 27);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  const title =
    filingType === "SAR"
      ? "Suspicious Activity Report by Money Services Business"
      : "Suspicious Transaction Report (STR)";
  // Center the title in the gap between the left form label and the right notice,
  // vertically centered within the 46pt title box.
  const titleLines = doc.splitTextToSize(title, 280) as string[];
  const titleLineH = 13;
  const titleStartY = y + 23 - ((titleLines.length - 1) * titleLineH) / 2;
  doc.text(titleLines, PAGE_W / 2, titleStartY, { align: "center", baseline: "middle" });
  doc.setFontSize(7);
  doc.setTextColor(150, 30, 30);
  doc.setFont("helvetica", "bold");
  doc.text("DRAFT — NOT FILED", PAGE_W - MARGIN - 8, y + 16, { align: "right" });
  doc.setTextColor(110);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text("Demo template only", PAGE_W - MARGIN - 8, y + 27, { align: "right" });
  doc.setTextColor(0);
  y += 46;

  doc.setFontSize(6.5);
  doc.setTextColor(110);
  doc.text(
    `Case ${deposit.id.toUpperCase()}  ·  Generated ${formatDateTime(
      new Date().toISOString(),
    )}  ·  Prepared by ${CURRENT_ANALYST.name}, ${INSTITUTION_NAME}`,
    MARGIN,
    y + 9,
  );
  doc.setTextColor(0);
  y += 16;

  // ---- Part I — Subject Information ---------------------------------------
  sectionHeader("Part I — Subject Information");

  checkbox(MARGIN + 4, y + 12, true, "3a Purchaser / sender (originating wallet)");
  y += 18;

  field("4 Last name or entity full name", "UNKNOWN — SELF-CUSTODY WALLET", MARGIN, CONTENT_W * 0.6);
  field("5 First name", "N/A", MARGIN + CONTENT_W * 0.6, CONTENT_W * 0.4);
  y += 30;

  field("7 Address (on-chain wallet address)", deposit.sender, MARGIN, CONTENT_W);
  y += 30;

  field("8 City", "N/A", MARGIN, CONTENT_W * 0.4);
  field("9 State", "N/A", MARGIN + CONTENT_W * 0.4, CONTENT_W * 0.2);
  field("10 ZIP", "N/A", MARGIN + CONTENT_W * 0.6, CONTENT_W * 0.2);
  field("11 Country", "On-chain", MARGIN + CONTENT_W * 0.8, CONTENT_W * 0.2);
  y += 30;

  field("12 Government-issued identification", "Not available (pseudonymous wallet)", MARGIN, CONTENT_W * 0.6);
  field("13 SSN / TIN / EIN", "Not available", MARGIN + CONTENT_W * 0.6, CONTENT_W * 0.4);
  y += 34;

  // ---- Part II — Suspicious Activity Information --------------------------
  sectionHeader("Part II — Suspicious Activity Information");

  const dp = dateParts(deposit.receivedAt);
  field("16 Date of suspicious activity", `${dp.mm} / ${dp.dd} / ${dp.yyyy}`, MARGIN, CONTENT_W * 0.5);
  field(
    "17 Total amount involved",
    `${deposit.amount} ${deposit.token}`,
    MARGIN + CONTENT_W * 0.5,
    CONTENT_W * 0.5,
  );
  y += 34;

  // 18 Category of suspicious activity
  const isML = deposit.directHit || deposit.signals.mixerInPath || deposit.signals.hopsToSanctioned < 99;
  const isStructuring =
    deposit.behavioralAlert?.type === "velocity_structuring" ||
    deposit.behavioralAlert?.pattern === "structuring";
  const sanctionsOther = deposit.directHit || Boolean(deposit.signals.sanctionLabel);
  subLabel("18 Category of suspicious activity");
  checkbox(MARGIN + 4, y, isML, "a  Money laundering");
  checkbox(MARGIN + 170, y, isStructuring, "b  Structuring");
  checkbox(MARGIN + 300, y, false, "c  Terrorist financing");
  y += 16;
  checkbox(
    MARGIN + 4,
    y,
    sanctionsOther,
    `z  Other: ${sanctionsOther ? `Sanctions exposure${deposit.signals.sanctionLabel ? ` (${deposit.signals.sanctionLabel})` : ""}` : "—"}`,
  );
  y += 24;

  // 19 Financial services involved
  subLabel("19 Financial services / instruments involved");
  checkbox(MARGIN + 4, y, true, "z  Other: Virtual currency (SOL) deposit / transfer");
  checkbox(MARGIN + 320, y, true, "c  Money transfer");
  y += 24;

  // Numbered checklist (the items that loosely map to on-chain typologies)
  const velocity = Boolean(deposit.behavioralAlert);
  subLabel("Check all that apply");
  checkbox(MARGIN + 4, y, velocity, "(3)  Comes in frequently and transacts in small amounts");
  y += 16;
  checkbox(MARGIN + 4, y, isStructuring, "(1)  Alters transaction to avoid record-keeping");
  y += 18;

  // ---- Part III — Narrative ----------------------------------------------
  y += 6;
  sectionHeader("Part III — Narrative");
  const taint = estimateTaintPercent(deposit);
  const nearest =
    deposit.signals.hopsToSanctioned >= 99
      ? "none within trace window"
      : `${deposit.signals.hopsToSanctioned} hop(s)${deposit.signals.sanctionLabel ? ` from ${deposit.signals.sanctionLabel}` : ""}`;

  y += 4;
  paragraph(
    `On ${formatDateTime(deposit.receivedAt)}, subject wallet ${deposit.sender} attempted an inbound deposit of ${deposit.amount} ${deposit.token} to ${INSTITUTION_NAME}. Automated transaction screening assigned a risk score of ${deposit.riskScore}/100 (verdict: ${deposit.verdict}) and flagged the activity for compliance review.`,
  );
  paragraph(
    `On-chain analysis traced ${deposit.signals.hopsTraced} hops. Nearest sanctioned exposure: ${nearest}. Exposed volume: ${deposit.signals.exposedVolume}. Estimated taint exposure: ~${taint.toFixed(1)}% of traced value.${
      deposit.signals.mixerInPath
        ? ` Funds were routed through ${deposit.signals.mixerLabel ?? "a known mixer"} prior to the deposit attempt.`
        : ""
    }${
      deposit.behavioralAlert
        ? ` Behavioral KYT observed ${deposit.behavioralAlert.tx_count} micro-transactions in ${deposit.behavioralAlert.window_hours} hour(s) (avg ${deposit.behavioralAlert.avg_amount_sol.toFixed(4)} SOL), consistent with ${deposit.behavioralAlert.pattern.replace("_", " ")}.`
        : ""
    }`,
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  ensure(14);
  doc.text("Reason for blocking / key findings:", MARGIN, y + 8);
  y += 14;
  for (const f of deposit.factors) {
    const lines = doc.splitTextToSize(`•  ${f.text}`, CONTENT_W - 8) as string[];
    for (const line of lines) {
      ensure(11);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(line, MARGIN + 6, y + 8);
      y += 11;
    }
  }
  y += 6;

  paragraph(`Analyst disposition: ${analystDecision ?? deposit.verdict}.`, 8.5, 2);
  paragraph(`Audit note: ${deposit.auditNote}`, 8.5, 6);

  // ---- Certification ------------------------------------------------------
  sectionHeader("Part IV — Certification (placeholder)");
  y += 4;
  paragraph(
    `Filing institution: ${INSTITUTION_NAME}. Contact: Compliance Department. Status: PENDING REVIEW — do not submit without legal/compliance sign-off. This document is a demo template and is not a legal regulatory filing.`,
    8,
    2,
  );

  // Footer on every page
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(6.5);
    doc.setTextColor(140);
    doc.text(
      `${filingType} draft · ${deposit.id.toUpperCase()} · DRAFT — NOT FILED`,
      MARGIN,
      PAGE_H - 18,
    );
    doc.text(`Page ${p} of ${pageCount}`, PAGE_W - MARGIN, PAGE_H - 18, { align: "right" });
    doc.setTextColor(0);
  }

  return doc;
}

export function downloadSarPdf(input: SarPdfInput) {
  const doc = generateSarPdf(input);
  doc.save(`${input.deposit.id}-${input.filingType.toLowerCase()}-draft.pdf`);
}
