# Isaac Wellness Staff Scorecard

A web dashboard replacing Isaac Aesthetic Center's manual Excel → PowerPoint monthly
performance-scorecard process, backed by real Postgres Row-Level Security so each
access tier only ever sees the data it's scoped to — enforced at the database layer,
not just hidden in the UI.

**Live:** https://scorecard-incen.vercel.app

**Want to load a new month's data?** See **[HOW_TO_ADD_DATA.md](./HOW_TO_ADD_DATA.md)** —
that's the doc for "I have new numbers, how do they get in here."

## What this actually does

Every month, raw KPI numbers (attendance, service utilization, client escalations,
etc.) get uploaded as a CSV/Excel file. The system computes a 0-100 performance score
per person from those raw numbers using a documented weighted formula, and everyone
logs in to see exactly the slice of that data their role is allowed to see.

## Access model

Three roles, enforced by Postgres RLS policies (`supabase/migrations/0002_rls.sql`),
not by the app hiding buttons:

| Role | Sees |
|---|---|
| **Org Level Executive** | Every location, every staff member — full company view |
| **Sales Manager** | Only their one assigned location's staff |
| **Sales Executive** | Only their own individual scorecard |

A person's **access role** (the table above) is separate from their **profile type**
(Therapist / Doctor / Salon), which just determines which KPI formula applies to them.
A Therapist logs in with the Sales Executive role; the two concepts aren't the same
thing.

RLS policies key off a `profiles` table (`role`, `location_id`) joined to `auth.uid()`
— never trust the client to enforce scope, the database does it regardless of which
code path queries it.

## How scoring works

Each of 7 raw KPIs maps through a step-function to a 0-100 sub-score, sub-scores
combine into 3 weighted categories, categories combine into a final score:

```
Final Score = Attendance Category × 0.30
            + Service Category    × 0.30
            + Customer Category   × 0.40
```

- **Attendance** = Punctuality×0.35 + Leave%×0.25 + Absent w/o Leave×0.20 + Regularization×0.20
- **Service** = Service Utilization×1.00
- **Customer** = Missed Signatures×0.50 + Client Escalations×0.50

Rating bands: 90+ Exceptional · 80-89 Good · 70-79 Satisfactory · 60-69 Needs
Improvement · below 60 Unsatisfactory. Rating is decided from the **unrounded** score
— a raw 69.8 displays as 70 but still rates "Needs Improvement," not "Satisfactory."
(This one's easy to get backwards; a Node fixture test against the real published
scores caught it — see `npm run verify:scoring`.)

This is the confirmed **Therapist** formula, cross-checked against real published
results. **Salon** staff use the identical formula (verified: same raw fields).
**Doctor** currently reuses the Therapist formula as a placeholder — real Doctor
attendance-regularization values run far higher than Therapists' — so Doctor scores
are flagged `unconfirmed` everywhere they appear until real thresholds are supplied.

All of this — every threshold, every weight — lives in `kpi_config`, versioned and
editable without a code deploy (`/admin/kpi-config` to view it; see
`supabase/migrations/0004_seed_kpi_config.sql` for the seeded defaults). The actual
calculation runs as a Postgres function (`calculate_scores`,
`supabase/migrations/0003_scoring.sql`) so it's one auditable place, not duplicated
app-side logic that can drift.

## Tech stack

- **Next.js 16** (App Router) + TypeScript, **Tailwind v4** + shadcn/ui
- **Supabase**: Postgres + RLS, Supabase Auth (email/password)
- **Recharts** for the score trend chart, hand-rolled SVG for the score ring
- Hosted on **Vercel**, connected to GitHub for auto-deploy on push to `main`

## Project structure

```
supabase/migrations/     Schema, RLS policies, scoring engine, seed data (run in order)
src/lib/scoring.ts        Scoring math mirror (TS) — used for what-if simulation
                           and scripts/verify-scoring.ts; the SQL function is the
                           source of truth for scores actually stored
src/lib/import/           CSV/XLSX parsing + column mapping for monthly uploads
src/app/dashboard/        Role-aware views (org summary / location / individual)
src/app/admin/            Upload, user management, KPI config viewer
scripts/                  verify-scoring.ts, check-report.ts — see below
templates/                monthly-report-template.csv — copy this for new uploads
```

## Useful scripts

```bash
npm run dev              # local dev server
npm run build             # production build
npm run verify:scoring    # proves the formula reproduces real published scores
npm run check:report -- "path/to/file.csv"   # dry-run a monthly upload file locally
```

## Local setup

1. `npm install`
2. Copy `.env.example` to `.env.local`, fill in your Supabase project's URL + anon
   key + service role key (Project Settings → API in the Supabase dashboard)
3. Apply the migrations in `supabase/migrations/` in order (via the Supabase SQL
   Editor, or `supabase db push` if you have the CLI linked)
4. `npm run dev`

## Known open items

- **Doctor KPI formula is a placeholder** (see "How scoring works" above) — needs
  real weights/thresholds from the business, not engineering.
- **No draft/publish gate** — a batch's scores go live the moment it's uploaded and
  calculated. Add a `status` column to `score_batches` if a review step before staff
  can see their own numbers becomes a requirement.
- **`Trt. Tat`** (Doctor-only treatment turnaround time) exists in the source data,
  unused — no weight assigned.
- Real employee logins (beyond the initial test accounts) are pending a reviewed
  roster — see `source-data/roster-draft.csv` (local only, not in this repo).
