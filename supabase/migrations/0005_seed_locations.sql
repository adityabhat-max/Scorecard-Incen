-- The 8 real centers found in "Doctor & Therapist Performance Report - July
-- 2025.xlsx" (source-data/, Final Report sheet). Locations must exist before
-- an upload can reference them — the import flow matches by name and does
-- not auto-create locations (only org_level_executive can, via /admin, same
-- as the RLS policy on the locations table).

insert into locations (name) values
  ('Vasant Vihar'),
  ('Greater Kailash'),
  ('Khan Market'),
  ('Noida'),
  ('Gurugram'),
  ('Mumbai'),
  ('Bangalore'),
  ('Hyderabad')
on conflict (name) do nothing;
