
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_type TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT;

ALTER TABLE public.messages ALTER COLUMN content DROP NOT NULL;

GRANT UPDATE ON public.messages TO authenticated;

-- Allow marking messages delivered/read by conversation members
DROP POLICY IF EXISTS "msg update member" ON public.messages;
CREATE POLICY "msg update member" ON public.messages FOR UPDATE TO authenticated
  USING (public.is_conversation_member(conversation_id, auth.uid()))
  WITH CHECK (public.is_conversation_member(conversation_id, auth.uid()));

-- Realtime for messages so read/delivered updates propagate live
DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
