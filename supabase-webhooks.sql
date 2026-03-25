-- ─────────────────────────────────────────────────────────────────────────────
-- DB Webhook Triggers (pg_net)
-- Already applied 2026-03-24. Re-run if triggers are ever dropped.
-- ─────────────────────────────────────────────────────────────────────────────
-- NOTE: Replace <SERVICE_ROLE_KEY> with the actual service_role key before running.

-- Webhook: classified_files INSERT → send-push Edge Function (Phase 9)
CREATE OR REPLACE FUNCTION public.trigger_send_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url     := 'https://fjnpzjjyhnpmunfoycrp.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body    := jsonb_build_object(
      'type',   TG_OP,
      'table',  TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', row_to_json(NEW)
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_classified_file_insert ON public.classified_files;
CREATE TRIGGER on_classified_file_insert
  AFTER INSERT ON public.classified_files
  FOR EACH ROW EXECUTE FUNCTION public.trigger_send_push();

-- Webhook: vault_members UPDATE → assign-discord-role Edge Function (Phase 7)
CREATE OR REPLACE FUNCTION public.trigger_assign_discord_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url     := 'https://fjnpzjjyhnpmunfoycrp.supabase.co/functions/v1/assign-discord-role',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body    := jsonb_build_object(
      'type',       TG_OP,
      'table',      TG_TABLE_NAME,
      'schema',     TG_TABLE_SCHEMA,
      'record',     row_to_json(NEW),
      'old_record', row_to_json(OLD)
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_vault_member_update ON public.vault_members;
CREATE TRIGGER on_vault_member_update
  AFTER UPDATE ON public.vault_members
  FOR EACH ROW EXECUTE FUNCTION public.trigger_assign_discord_role();
