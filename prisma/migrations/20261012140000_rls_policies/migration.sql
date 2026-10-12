-- Row Level Security for every table reachable through Supabase's API.
--
-- Prisma connects as the table owner (postgres), which bypasses RLS, so these
-- policies only govern supabase-js / Realtime access made with a Clerk token.
-- There are deliberately NO insert/update/delete policies: all writes go
-- through server actions via Prisma, so the API is read-only.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Clerk user ID from the request's JWT. plpgsql so the body isn't validated at
-- creation time (Prisma's shadow database has no `auth` schema).
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
BEGIN
  RETURN auth.jwt() ->> 'sub';
END;
$$;

-- The caller's couple. SECURITY DEFINER so policies on couple_members can use
-- it without recursing into their own RLS check.
CREATE OR REPLACE FUNCTION public.my_couple_id()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN (
    SELECT cm."coupleId"
    FROM public.couple_members cm
    WHERE cm."userId" = public.current_user_id()
  );
END;
$$;

-- Delayed reveal: has the caller submitted their own reflection for a session?
CREATE OR REPLACE FUNCTION public.has_reflected(session_id text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.reflections r
    WHERE r."sessionId" = session_id
      AND r."userId" = public.current_user_id()
  );
END;
$$;

-- Does a session belong to the caller's couple?
CREATE OR REPLACE FUNCTION public.session_in_my_couple(session_id text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.devotional_sessions s
    WHERE s.id = session_id
      AND s."coupleId" = public.my_couple_id()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.current_user_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_couple_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_reflected(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.session_in_my_couple(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_couple_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_reflected(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.session_in_my_couple(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere (no policy = no access through the API)
-- ---------------------------------------------------------------------------

ALTER TABLE "users"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "couples"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "couple_members"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "devotionals"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "devotional_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reflections"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "session_progress"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prayer_requests"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prayer_amens"        ENABLE ROW LEVEL SECURITY;
-- Prisma's bookkeeping table also lives in public; hide it from the API.
ALTER TABLE "_prisma_migrations"  ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Read policies (authenticated Clerk users only)
-- ---------------------------------------------------------------------------

CREATE POLICY "users: self and partner"
  ON "users" FOR SELECT TO authenticated
  USING (
    id = public.current_user_id()
    OR EXISTS (
      SELECT 1 FROM "couple_members" cm
      WHERE cm."userId" = "users".id
        AND cm."coupleId" = public.my_couple_id()
    )
  );

CREATE POLICY "couples: own couple"
  ON "couples" FOR SELECT TO authenticated
  USING (id = public.my_couple_id());

CREATE POLICY "couple_members: own couple"
  ON "couple_members" FOR SELECT TO authenticated
  USING ("coupleId" = public.my_couple_id());

CREATE POLICY "devotionals: readable by any signed-in user"
  ON "devotionals" FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "devotional_sessions: own couple"
  ON "devotional_sessions" FOR SELECT TO authenticated
  USING ("coupleId" = public.my_couple_id());

-- The delayed-reveal rule: your own reflection always; your partner's only
-- once you've submitted yours for the same session.
CREATE POLICY "reflections: own, or partner's after you reflect"
  ON "reflections" FOR SELECT TO authenticated
  USING (
    "userId" = public.current_user_id()
    OR (
      public.session_in_my_couple("sessionId")
      AND public.has_reflected("sessionId")
    )
  );

-- Progress carries no content, so both partners can see it (drives Realtime).
CREATE POLICY "session_progress: own couple"
  ON "session_progress" FOR SELECT TO authenticated
  USING (public.session_in_my_couple("sessionId"));

CREATE POLICY "prayer_requests: own couple"
  ON "prayer_requests" FOR SELECT TO authenticated
  USING ("coupleId" = public.my_couple_id());

CREATE POLICY "prayer_amens: own couple"
  ON "prayer_amens" FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "prayer_requests" p
      WHERE p.id = "prayer_amens"."prayerRequestId"
        AND p."coupleId" = public.my_couple_id()
    )
  );
