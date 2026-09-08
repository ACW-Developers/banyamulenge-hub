CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = _user_id
      AND lower(email) = 'admin@banyamulengehub.com'
  )
$$;

CREATE TABLE IF NOT EXISTS public.module_settings (
  key text PRIMARY KEY,
  label text NOT NULL,
  visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.module_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.module_settings TO authenticated;
GRANT ALL ON public.module_settings TO service_role;

ALTER TABLE public.module_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Module settings are readable by everyone" ON public.module_settings;
CREATE POLICY "Module settings are readable by everyone"
ON public.module_settings FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Super admin can insert module settings" ON public.module_settings;
CREATE POLICY "Super admin can insert module settings"
ON public.module_settings FOR INSERT TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admin can update module settings" ON public.module_settings;
CREATE POLICY "Super admin can update module settings"
ON public.module_settings FOR UPDATE TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER module_settings_updated_at
BEFORE UPDATE ON public.module_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.module_settings (key, label, sort_order) VALUES
  ('home', 'Home', 1),
  ('explore', 'Explore', 2),
  ('community', 'Community', 3),
  ('marketplace', 'Marketplace', 4),
  ('directory', 'Directory', 5),
  ('messages', 'Messages', 6),
  ('heritage', 'Our Heritage', 7),
  ('museum', 'Virtual Museum', 8),
  ('gallery', 'Gallery', 9),
  ('family-tree', 'Family Tree', 10),
  ('donate', 'Donate button', 11)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users
WHERE lower(email) = 'admin@banyamulengehub.com'
ON CONFLICT (user_id, role) DO NOTHING;