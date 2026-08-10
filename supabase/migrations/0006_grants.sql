-- Explicit privilege grants. Tables were created via a direct `postgres`
-- connection rather than Supabase's own migration path, so the usual
-- automatic grants to anon/authenticated/service_role didn't apply — every
-- query was failing with "permission denied" before RLS even got evaluated.
-- RLS policies (0002_rls.sql) remain the actual row-level gate; these grants
-- just allow the roles to reach the tables/functions at all.

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant execute on all functions in schema public to authenticated;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on functions to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant execute on functions to authenticated;
alter default privileges in schema public grant select on tables to anon;
