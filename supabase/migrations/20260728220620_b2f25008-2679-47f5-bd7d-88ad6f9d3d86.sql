
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS created_by uuid;

-- Backfill created_by for existing groups: pick any current participant as owner (best effort).
UPDATE public.conversations c
SET created_by = (
  SELECT cp.user_id FROM public.conversation_participants cp
  WHERE cp.conversation_id = c.id
  LIMIT 1
)
WHERE c.is_group = true AND c.created_by IS NULL;

-- Recreate group-creation function to stamp created_by.
CREATE OR REPLACE FUNCTION public.create_group_conversation(_title text, _members uuid[])
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE me uuid := auth.uid(); new_id uuid; m uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF coalesce(array_length(_members,1),0) = 0 THEN RAISE EXCEPTION 'need at least one member'; END IF;
  INSERT INTO public.conversations(title, is_group, created_by)
    VALUES (coalesce(nullif(trim(_title),''),'Group'), true, me)
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
END; $function$;

-- Allow group creator (or admin) to remove any participant.
DROP POLICY IF EXISTS "cp creator remove" ON public.conversation_participants;
CREATE POLICY "cp creator remove" ON public.conversation_participants
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND c.is_group = true
        AND (c.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
    )
  );

-- Allow group creator (or admin) to delete the conversation itself.
DROP POLICY IF EXISTS "convo delete creator" ON public.conversations;
CREATE POLICY "convo delete creator" ON public.conversations
  FOR DELETE TO authenticated
  USING (
    is_group = true
    AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  );

-- Allow group creator (or admin) to delete messages in the group when cleaning up.
DROP POLICY IF EXISTS "msg delete creator" ON public.messages;
CREATE POLICY "msg delete creator" ON public.messages
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (
          (c.is_group = true AND (c.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role)))
          OR sender_id = auth.uid()
        )
    )
  );
