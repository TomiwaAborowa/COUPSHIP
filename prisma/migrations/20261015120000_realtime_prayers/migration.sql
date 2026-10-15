-- Broadcast prayer_requests and prayer_amens changes over Supabase Realtime.
-- INSERT/UPDATE events are filtered per subscriber by the existing RLS policies.
-- Clients must NOT subscribe to DELETE: Realtime can't apply RLS to deletes.
-- Guarded because Prisma's shadow database has no supabase_realtime publication.
DO $$
DECLARE
  t text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH t IN ARRAY ARRAY['prayer_requests', 'prayer_amens'] LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      END IF;
    END LOOP;
  END IF;
END
$$;
