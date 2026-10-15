-- Broadcast session_progress inserts over Supabase Realtime. Each subscriber
-- only receives rows their RLS policy allows ("session_progress: own couple").
-- Guarded because Prisma's shadow database has no supabase_realtime publication.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'session_progress'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.session_progress;
  END IF;
END
$$;
