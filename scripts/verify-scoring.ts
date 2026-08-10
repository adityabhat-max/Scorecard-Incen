// Proves the scoring formula reproduces the real, published pptx scorecard
// numbers, without needing a live Postgres instance to run
// supabase/migrations/0003_scoring.sql itself.
//
// Run: npx tsx scripts/verify-scoring.ts

import { calculateScore, type RawKpiValues } from "@/lib/scoring";
import { THERAPIST_DEFAULT_CONFIG } from "@/lib/default-kpi-config";

// Real data from TH_April2026_Vasant_Vihar_New_Delhi.pptx (source-data/),
// [name, expectedFinal, expectedRating, AP, Leave%, Absent%, Reg%, SU%, MissedSig%, Escalations%]
const FIXTURE: [string, number, string, number, number, number, number, number, number, number][] = [
  ["Arti Thandani", 85, "Good", 101, 0, 0, 0, 48, 0, 1.0],
  ["Kiran Singh", 85, "Good", 95, 3, 0, 0, 49, 1, 0.0],
  ["Pinki Rawat", 85, "Good", 95, 3, 0, 0, 47, 1, 1.0],
  ["Roshni VV", 85, "Good", 107, 0, 0, 0, 47, 0, 0.0],
  ["Kamalprit Kaur", 84, "Good", 99, 3, 0, 0, 52, 2, 0.0],
  ["Buandinliu Gangmei", 83, "Good", 91, 7, 0, 0, 54, 0, 0.0],
  ["Manpreet Kaur", 83, "Good", 104, 0, 0, 8, 45, 0, 1.0],
  ["Rakhi .", 82, "Good", 97, 7, 0, 0, 49, 0, 0.0],
  ["Nitya Agarwal", 76, "Satisfactory", 86, 7, 0, 17, 54, 0, 0.0],
  ["Anjali Choudhary", 74, "Satisfactory", 100, 7, 0, 0, 49, 3, 0.0],
  ["Shanti Thapa", 72, "Satisfactory", 98, 7, 0, 0, 38, 2, 0.0],
  ["Sitasha Meer", 71, "Satisfactory", 51, 40, 0, 0, 48, 0, 0.0],
  ["Pooja Bardewa", 70, "Needs Improvement", 86, 7, 0, 0, 48, 3, 0.0],
  ["Krishna Kumar", 69, "Needs Improvement", 88, 7, 0, 0, 20, 0, 0.0],
  ["Shivani Gupta", 69, "Needs Improvement", 75, 27, 0, 5, 44, 0, 0.0],
  ["Bhawna Thakur", 65, "Needs Improvement", 102, 3, 0, 0, 43, 5, 2.0],
  ["Km Shavanam", 65, "Needs Improvement", 65, 0, 0, 0, 4, 0, 0.0],
  ["Manju Tiwari", 65, "Needs Improvement", 99, 3, 0, 0, 18, 3, 0.0],
  ["Pooja Yadav", 65, "Needs Improvement", 24, 67, 0, 0, 39, 0, 0.0],
  ["Sakshi Bhargav", 65, "Needs Improvement", 83, 18, 0, 0, 45, 3, 0.0],
  ["Chhaya Lodhi", 57, "Unsatisfactory", 70, 27, 0, 0, 32, 3, 0.0],
  ["Neelam William", 54, "Unsatisfactory", 87, 13, 0, 0, 35, 5, 0.0],
];

let pass = 0;
let fail = 0;

for (const [
  name, expectedFinal, expectedRating,
  attendance_punctuality, leave_pct, absent_without_leave_pct,
  attendance_regularization_pct, service_utilization_pct,
  signoff_missed_pct, client_escalations_pct,
] of FIXTURE) {
  const raw: RawKpiValues = {
    attendance_punctuality, leave_pct, absent_without_leave_pct,
    attendance_regularization_pct, service_utilization_pct,
    signoff_missed_pct, client_escalations_pct,
  };
  const result = calculateScore(raw, THERAPIST_DEFAULT_CONFIG);

  const ok = result.final === expectedFinal && result.rating === expectedRating;
  if (ok) {
    pass++;
  } else {
    fail++;
    console.log(
      `FAIL ${name}: expected ${expectedFinal}/${expectedRating}, got ${result.final}/${result.rating}`,
      result.categoryScores,
    );
  }
}

console.log(`\n${pass}/${FIXTURE.length} matched exactly, ${fail} mismatches.`);
process.exit(fail === 0 ? 0 : 1);
