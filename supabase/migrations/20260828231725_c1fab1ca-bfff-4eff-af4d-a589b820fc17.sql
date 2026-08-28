ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}'::text[];

CREATE OR REPLACE FUNCTION public.admin_traffic_stats(days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  since timestamptz := now() - (days || ' days')::interval;
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM public.page_visits WHERE created_at >= since),
    'total_all_time', (SELECT count(*) FROM public.page_visits),
    'unique_visitors', (SELECT count(DISTINCT user_id) FROM public.page_visits WHERE created_at >= since AND user_id IS NOT NULL),
    'today', (SELECT count(*) FROM public.page_visits WHERE created_at >= date_trunc('day', now())),
    'devices', COALESCE((SELECT jsonb_agg(t) FROM (SELECT COALESCE(device,'Unknown') AS name, count(*)::int AS value FROM public.page_visits WHERE created_at >= since GROUP BY 1 ORDER BY 2 DESC) t), '[]'::jsonb),
    'browsers', COALESCE((SELECT jsonb_agg(t) FROM (SELECT COALESCE(browser,'Unknown') AS name, count(*)::int AS value FROM public.page_visits WHERE created_at >= since GROUP BY 1 ORDER BY 2 DESC) t), '[]'::jsonb),
    'os', COALESCE((SELECT jsonb_agg(t) FROM (SELECT COALESCE(os,'Unknown') AS name, count(*)::int AS value FROM public.page_visits WHERE created_at >= since GROUP BY 1 ORDER BY 2 DESC) t), '[]'::jsonb),
    'countries', COALESCE((SELECT jsonb_agg(t) FROM (SELECT COALESCE(country,'Unknown') AS name, count(*)::int AS value FROM public.page_visits WHERE created_at >= since GROUP BY 1 ORDER BY 2 DESC LIMIT 10) t), '[]'::jsonb),
    'pages', COALESCE((SELECT jsonb_agg(t) FROM (SELECT path AS name, count(*)::int AS value FROM public.page_visits WHERE created_at >= since GROUP BY 1 ORDER BY 2 DESC LIMIT 8) t), '[]'::jsonb),
    'timeline', COALESCE((SELECT jsonb_agg(t ORDER BY t.day) FROM (SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, count(*)::int AS visits FROM public.page_visits WHERE created_at >= since GROUP BY 1) t), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_traffic_stats(integer) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_traffic_stats(integer) TO authenticated;