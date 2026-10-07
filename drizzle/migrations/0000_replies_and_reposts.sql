ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS comments_parent_idx ON public.comments(parent_id);

CREATE TABLE public.reposts (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);
CREATE INDEX reposts_post_idx ON public.reposts(post_id);
GRANT SELECT, INSERT, DELETE ON public.reposts TO authenticated;
GRANT ALL ON public.reposts TO service_role;
ALTER TABLE public.reposts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users view reposts" ON public.reposts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users repost as themselves" ON public.reposts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users undo own reposts" ON public.reposts FOR DELETE TO authenticated USING (auth.uid() = user_id);