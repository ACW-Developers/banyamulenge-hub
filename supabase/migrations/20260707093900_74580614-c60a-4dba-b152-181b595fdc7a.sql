
-- Posts: announcement flag + group_id
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_announcement boolean NOT NULL DEFAULT false;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS posts_group_id_idx ON public.posts(group_id);

-- Only admins may mark announcements
DROP POLICY IF EXISTS "users create own posts" ON public.posts;
CREATE POLICY "users create own posts" ON public.posts
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND (is_announcement = false OR public.has_role(auth.uid(), 'admin'))
  );

-- Admin CRUD on profiles
DROP POLICY IF EXISTS "admins manage profiles" ON public.profiles;
CREATE POLICY "admins manage profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Page visits tracking
CREATE TABLE IF NOT EXISTS public.page_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  path text NOT NULL,
  device text,
  browser text,
  os text,
  country text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS page_visits_created_at_idx ON public.page_visits(created_at DESC);
GRANT SELECT, INSERT ON public.page_visits TO authenticated;
GRANT ALL ON public.page_visits TO service_role;
ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "any auth can insert own visit" ON public.page_visits
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "admins read visits" ON public.page_visits
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Security-definer RPC for creating a direct conversation atomically
CREATE OR REPLACE FUNCTION public.create_direct_conversation(other_user uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  existing uuid;
  new_id uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF me = other_user THEN RAISE EXCEPTION 'cannot dm yourself'; END IF;

  SELECT cp1.conversation_id INTO existing
  FROM public.conversation_participants cp1
  JOIN public.conversation_participants cp2
    ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = me AND cp2.user_id = other_user
  LIMIT 1;

  IF existing IS NOT NULL THEN RETURN existing; END IF;

  INSERT INTO public.conversations DEFAULT VALUES RETURNING id INTO new_id;
  INSERT INTO public.conversation_participants(conversation_id, user_id)
    VALUES (new_id, me), (new_id, other_user);
  RETURN new_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_direct_conversation(uuid) TO authenticated;
