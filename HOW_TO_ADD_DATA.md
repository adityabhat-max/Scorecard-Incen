# How to add a new month's data

This is the step-by-step for getting a new month's performance numbers into the
dashboard. No code changes needed — this is a file upload through the website.

## 1. What file you need

One file per month (CSV or Excel), one row per staff member. It's the same shape as
`Doctor & Therapist Performance Report - July 2025.xlsx`'s **"Final Report"** sheet —
whatever process already produces that report each month is exactly what feeds this.

A ready-to-copy template is at **`templates/monthly-report-template.csv`** — open it,
keep the header row exactly as-is, delete the 3 example rows, and fill in real rows.

### Required columns (exact header text matters)

| Column | What it means | Format |
|---|---|---|
| `Profile` | `TH` (Therapist), `Dr` (Doctor), or `Saloon` (Salon staff) | text |
| `Service By Perfomed` | The staff member's full name | text |
| `Attendance Punctuality` | Worked hours ÷ expected hours | **decimal fraction** — `0.97` = 97% (can exceed 1.0) |
| `Leave %` | Leave days ÷ total working days | decimal fraction — `0.02` = 2% |
| `Absent without leave %` | Unauthorized absences ÷ total working days | decimal fraction |
| `Attendance Regularization` | Regularization requests ÷ total working days | decimal fraction |
| `Service Utilization %` | Billable service hours ÷ available hours | decimal fraction |
| `Missed customer Signiture %` | Missed client signatures ÷ guest count — **Therapist and Salon only, leave blank for Doctors** | decimal fraction |
| `Prescription sign missed Ratio` | Missed prescription sign-offs — **Doctors only, leave blank for Therapist/Salon** | decimal fraction |
| `Client Escalations %` | Escalation tickets ÷ guest count | decimal fraction |
| `Center` | Location name — must exactly match one of the 8 existing locations (Vasant Vihar, Greater Kailash, Khan Market, Noida, Gurugram, Mumbai, Bangalore, Hyderabad) | text |
| `Aplicable - Status` | `Applicable` if this person should be scored this period, anything else (`Not Applicable`, `N/A`, blank) if not | text |

Everything is a **decimal fraction, not a whole-number percentage** — `95%` is `0.95`,
not `95`. This matches exactly what the existing Zenoti/HRMS/Amoga export already
produces, so if you're pulling from the same pipeline as before, no conversion is
needed.

Extra columns beyond this list are fine — they're just ignored. Column *order*
doesn't matter, only the header names.

### Where these columns typically come from

This mirrors the real source file's structure, for anyone assembling the report by hand:

- Attendance Punctuality, Leave %, Absent without leave %, Attendance Regularization
  → HRMS attendance export
- Service Utilization % → Zenoti utilization report
- Missed customer Signiture % → the manual signature-check audit
- Prescription sign missed Ratio → prescription records (doctors only)
- Client Escalations % → Amoga ticketing export

## 2. Check the file before uploading (optional but recommended)

If you have Node installed, you can dry-run a file locally before uploading it —
catches problems without touching the live data:

```bash
npm run check:report -- "path/to/your-file.csv"
```

It reports how many rows parsed cleanly, a breakdown by location, and the exact row
number + reason for anything that didn't.

## 3. Upload it

1. Log in as an **Org Level Executive** or **Sales Manager** account.
2. Go to **Upload Data** in the top nav.
3. Pick the **Period** (the month this data is for).
4. Pick the file, click **Upload and calculate scores**.

A Sales Manager can only upload rows for their own location — if their file
contains other locations' rows, those rows will show an error in the results and
nothing for that location gets written; other locations in the same file that they
*are* allowed to touch still go through.

## 4. What happens automatically

- Rows are grouped by `Center` — a file with multiple locations in it fans out into
  one batch per location, all in a single upload.
- Staff are matched to existing records **by name** (case-insensitive). A name that
  doesn't already exist gets a new staff record created automatically, scoped to
  that location.
- Uploading the same location + period again **overwrites** that batch (so re-uploading
  a corrected file is safe — it doesn't create a duplicate).
- Scores are calculated immediately using the current KPI configuration (see
  `/admin/kpi-config` to see the live weights/thresholds) — no separate step.
- Rows marked anything other than `Applicable` are imported but **not scored** —
  they show up as "not scored this period" rather than getting a misleading number.

## 5. Check it worked

The upload page shows a per-location summary (rows scored, staff created vs.
matched). After that, the dashboard reflects it immediately — no cache, no delay.

## Common errors

| Error | What it means | Fix |
|---|---|---|
| "File is missing required columns: ..." | One or more of the exact header names above wasn't found | Check for typos/renamed columns — must match exactly (see the template) |
| "Unknown location "X"" | The `Center` value doesn't match any existing location | Fix the spelling, or ask an Org Level Executive to add the location first |
| "Unknown Profile "X"" | The `Profile` value isn't `TH`, `Dr`, or `Saloon` | Fix the value in that row |
| A Sales Manager's upload silently skips a location | They're not permitted to write to that location | Only an Org Level Executive can upload across locations they don't manage |
