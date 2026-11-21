-- ============================================================================
-- KodaHosting Supabase / PostgreSQL Security Hardening Checklist & SQL Script
-- Run in Supabase Dashboard -> SQL Editor (review table/column names first).
--
-- WHY THIS MATTERS:
-- Any visitor can call https://<project>.supabase.co/rest/v1/... directly with
-- the public browser `anon` key. Website frontend checks improve UX and stop
-- browser-side XSS/token theft, while PostgreSQL RLS + hardened RPC functions
-- make direct Supabase / Postgres database exploits impossible.
-- ============================================================================

-- 1. Enforce Row Level Security (RLS) on ALL tables in the public schema
DO $$
DECLARE
  tbl record;
BEGIN
  FOR tbl IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl.tablename);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', tbl.tablename);
  END LOOP;
END $$;

-- 2. Lock down `app_settings` so browsers can ONLY read safe public feature flags
--    and can NEVER read private config keys or modify settings.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.app_settings FROM anon, authenticated;
DROP POLICY IF EXISTS "app_settings_public_read_only" ON public.app_settings;
CREATE POLICY "app_settings_public_read_only"
  ON public.app_settings
  FOR SELECT
  TO anon, authenticated
  USING (key IN ('kodadash_https'));

-- 3. Lock down `rpc_get_servers_for_auth()`:
--    - Revoke PUBLIC and anon execution (must be signed-in `authenticated` user).
--    - Pin `search_path` so search_path hijacking is impossible on SECURITY DEFINER.
--    - Inside the function body, ALWAYS filter strictly by `auth.uid()` (never trust
--      any client-supplied user_id argument).
REVOKE ALL ON FUNCTION public.rpc_get_servers_for_auth() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_servers_for_auth() TO authenticated;
ALTER FUNCTION public.rpc_get_servers_for_auth() SET search_path = public, pg_catalog;

-- 4. Audit ALL SECURITY DEFINER functions in `public` to ensure fixed search_path
--    and verify none are unexpectedly executable by `anon` or `PUBLIC`:
-- SELECT p.proname,
--        pg_get_function_identity_arguments(p.oid) AS args,
--        p.prosecdef AS is_security_definer,
--        p.proconfig AS config
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public';

-- 5. Restrict default privileges so newly created tables/functions are not
--    accidentally exposed to `anon` or `PUBLIC`.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC, anon;

-- 6. Verify every table has explicit least-privilege RLS policies (audit query):
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
--
-- SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

-- 7. Supabase Dashboard Auth & Storage Checklist:
--    a) Auth -> URL Configuration -> Redirect URLs:
--       Allow ONLY exact production origins (e.g., https://host.kodanetwork.eu/reset,
--       https://host.kodanetwork.eu/dashboard, https://host.kodanetwork.eu/developer).
--       Remove any wildcard `*` or localhost entries in production.
--    b) Auth -> Password Protection:
--       Enable "Leaked Password Protection" (HaveIBeenPwned) and set minimum length >= 8.
--    c) Storage Buckets (avatars, extension icons, screenshots, .kodaext packages):
--       Set strict MIME allowlists (image/png, image/jpeg, image/webp; NEVER image/svg+xml
--       or text/html), enforce file size caps (<= 2 MB images, <= 20 MB packages), and
--       scope INSERT/UPDATE/DELETE policies to `auth.uid()::text = (storage.foldername(name))[1]`.
--    d) API Settings:
--       Keep `service_role` key strictly on your backend API (`api.kodanetwork.eu`) and
--       NEVER inside the website or Android APK.
