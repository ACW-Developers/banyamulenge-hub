-- Public views run as the querying user; column grants below decide what anon sees
DROP VIEW IF EXISTS public.directory_public;
DROP VIEW IF EXISTS public.marketplace_public;

CREATE VIEW public.directory_public
WITH (security_invoker = on) AS
SELECT id, user_id, kind, name, description, category, location,
       website, image_url, created_at, updated_at
FROM public.directory_entries;

CREATE VIEW public.marketplace_public
WITH (security_invoker = on) AS
SELECT id, user_id, kind, category, title, description, price, currency, location,
       image_url, link_url, created_at, updated_at
FROM public.marketplace_listings;

GRANT SELECT ON public.directory_public TO anon, authenticated;
GRANT SELECT ON public.marketplace_public TO anon, authenticated;

-- Anonymous visitors may read listings, but only non-contact columns
CREATE POLICY "Directory anon read" ON public.directory_entries
  FOR SELECT TO anon USING (true);
GRANT SELECT (id, user_id, kind, name, description, category, location,
              website, image_url, created_at, updated_at)
  ON public.directory_entries TO anon;

CREATE POLICY "Marketplace anon read" ON public.marketplace_listings
  FOR SELECT TO anon USING (true);
GRANT SELECT (id, user_id, kind, category, title, description, price, currency,
              location, image_url, link_url, created_at, updated_at)
  ON public.marketplace_listings TO anon;