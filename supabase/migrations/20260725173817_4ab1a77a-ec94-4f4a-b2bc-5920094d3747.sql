
-- Marketplace listings
CREATE TABLE public.marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('service','product','customer','job')),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC,
  currency TEXT DEFAULT 'USD',
  location TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  image_url TEXT,
  link_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.marketplace_listings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_listings TO authenticated;
GRANT ALL ON public.marketplace_listings TO service_role;

ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Marketplace public read" ON public.marketplace_listings
  FOR SELECT USING (true);
CREATE POLICY "Marketplace owner insert" ON public.marketplace_listings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Marketplace owner or admin update" ON public.marketplace_listings
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Marketplace owner or admin delete" ON public.marketplace_listings
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER marketplace_updated_at BEFORE UPDATE ON public.marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Community directory
CREATE TABLE public.directory_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('professional','church','organization','business','mentor')),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  location TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.directory_entries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.directory_entries TO authenticated;
GRANT ALL ON public.directory_entries TO service_role;

ALTER TABLE public.directory_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Directory public read" ON public.directory_entries
  FOR SELECT USING (true);
CREATE POLICY "Directory owner insert" ON public.directory_entries
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Directory owner or admin update" ON public.directory_entries
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Directory owner or admin delete" ON public.directory_entries
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER directory_updated_at BEFORE UPDATE ON public.directory_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX marketplace_kind_idx ON public.marketplace_listings(kind, created_at DESC);
CREATE INDEX directory_kind_idx ON public.directory_entries(kind, created_at DESC);
