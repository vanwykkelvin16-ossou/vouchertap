-- Admin-gated access to all push subscriptions for broadcasting, so the app
-- server no longer needs the service-role key.
CREATE OR REPLACE FUNCTION public.get_broadcast_subscriptions(_category text)
RETURNS TABLE (id uuid, endpoint text, p256dh text, auth text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF _category = 'vouchers' THEN
    RETURN QUERY SELECT s.id, s.endpoint, s.p256dh, s.auth
      FROM public.push_subscriptions s WHERE s.notify_vouchers = true;
  ELSE
    RETURN QUERY SELECT s.id, s.endpoint, s.p256dh, s.auth
      FROM public.push_subscriptions s WHERE s.notify_events = true;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_broadcast_subscriptions(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_broadcast_subscriptions(text) FROM PUBLIC, anon;

-- Cleanup of dead endpoints after a broadcast (admin) or a test push (owner).
CREATE OR REPLACE FUNCTION public.remove_push_endpoints(_endpoints text[])
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _count integer;
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    DELETE FROM public.push_subscriptions WHERE endpoint = ANY(_endpoints);
  ELSE
    DELETE FROM public.push_subscriptions
     WHERE endpoint = ANY(_endpoints) AND user_id = auth.uid();
  END IF;
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.remove_push_endpoints(text[]) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.remove_push_endpoints(text[]) FROM PUBLIC, anon;
