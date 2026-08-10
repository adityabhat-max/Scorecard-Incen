// Parses the monthly "Final Report"-shaped CSV/XLSX export (matches the real
// file: Doctor & Therapist Performance Report - July 2025.xlsx, source-data/,
// "Final Report" sheet — including its exact header text, typos and all,
// since that's literally what gets exported month to month).
import Papa from "papaparse";
import ExcelJS from "exceljs";

// Exact header strings observed in the real export. Trimmed before matching
// (the real file has a trailing space on "Center ").
export const REQUIRED_HEADERS = [
  "Profile",
  "Service By Perfomed",
  "Attendance Punctuality",
  "Leave %",
  "Absent without leave %",
  "Attendance Regularization",
  "Service Utilization %",
  "Missed customer Signiture %",
  "Prescription sign missed Ratio",
  "Client Escalations %",
  "Center",
  "Aplicable - Status",
] as const;

export type RawSheetRow = Record<string, string | number | null>;

export interface ParsedReport {
  headers: string[];
  rows: RawSheetRow[];
  missingHeaders: string[];
}

function normalizeHeader(h: string): string {
  return h.replace(/\s+/g, " ").trim();
}

function checkHeaders(headers: string[]): string[] {
  const normalized = new Set(headers.map(normalizeHeader));
  return REQUIRED_HEADERS.filter((h) => !normalized.has(h));
}

async function parseCsv(buffer: Buffer): Promise<ParsedReport> {
  const text = buffer.toString("utf-8");
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: normalizeHeader,
  });

  const headers = result.meta.fields ?? [];
  const rows = result.data.filter((r) => Object.values(r).some((v) => v !== "" && v != null));

  return { headers, rows, missingHeaders: checkHeaders(headers) };
}

async function parseXlsx(buffer: Buffer): Promise<ParsedReport> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

  // Prefer a sheet literally named "Final Report" (matches the real export);
  // otherwise fall back to the first sheet.
  const sheet =
    workbook.worksheets.find((s) => normalizeHeader(s.name) === "Final Report") ??
    workbook.worksheets[0];

  if (!sheet) {
    return { headers: [], rows: [], missingHeaders: [...REQUIRED_HEADERS] };
  }

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber] = normalizeHeader(String(cell.value ?? ""));
  });

  const rows: RawSheetRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const obj: RawSheetRow = {};
    let hasData = false;
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const key = headers[colNumber];
      if (!key) return;
      // Formula cells (incl. shared formulas, common in this report — the
      // whole sheet is dragged-down SUMIFS/lookups) carry their cached
      // value on `cell.result`, not inside `cell.value` — .value there is
      // just {formula, ref, shareType}. This matters at zero: a real 0%
      // Leave value must not get treated as "no data" and dropped.
      const value = cell.type === ExcelJS.ValueType.Formula ? cell.result : cell.value;
      if (value === null || value === undefined || value === "") return;
      hasData = true;
      if (value instanceof Date) {
        obj[key] = value.toISOString();
      } else {
        obj[key] = value as string | number;
      }
    });
    if (hasData && obj["Profile"]) rows.push(obj);
  });

  return { headers: headers.filter(Boolean), rows, missingHeaders: checkHeaders(headers.filter(Boolean)) };
}

export async function parseReportFile(
  buffer: Buffer,
  filename: string,
): Promise<ParsedReport> {
  const ext = filename.toLowerCase().split(".").pop();
  if (ext === "csv") return parseCsv(buffer);
  if (ext === "xlsx" || ext === "xls") return parseXlsx(buffer);
  throw new Error(`Unsupported file type: .${ext}. Upload a .csv or .xlsx file.`);
}
