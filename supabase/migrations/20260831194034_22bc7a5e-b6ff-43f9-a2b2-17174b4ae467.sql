ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS edited_at timestamptz;

CREATE OR REPLACE FUNCTION public.messages_guard_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.content IS DISTINCT FROM OLD.content
     OR NEW.attachment_url IS DISTINCT FROM OLD.attachment_url THEN
    IF auth.uid() IS DISTINCT FROM OLD.sender_id THEN
      RAISE EXCEPTION 'Only the sender can edit a message';
    END IF;
    IF OLD.read_at IS NOT NULL THEN
      RAISE EXCEPTION 'Message already read and can no longer be edited';
    END IF;
    NEW.edited_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_guard_edit_trg ON public.messages;
CREATE TRIGGER messages_guard_edit_trg
BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.messages_guard_edit();

DROP POLICY IF EXISTS "msg delete sender unread" ON public.messages;
CREATE POLICY "msg delete sender unread" ON public.messages
FOR DELETE TO authenticated
USING (sender_id = auth.uid() AND read_at IS NULL);