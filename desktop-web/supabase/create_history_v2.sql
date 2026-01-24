-- History V2: Using new function names to avoid conflicts

-- 1. Ensure User Function (Renamed)
CREATE OR REPLACE FUNCTION public.ensure_user(p_uuid text, p_email text, p_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.users (uuid, email, name, created_at)
  VALUES (p_uuid, p_email, p_name, now())
  ON CONFLICT (uuid) DO UPDATE
  SET email = EXCLUDED.email,
      name = EXCLUDED.name;
END;
$$;

-- 2. Set Watch History (Renamed from set_single_progress)
CREATE OR REPLACE FUNCTION "public"."set_watch_history"("p_name" "text", "p_poster" "text", "season_id" "text", "p_season_name" "text", "user_uid" "text", "e_cur" double precision, "e_dur" double precision, "e_name" "text", "e_chap" "text", "gmt" double precision DEFAULT 7) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    latest_history record;
    i_user_id int8;
    id_history_rax int8;
    id_chap int8;
BEGIN
    SELECT id INTO i_user_id FROM users WHERE uuid = user_uid LIMIT 1;
    IF i_user_id IS NULL THEN RAISE EXCEPTION 'User does not exist'; END IF;

    SELECT * INTO latest_history FROM history WHERE user_id = i_user_id AND season = season_id ORDER BY created_at DESC LIMIT 1;

    IF latest_history IS NULL OR latest_history.created_at::DATE <> (NOW() + (gmt || ' hours')::INTERVAL)::DATE THEN
        INSERT INTO history (created_at, user_id, season, name, poster, season_name)
        VALUES (NOW(), i_user_id, season_id, p_name, p_poster, p_season_name);
    END IF;

    SELECT id INTO id_history_rax FROM history WHERE user_id = i_user_id AND season = season_id ORDER BY created_at DESC LIMIT 1;

    SELECT id INTO id_chap FROM chaps WHERE history_id = id_history_rax AND chap_id = e_chap LIMIT 1;

    IF id_chap IS NULL THEN
        INSERT INTO chaps (created_at, history_id, cur, dur, name, updated_at, chap_id)
        VALUES (NOW(), id_history_rax, e_cur, e_dur, e_name, NOW(), e_chap);
    ELSE
        UPDATE chaps SET cur = e_cur, dur = e_dur, updated_at = NOW() WHERE id = id_chap;
    END IF;
END;
$$;

-- 3. Get Watch History List (Renamed from query_history)
CREATE OR REPLACE FUNCTION "public"."get_watch_history_list"("user_uid" "text", "page" integer, "size" integer) RETURNS TABLE("created_at" timestamp with time zone, "season" "text", "name" "text", "poster" "text", "season_name" "text", "watch_updated_at" timestamp with time zone, "watch_name" "text", "watch_id" "text", "watch_cur" double precision, "watch_dur" double precision)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    query_limit integer;
BEGIN
    query_limit := LEAST(size, 50);
    RETURN QUERY
    SELECT h.created_at, h.season, h.name, h.poster, h.season_name,
    c.updated_at as watch_updated_at, c.name as watch_name, c.chap_id as watch_id, c.cur as watch_cur, c.dur as watch_dur
    FROM public.history h
    JOIN public.users u ON h.user_id = u.id
    JOIN LATERAL (
        SELECT * FROM public.chaps WHERE history_id = h.id ORDER BY updated_at DESC LIMIT 1
    ) c ON true
    WHERE u.uuid = user_uid
    ORDER BY h.created_at DESC
    LIMIT query_limit OFFSET (page - 1) * query_limit;
END;
$$;

-- Ensure permissions
GRANT ALL ON FUNCTION public.ensure_user(text, text, text) TO authenticated;
GRANT ALL ON FUNCTION public.set_watch_history(text, text, text, text, text, double precision, double precision, text, text, double precision) TO authenticated;
GRANT ALL ON FUNCTION public.get_watch_history_list(text, integer, integer) TO authenticated;
