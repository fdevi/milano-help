-- Create a security definer function to verify email
CREATE OR REPLACE FUNCTION public.verify_email_by_address(_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles
  SET email_verificata = true
  WHERE email = _email AND email_verificata = false;
  
  RETURN FOUND;
END;
$$