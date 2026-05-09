/**
 * Write Wix authority reports to CSV files in reports/ directory.
 */
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import type { AggregatedAuthorityRow, UnresolvedAuthorityRow } from "./types";

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Flatten evidence to a single qualifying row for CSV (first qualifying or first row). */
function getQualifyingFromEvidence(row: AggregatedAuthorityRow): {
  plan: string;
  status: string;
  payment: string;
} {
  const qualifying = row.evidence.find(
    (e) =>
      e.subscriptionStatus === "Free trial" ||
      (e.subscriptionStatus === "Active" &&
        (e.lastPaymentStatus === "Paid" || e.lastPaymentStatus === "Pending"))
  );
  const e = qualifying ?? row.evidence[0];
  return {
    plan: e?.plan ?? "",
    status: e?.subscriptionStatus ?? "",
    payment: e?.lastPaymentStatus ?? "",
  };
}

export async function writeWixAuthorityReports(
  outputDir: string,
  aggregated: AggregatedAuthorityRow[],
  unresolved: UnresolvedAuthorityRow[]
): Promise<{ aggregatedPath: string; unresolvedPath: string }> {
  await mkdir(outputDir, { recursive: true });

  const aggregatedPath = path.join(outputDir, "wix_authority_aggregated.csv");
  const unresolvedPath = path.join(outputDir, "wix_authority_unresolved.csv");

  const aggHeaders = [
    "email",
    "customerName",
    "authorized",
    "qualifying_plan",
    "qualifying_status",
    "qualifying_payment",
    "total_rows",
    "active_rows",
    "draft_rows",
    "canceled_rows",
  ];
  const aggLines = [aggHeaders.join(",")];

  for (const row of aggregated) {
    const q = getQualifyingFromEvidence(row);
    aggLines.push(
      [
        escapeCsv(row.email),
        escapeCsv(row.customerName),
        row.authorized ? "true" : "false",
        escapeCsv(q.plan),
        escapeCsv(q.status),
        escapeCsv(q.payment),
        row.counts.totalRowsForEmail,
        row.counts.activeCount,
        row.counts.draftCount,
        row.counts.canceledCount,
      ].join(",")
    );
  }

  await writeFile(aggregatedPath, aggLines.join("\n") + "\n", "utf-8");

  const unresHeaders = [
    "orderId",
    "memberId",
    "plan",
    "subscriptionStatus",
    "lastPaymentStatus",
    "purchaserEmailFromOrder",
    "resolvedEmail",
    "notes",
  ];
  const unresLines = [unresHeaders.join(",")];

  for (const row of unresolved) {
    unresLines.push(
      [
        escapeCsv(row.orderId),
        escapeCsv(row.memberId),
        escapeCsv(row.plan),
        escapeCsv(row.subscriptionStatus),
        escapeCsv(row.lastPaymentStatus),
        escapeCsv(row.purchaserEmailFromOrder),
        "", // resolvedEmail is always null
        escapeCsv(row.notes),
      ].join(",")
    );
  }

  await writeFile(unresolvedPath, unresLines.join("\n") + "\n", "utf-8");

  return { aggregatedPath, unresolvedPath };
}
