-- Migration: 20261018160000_hire-requests.sql
-- Description: Client hire requests with strict privacy RLS (Only Sihu Admin can read client details)

CREATE TABLE IF NOT EXISTS public.sihu_hire_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_name text NOT NULL DEFAULT '',
  client_name text NOT NULL,
  client_email text NOT NULL,
  client_phone text NOT NULL,
  project_type text NOT NULL,
  details text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'contacted', 'assigned', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  admin_note text NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS sihu_hire_requests_queue ON public.sihu_hire_requests(status, created_at DESC);

ALTER TABLE public.sihu_hire_requests ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.sihu_hire_requests FROM anon, authenticated;

-- Only verified Sihu administrators can read or update client hire requests
CREATE POLICY sihu_hire_requests_admin_read ON public.sihu_hire_requests FOR SELECT TO authenticated
USING ((SELECT public.sihu_is_admin()));

CREATE POLICY sihu_hire_requests_admin_update ON public.sihu_hire_requests FOR UPDATE TO authenticated
USING ((SELECT public.sihu_is_admin()))
WITH CHECK ((SELECT public.sihu_is_admin()));

-- Secure public RPC to submit hire requests without exposing any read access
CREATE OR REPLACE FUNCTION public.sihu_submit_hire_request(
  p_creator_name text,
  p_client_name text,
  p_client_email text,
  p_client_phone text,
  p_project_type text,
  p_details text DEFAULT ''
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  new_id uuid;
  clean_name text := trim(coalesce(p_client_name, ''));
  clean_email text := lower(trim(coalesce(p_client_email, '')));
  clean_phone text := trim(coalesce(p_client_phone, ''));
  clean_type text := trim(coalesce(p_project_type, ''));
  clean_details text := trim(coalesce(p_details, ''));
  clean_creator text := trim(coalesce(p_creator_name, 'General Inquiry'));
BEGIN
  IF length(clean_name) < 2 OR length(clean_name) > 100 THEN
    RAISE EXCEPTION 'Please enter your full name.';
  END IF;

  IF clean_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Please enter a valid email address.';
  END IF;

  IF clean_phone !~ '^\+?[0-9 ()-]{8,20}$' THEN
    RAISE EXCEPTION 'Please enter a valid WhatsApp phone number.';
  END IF;

  IF length(clean_type) < 2 THEN
    clean_type := 'Video Editing / Reel';
  END IF;

  INSERT INTO public.sihu_hire_requests (
    creator_name, client_name, client_email, client_phone, project_type, details
  ) VALUES (
    clean_creator, clean_name, clean_email, clean_phone, clean_type, clean_details
  ) RETURNING id INTO new_id;

  RETURN jsonb_build_object(
    'success', true,
    'id', new_id,
    'message', 'Your request has been received. The Sihu team will connect with you via WhatsApp and email.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.sihu_submit_hire_request(text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sihu_submit_hire_request(text, text, text, text, text, text) TO anon, authenticated;
