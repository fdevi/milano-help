
-- Clean up duplicate RLS policies on gruppi
DROP POLICY IF EXISTS "Anyone can view groups" ON public.gruppi;
DROP POLICY IF EXISTS "Group admins can update" ON public.gruppi;
DROP POLICY IF EXISTS "Users can insert groups" ON public.gruppi;

-- Clean up duplicate RLS policies on gruppi_membri  
DROP POLICY IF EXISTS "Anyone can view memberships" ON public.gruppi_membri;
DROP POLICY IF EXISTS "Group admins can update members" ON public.gruppi_membri;
DROP POLICY IF EXISTS "Users can request membership" ON public.gruppi_membri;

-- Clean up duplicate RLS policies on gruppi_messaggi
DROP POLICY IF EXISTS "Members can insert group messages" ON public.gruppi_messaggi;
DROP POLICY IF EXISTS "Members can view group messages" ON public.gruppi_messaggi;
