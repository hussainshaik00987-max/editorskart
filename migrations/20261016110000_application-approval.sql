CREATE TABLE public.sihu_admin_emails (email text PRIMARY KEY);
INSERT INTO public.sihu_admin_emails VALUES ('hussainshaik00987@gmail.com');
ALTER TABLE public.sihu_admin_emails ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sihu_admin_emails FROM anon, authenticated;

CREATE FUNCTION public.sihu_is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM auth.users u JOIN public.sihu_admin_emails a ON lower(u.email)=a.email
 WHERE u.id=auth.uid() AND u.email_verified=true);
$$;
REVOKE ALL ON FUNCTION public.sihu_is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sihu_is_admin() TO authenticated;

CREATE TABLE public.sihu_applications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
 email text NOT NULL,
 profile jsonb NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 created_at timestamptz NOT NULL DEFAULT now(),
 reviewed_at timestamptz,
 reviewed_by uuid REFERENCES auth.users(id),
 review_note text NOT NULL DEFAULT ''
);
CREATE INDEX sihu_applications_queue ON public.sihu_applications(status,created_at DESC);
ALTER TABLE public.sihu_applications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sihu_applications FROM anon, authenticated;
GRANT SELECT ON public.sihu_applications TO authenticated;
CREATE POLICY sihu_application_read ON public.sihu_applications FOR SELECT TO authenticated
USING(user_id=(SELECT auth.uid()) OR (SELECT public.sihu_is_admin()));

CREATE FUNCTION public.sihu_submit_application(details jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE uid uuid:=auth.uid(); mail text; result uuid; birth date; years integer; field text;
BEGIN
 SELECT email INTO mail FROM auth.users WHERE id=uid AND email_verified=true;
 IF mail IS NULL THEN RAISE EXCEPTION 'Verify your email before submitting.'; END IF;
 IF jsonb_typeof(details) <> 'object' OR octet_length(details::text)>16000 THEN RAISE EXCEPTION 'Invalid application.'; END IF;
 FOREACH field IN ARRAY ARRAY['name','category','dob','gender','phone','country','state','city','instagram','availability','work'] LOOP
  IF length(trim(coalesce(details->>field,''))) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'Missing or invalid field: %',field; END IF;
 END LOOP;
 birth:=(details->>'dob')::date;
 IF birth>current_date-interval '18 years' OR birth<current_date-interval '120 years' THEN RAISE EXCEPTION 'Applicants must be 18 or older.'; END IF;
 years:=(details->>'experience')::integer;
 IF years IS NULL OR years NOT BETWEEN 0 AND 80 THEN RAISE EXCEPTION 'Invalid experience.'; END IF;
 IF jsonb_typeof(details->'software') IS DISTINCT FROM 'array' OR jsonb_typeof(details->'niches') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Choose software and specialties.'; END IF;
 IF jsonb_array_length(details->'software') NOT BETWEEN 1 AND 7 OR jsonb_array_length(details->'niches') NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'Choose software and specialties.'; END IF;
 IF details->>'phone' !~ '^\+?[0-9 ()-]{10,18}$' OR details->>'instagram' !~ '^@?[a-zA-Z0-9._]{1,30}$' THEN RAISE EXCEPTION 'Check your phone and Instagram username.'; END IF;
 INSERT INTO public.sihu_applications(user_id,email,profile)
 VALUES(uid,mail,details - ARRAY['status','role','user_id','reviewed_by','reviewed_at','email','consent'])
 ON CONFLICT(user_id) DO NOTHING RETURNING id INTO result;
 IF result IS NULL THEN SELECT id INTO result FROM public.sihu_applications WHERE user_id=uid; END IF;
 RETURN result;
END;$$;
REVOKE ALL ON FUNCTION public.sihu_submit_application(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.sihu_submit_application(jsonb) TO authenticated;

CREATE FUNCTION public.sihu_review_application(application_id uuid, decision text, note text DEFAULT '') RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
 IF NOT public.sihu_is_admin() THEN RAISE EXCEPTION 'Admin access required.'; END IF;
 IF decision NOT IN ('approved','rejected') OR length(note)>1000 THEN RAISE EXCEPTION 'Invalid review.'; END IF;
 UPDATE public.sihu_applications SET status=decision,reviewed_at=now(),reviewed_by=auth.uid(),review_note=note
 WHERE id=application_id AND status='pending';
 IF NOT FOUND THEN RAISE EXCEPTION 'This application has already been reviewed. Refresh the queue.'; END IF;
END;$$;
REVOKE ALL ON FUNCTION public.sihu_review_application(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.sihu_review_application(uuid,text,text) TO authenticated;

CREATE FUNCTION public.sihu_member_account() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE result jsonb;
BEGIN
 SELECT jsonb_build_object('id',id,'email',email,'profile',profile,'approved_at',reviewed_at)
 INTO result FROM public.sihu_applications WHERE user_id=auth.uid() AND status='approved';
 IF result IS NULL THEN RAISE EXCEPTION 'Your account requires admin approval.'; END IF;
 RETURN result;
END;$$;
REVOKE ALL ON FUNCTION public.sihu_member_account() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.sihu_member_account() TO authenticated;
