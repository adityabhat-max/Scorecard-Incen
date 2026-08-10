// Dry-run check for a monthly report file before uploading it through the
// web UI — catches missing columns or bad rows locally, without needing to
// go through the app.
//
// Run: npx tsx scripts/check-report.ts "path/to/report.xlsx"
import { readFileSync } from "fs";
import { parseReportFile } from "@/lib/import/parse-report";
import { mapRow, isMapRowError } from "@/lib/import/map-row";

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error('Usage: npx tsx scripts/check-report.ts "path/to/report.xlsx"');
    process.exit(1);
  }

  const buffer = readFileSync(path);
  const parsed = await parseReportFile(buffer, path);

  if (parsed.missingHeaders.length > 0) {
    console.error("Missing required columns:", parsed.missingHeaders.join(", "));
    process.exit(1);
  }

  const mapped = parsed.rows.map((r, i) => mapRow(r, i + 2));
  const errors = mapped.filter(isMapRowError);
  const ok = mapped.filter((m) => !isMapRowError(m));

  const centers = new Map<string, number>();
  for (const m of ok) {
    if (!isMapRowError(m)) centers.set(m.center, (centers.get(m.center) ?? 0) + 1);
  }

  console.log(`${ok.length} rows OK, ${errors.length} rows with problems.\n`);
  console.log("Rows per center:", Object.fromEntries(centers));

  if (errors.length > 0) {
    console.log("\nProblem rows:");
    for (const e of errors) console.log(`  Row ${e.row}: ${e.message}`);
    process.exit(1);
  }
}

main();
