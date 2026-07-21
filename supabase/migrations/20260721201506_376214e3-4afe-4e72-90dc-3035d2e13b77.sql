
-- 1. Add group/title support to conversations for multi-user group chats in Messages
ALTER TABLE public.conversations 
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS is_group boolean NOT NULL DEFAULT false;

-- 2. Add video attachment support to posts
ALTER TABLE public.posts 
  ADD COLUMN IF NOT EXISTS video_url text;

-- 3. Family tree table
CREATE TABLE IF NOT EXISTS public.family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  added_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lineage text NOT NULL,
  name text NOT NULL,
  parent_id uuid REFERENCES public.family_members(id) ON DELETE SET NULL,
  relationship text,
  notes text,
  birth_year int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_members TO authenticated;
GRANT ALL ON public.family_members TO service_role;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can read the family tree"
  ON public.family_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Signed-in users can add family members"
  ON public.family_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = added_by);
CREATE POLICY "Users can update their own contributions"
  ON public.family_members FOR UPDATE TO authenticated USING (auth.uid() = added_by);
CREATE POLICY "Users can delete their own contributions or admins can"
  ON public.family_members FOR DELETE TO authenticated 
  USING (auth.uid() = added_by OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER family_members_touch_updated_at
  BEFORE UPDATE ON public.family_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS family_members_lineage_idx ON public.family_members(lineage);
CREATE INDEX IF NOT EXISTS family_members_parent_idx ON public.family_members(parent_id);
CREATE INDEX IF NOT EXISTS family_members_name_idx ON public.family_members(lower(name));

-- 4. RPC to create a group conversation with a set of participants
CREATE OR REPLACE FUNCTION public.create_group_conversation(_title text, _members uuid[])
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid(); new_id uuid; m uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF coalesce(array_length(_members,1),0) = 0 THEN RAISE EXCEPTION 'need at least one member'; END IF;
  INSERT INTO public.conversations(title, is_group) VALUES (coalesce(nullif(trim(_title),''),'Group'), true)
    RETURNING id INTO new_id;
  INSERT INTO public.conversation_participants(conversation_id, user_id) VALUES (new_id, me)
    ON CONFLICT DO NOTHING;
  FOREACH m IN ARRAY _members LOOP
    IF m <> me THEN
      INSERT INTO public.conversation_participants(conversation_id, user_id) VALUES (new_id, m)
        ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  RETURN new_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.create_group_conversation(text, uuid[]) TO authenticated;
