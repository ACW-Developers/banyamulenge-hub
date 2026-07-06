
-- ============ ROLES ============
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

DROP POLICY IF EXISTS "users read own roles" ON public.user_roles;
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins insert roles" ON public.user_roles;
CREATE POLICY "admins insert roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins delete roles" ON public.user_roles;
CREATE POLICY "admins delete roles" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Auto-promote admin@admin.com
CREATE OR REPLACE FUNCTION public.auto_grant_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email IS NOT NULL AND lower(NEW.email) = 'admin@admin.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created_grant_role ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_role
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.auto_grant_admin();

-- ============ ADMIN BOOTSTRAP ============
DO $$
DECLARE admin_id uuid;
BEGIN
  SELECT id INTO admin_id FROM auth.users WHERE lower(email) = 'admin@admin.com' LIMIT 1;
  IF admin_id IS NULL THEN
    admin_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', admin_id, 'authenticated', 'authenticated',
      'admin@admin.com', crypt('0206White!', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"display_name":"Administrator","username":"admin"}'::jsonb,
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), admin_id, jsonb_build_object('sub', admin_id::text, 'email', 'admin@admin.com'), 'email', admin_id::text, now(), now(), now());
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (admin_id, 'admin') ON CONFLICT DO NOTHING;
  INSERT INTO public.profiles (id, username, display_name)
    VALUES (admin_id, 'admin', 'Administrator') ON CONFLICT (id) DO NOTHING;
END $$;

-- ============ ACTIVITY LOGS ============
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users insert own logs" ON public.activity_logs;
CREATE POLICY "users insert own logs" ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "admins read logs" ON public.activity_logs;
CREATE POLICY "admins read logs" ON public.activity_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============ GROUPS ============
CREATE TABLE IF NOT EXISTS public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  cover_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.groups TO authenticated;
GRANT SELECT ON public.groups TO anon;
GRANT ALL ON public.groups TO service_role;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "groups readable" ON public.groups;
CREATE POLICY "groups readable" ON public.groups FOR SELECT USING (true);
DROP POLICY IF EXISTS "auth create groups" ON public.groups;
CREATE POLICY "auth create groups" ON public.groups FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "creator or admin update" ON public.groups;
CREATE POLICY "creator or admin update" ON public.groups FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "creator or admin delete" ON public.groups;
CREATE POLICY "creator or admin delete" ON public.groups FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.group_members (
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_members TO authenticated;
GRANT SELECT ON public.group_members TO anon;
GRANT ALL ON public.group_members TO service_role;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gm readable" ON public.group_members;
CREATE POLICY "gm readable" ON public.group_members FOR SELECT USING (true);
DROP POLICY IF EXISTS "gm join self" ON public.group_members;
CREATE POLICY "gm join self" ON public.group_members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "gm leave self" ON public.group_members;
CREATE POLICY "gm leave self" ON public.group_members FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_groups_updated BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ MESSAGES (DMs) ============
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.conversation_participants (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (conversation_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.conversation_participants TO authenticated;
GRANT ALL ON public.conversation_participants TO service_role;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_conversation_member(_convo uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = _convo AND user_id = _user)
$$;

DROP POLICY IF EXISTS "convo select member" ON public.conversations;
CREATE POLICY "convo select member" ON public.conversations FOR SELECT TO authenticated
  USING (public.is_conversation_member(id, auth.uid()));
DROP POLICY IF EXISTS "convo insert auth" ON public.conversations;
CREATE POLICY "convo insert auth" ON public.conversations FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "convo update member" ON public.conversations;
CREATE POLICY "convo update member" ON public.conversations FOR UPDATE TO authenticated
  USING (public.is_conversation_member(id, auth.uid()));

DROP POLICY IF EXISTS "cp select self" ON public.conversation_participants;
CREATE POLICY "cp select self" ON public.conversation_participants FOR SELECT TO authenticated
  USING (public.is_conversation_member(conversation_id, auth.uid()));
DROP POLICY IF EXISTS "cp insert auth" ON public.conversation_participants;
CREATE POLICY "cp insert auth" ON public.conversation_participants FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_conversation_member(conversation_id, auth.uid()));
DROP POLICY IF EXISTS "cp delete self" ON public.conversation_participants;
CREATE POLICY "cp delete self" ON public.conversation_participants FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_convo ON public.messages(conversation_id, created_at);
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "msg select member" ON public.messages;
CREATE POLICY "msg select member" ON public.messages FOR SELECT TO authenticated
  USING (public.is_conversation_member(conversation_id, auth.uid()));
DROP POLICY IF EXISTS "msg insert sender" ON public.messages;
CREATE POLICY "msg insert sender" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND public.is_conversation_member(conversation_id, auth.uid()));

-- Bump conversation last_message_at
CREATE OR REPLACE FUNCTION public.touch_conversation()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS on_message_touch ON public.messages;
CREATE TRIGGER on_message_touch AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_conversation();

-- ============ AVATAR STORAGE POLICIES ============
DO $$ BEGIN
  DROP POLICY IF EXISTS "avatars public read" ON storage.objects;
  DROP POLICY IF EXISTS "avatars user upload" ON storage.objects;
  DROP POLICY IF EXISTS "avatars user update" ON storage.objects;
  DROP POLICY IF EXISTS "avatars user delete" ON storage.objects;
END $$;
CREATE POLICY "avatars public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
CREATE POLICY "avatars user upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars user update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars user delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
