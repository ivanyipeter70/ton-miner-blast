
-- Drop the overly permissive update policy
DROP POLICY "Users can update their own profile" ON public.profiles;

-- Create a restricted update policy that only allows display_name changes
CREATE POLICY "Users can update their own display name"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Revoke direct column update on critical fields; grant only display_name
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (display_name) ON public.profiles TO authenticated;
