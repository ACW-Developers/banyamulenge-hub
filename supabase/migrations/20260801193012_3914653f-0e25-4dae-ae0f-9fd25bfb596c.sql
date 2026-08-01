ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS avatar_url text;

DROP POLICY IF EXISTS "convo select member" ON public.conversations;
CREATE POLICY "convo select member or public group"
ON public.conversations FOR SELECT TO authenticated
USING (is_group = true OR public.is_conversation_member(id, auth.uid()));

DROP POLICY IF EXISTS "convo update member" ON public.conversations;
CREATE POLICY "convo update owner or dm member"
ON public.conversations FOR UPDATE TO authenticated
USING (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR (is_group = false AND public.is_conversation_member(id, auth.uid()))
)
WITH CHECK (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR (is_group = false AND public.is_conversation_member(id, auth.uid()))
);

DROP POLICY IF EXISTS "cp select self" ON public.conversation_participants;
CREATE POLICY "cp select member or group roster"
ON public.conversation_participants FOR SELECT TO authenticated
USING (
  public.is_conversation_member(conversation_id, auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_participants.conversation_id AND c.is_group = true
  )
);

DELETE FROM public.group_messages;
DELETE FROM public.group_members;
DELETE FROM public.posts WHERE group_id IS NOT NULL;
DELETE FROM public.groups;