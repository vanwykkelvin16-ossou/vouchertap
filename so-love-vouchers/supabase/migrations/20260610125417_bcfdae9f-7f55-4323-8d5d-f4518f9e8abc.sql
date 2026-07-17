ALTER TABLE public.vouchers
  ADD COLUMN IF NOT EXISTS is_recurring boolean NOT NULL DEFAULT false;

ALTER TABLE public.voucher_claims
  ADD COLUMN IF NOT EXISTS cycle_key text NOT NULL DEFAULT 'once';

ALTER TABLE public.voucher_claims
  DROP CONSTRAINT IF EXISTS voucher_claims_voucher_id_user_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS voucher_claims_voucher_user_cycle_key
  ON public.voucher_claims (voucher_id, user_id, cycle_key);

CREATE OR REPLACE FUNCTION public.claim_voucher(_voucher_id UUID)
RETURNS public.voucher_claims
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _v public.vouchers;
  _claim public.voucher_claims;
  _cycle text;
BEGIN
  SELECT * INTO _v FROM public.vouchers WHERE id = _voucher_id AND is_active = true;
  IF _v.id IS NULL THEN
    RAISE EXCEPTION 'voucher_not_available';
  END IF;
  IF _v.available_until IS NOT NULL AND _v.available_until < now() THEN
    RAISE EXCEPTION 'voucher_expired';
  END IF;

  _cycle := CASE
    WHEN _v.is_recurring THEN to_char(now() AT TIME ZONE 'Africa/Johannesburg', 'YYYY-MM')
    ELSE 'once'
  END;

  INSERT INTO public.voucher_claims (voucher_id, user_id, expires_at, cycle_key)
  VALUES (
    _voucher_id,
    auth.uid(),
    now() + (_v.claim_window_hours || ' hours')::interval,
    _cycle
  )
  RETURNING * INTO _claim;

  RETURN _claim;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_voucher(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_voucher(UUID) FROM PUBLIC, anon;