import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseReportFile } from "@/lib/import/parse-report";
import { isMapRowError, mapRow, type MappedRow } from "@/lib/import/map-row";

export const runtime = "nodejs";

interface LocationResult {
  location: string;
  locationId?: string;
  staffCreated: number;
  staffMatched: number;
  rowsScored: number;
  error?: string;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const periodMonth = formData.get("period"); // "YYYY-MM"

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (typeof periodMonth !== "string" || !/^\d{4}-\d{2}$/.test(periodMonth)) {
    return NextResponse.json({ error: "Missing or invalid period (expected YYYY-MM)" }, { status: 400 });
  }
  const period = `${periodMonth}-01`;

  const buffer = Buffer.from(await file.arrayBuffer());

  let parsed;
  try {
    parsed = await parseReportFile(buffer, file.name);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to parse file" }, { status: 400 });
  }

  if (parsed.missingHeaders.length > 0) {
    return NextResponse.json(
      { error: `File is missing required columns: ${parsed.missingHeaders.join(", ")}` },
      { status: 400 },
    );
  }

  const rowErrors: { row: number; message: string }[] = [];
  const mappedRows: MappedRow[] = [];
  parsed.rows.forEach((raw, i) => {
    const mapped = mapRow(raw, i + 2); // +2: header row + 1-indexing
    if (isMapRowError(mapped)) {
      rowErrors.push(mapped);
    } else {
      mappedRows.push(mapped);
    }
  });

  const { data: locations } = await supabase.from("locations").select("id, name");
  const locationByName = new Map((locations ?? []).map((l) => [l.name.trim().toLowerCase(), l]));

  const rowsByCenter = new Map<string, MappedRow[]>();
  for (const row of mappedRows) {
    const key = row.center.trim().toLowerCase();
    if (!rowsByCenter.has(key)) rowsByCenter.set(key, []);
    rowsByCenter.get(key)!.push(row);
  }

  const results: LocationResult[] = [];

  for (const [centerKey, rows] of rowsByCenter) {
    const location = locationByName.get(centerKey);
    if (!location) {
      results.push({
        location: rows[0].center,
        staffCreated: 0,
        staffMatched: 0,
        rowsScored: 0,
        error: `Unknown location "${rows[0].center}" — ask an org admin to add it before uploading.`,
      });
      continue;
    }

    try {
      const { data: batch, error: batchError } = await supabase
        .from("score_batches")
        .upsert(
          { location_id: location.id, period, uploaded_by: user.id, source_filename: file.name },
          { onConflict: "location_id,period" },
        )
        .select("id")
        .single();

      if (batchError || !batch) throw new Error(batchError?.message ?? "Failed to create batch");

      const { data: existingStaff } = await supabase
        .from("staff_members")
        .select("id, full_name")
        .eq("location_id", location.id);

      const staffByName = new Map((existingStaff ?? []).map((s) => [s.full_name.trim().toLowerCase(), s.id]));

      let created = 0;
      let matched = 0;
      const staffIdForRow: string[] = [];

      for (const row of rows) {
        const key = row.fullName.trim().toLowerCase();
        let staffId = staffByName.get(key);
        if (!staffId) {
          const { data: newStaff, error: staffError } = await supabase
            .from("staff_members")
            .insert({ location_id: location.id, profile_type: row.profileType, full_name: row.fullName })
            .select("id")
            .single();
          if (staffError || !newStaff) throw new Error(staffError?.message ?? "Failed to create staff member");
          staffId = newStaff.id;
          staffByName.set(key, staffId);
          created++;
        } else {
          matched++;
        }
        staffIdForRow.push(staffId);
      }

      const entries = rows.map((row, i) => ({
        batch_id: batch.id,
        staff_member_id: staffIdForRow[i],
        applicable: row.applicable,
        attendance_punctuality: row.attendance_punctuality,
        leave_pct: row.leave_pct,
        absent_without_leave_pct: row.absent_without_leave_pct,
        attendance_regularization_pct: row.attendance_regularization_pct,
        service_utilization_pct: row.service_utilization_pct,
        signoff_missed_pct: row.signoff_missed_pct,
        client_escalations_pct: row.client_escalations_pct,
      }));

      const { error: entriesError } = await supabase
        .from("raw_kpi_entries")
        .upsert(entries, { onConflict: "batch_id,staff_member_id" });
      if (entriesError) throw new Error(entriesError.message);

      const { error: calcError } = await supabase.rpc("calculate_scores", { p_batch_id: batch.id });
      if (calcError) throw new Error(calcError.message);

      results.push({
        location: location.name,
        locationId: location.id,
        staffCreated: created,
        staffMatched: matched,
        rowsScored: rows.filter((r) => r.applicable).length,
      });
    } catch (e) {
      results.push({
        location: location.name,
        staffCreated: 0,
        staffMatched: 0,
        rowsScored: 0,
        error: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({ results, rowErrors });
}
