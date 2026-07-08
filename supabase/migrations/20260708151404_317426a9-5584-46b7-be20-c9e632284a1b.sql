
DROP POLICY IF EXISTS "users delete own posts" ON public.posts;
CREATE POLICY "delete own or admin" ON public.posts FOR DELETE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.posts REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.likes REPLICA IDENTITY FULL;
ALTER TABLE public.comments REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;

DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.posts; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.messages; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.likes; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.comments; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

DROP POLICY IF EXISTS "post-images public read" ON storage.objects;
DROP POLICY IF EXISTS "post-images auth upload" ON storage.objects;
DROP POLICY IF EXISTS "post-images owner update" ON storage.objects;
DROP POLICY IF EXISTS "post-images owner delete" ON storage.objects;
CREATE POLICY "post-images public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'post-images');
CREATE POLICY "post-images auth upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'post-images');
CREATE POLICY "post-images owner update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'post-images' AND owner = auth.uid());
CREATE POLICY "post-images owner delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'post-images' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin')));

CREATE TABLE public.adverts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  link_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.adverts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.adverts TO authenticated;
GRANT ALL ON public.adverts TO service_role;
ALTER TABLE public.adverts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "adverts readable" ON public.adverts FOR SELECT USING (true);
CREATE POLICY "adverts admin insert" ON public.adverts FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "adverts admin update" ON public.adverts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "adverts admin delete" ON public.adverts FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER adverts_updated BEFORE UPDATE ON public.adverts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.adverts REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.adverts; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
