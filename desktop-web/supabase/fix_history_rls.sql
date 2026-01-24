-- Enable RLS (Ensure it's on)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chaps ENABLE ROW LEVEL SECURITY;

-- 1. Users Table Policies
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
CREATE POLICY "Users can view own data"
ON public.users FOR SELECT
TO authenticated
USING (uuid = auth.uid()::text);

-- 2. History Table Policies
DROP POLICY IF EXISTS "Users can view own history" ON public.history;
CREATE POLICY "Users can view own history"
ON public.history FOR SELECT
TO authenticated
USING (
    user_id IN (SELECT id FROM public.users WHERE uuid = auth.uid()::text)
);

DROP POLICY IF EXISTS "Users can insert own history" ON public.history;
CREATE POLICY "Users can insert own history"
ON public.history FOR INSERT
TO authenticated
WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE uuid = auth.uid()::text)
);

DROP POLICY IF EXISTS "Users can update own history" ON public.history;
CREATE POLICY "Users can update own history"
ON public.history FOR UPDATE
TO authenticated
USING (
    user_id IN (SELECT id FROM public.users WHERE uuid = auth.uid()::text)
);

-- 3. Chaps Table Policies
DROP POLICY IF EXISTS "Users can view own chaps" ON public.chaps;
CREATE POLICY "Users can view own chaps"
ON public.chaps FOR SELECT
TO authenticated
USING (
    history_id IN (
        SELECT h.id FROM public.history h
        JOIN public.users u ON h.user_id = u.id
        WHERE u.uuid = auth.uid()::text
    )
);

DROP POLICY IF EXISTS "Users can insert own chaps" ON public.chaps;
CREATE POLICY "Users can insert own chaps"
ON public.chaps FOR INSERT
TO authenticated
WITH CHECK (
    history_id IN (
        SELECT h.id FROM public.history h
        JOIN public.users u ON h.user_id = u.id
        WHERE u.uuid = auth.uid()::text
    )
);

DROP POLICY IF EXISTS "Users can update own chaps" ON public.chaps;
CREATE POLICY "Users can update own chaps"
ON public.chaps FOR UPDATE
TO authenticated
USING (
    history_id IN (
        SELECT h.id FROM public.history h
        JOIN public.users u ON h.user_id = u.id
        WHERE u.uuid = auth.uid()::text
    )
);
