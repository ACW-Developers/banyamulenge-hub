-- 1. Public browse views without contact PII
CREATE OR REPLACE VIEW public.directory_public AS
SELECT id, user_id, kind, name, description, category, location,
       NULL::text AS contact_email, NULL::text AS contact_phone,
       website, image_url, created_at, updated_at
FROM public.directory_entries;

CREATE OR REPLACE VIEW public.marketplace_public AS
SELECT id, user_id, kind, title, description, category, location, price,
       NULL::text AS contact_email, NULL::text AS contact_phone,
       image_url, created_at, updated_at
FROM public.marketplace_listings;

GRANT SELECT ON public.directory_public TO anon, authenticated;
GRANT SELECT ON public.marketplace_public TO anon, authenticated;

-- 2. Restrict base-table reads (with contact details) to signed-in users
DROP POLICY IF EXISTS "Directory public read" ON public.directory_entries;
CREATE POLICY "Directory signed-in read" ON public.directory_entries
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.directory_entries FROM anon;

DROP POLICY IF EXISTS "Marketplace public read" ON public.marketplace_listings;
CREATE POLICY "Marketplace signed-in read" ON public.marketplace_listings
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.marketplace_listings FROM anon;

-- 3. Group rosters: signed-in only
DROP POLICY IF EXISTS "gm readable" ON public.group_members;
CREATE POLICY "gm readable by signed-in" ON public.group_members
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.group_members FROM anon;

-- 4. Storage: users may only write into their own folder
DROP POLICY IF EXISTS "post-images auth upload" ON storage.objects;
CREATE POLICY "post-images owner upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'post-images'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

-- 5. Lock down SECURITY DEFINER helpers from anonymous callers
REVOKE EXECUTE ON FUNCTION public.admin_traffic_stats(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_conversation_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_direct_conversation(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_group_conversation(text, uuid[]) FROM anon;