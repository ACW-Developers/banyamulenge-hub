GRANT INSERT ON public.donations TO anon, authenticated;

CREATE POLICY "Anyone can create a pending donation"
ON public.donations
FOR INSERT
TO anon, authenticated
WITH CHECK (status = 'pending');

CREATE OR REPLACE FUNCTION public.mark_donation_result(
  p_session_id text,
  p_status text,
  p_amount_cents integer,
  p_donor_email text,
  p_donor_name text,
  p_payment_intent_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.donations
  SET status = p_status,
      amount_cents = COALESCE(p_amount_cents, amount_cents),
      donor_email = COALESCE(p_donor_email, donor_email),
      donor_name = COALESCE(p_donor_name, donor_name),
      stripe_payment_intent_id = COALESCE(p_payment_intent_id, stripe_payment_intent_id)
  WHERE stripe_session_id = p_session_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_donation_result(text, text, integer, text, text, text) TO anon, authenticated, service_role;