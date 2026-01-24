-- Drop existing policies to ensure clean slate
DROP POLICY IF EXISTS "Users can insert their own follows" ON public.follows;
DROP POLICY IF EXISTS "Users can select their own follows" ON public.follows;
DROP POLICY IF EXISTS "Users can delete their own follows" ON public.follows;

-- Re-enable RLS just in case
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Re-create Policies with proper scope
CREATE POLICY "Users can select their own follows"
ON public.follows FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own follows"
ON public.follows FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own follows"
ON public.follows FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
