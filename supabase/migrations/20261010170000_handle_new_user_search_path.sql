-- ============================================================================
-- Fix the search_path on the signup profile trigger function.
-- CREATE OR REPLACE keeps on_auth_user_created attached. Do not drop it.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, farm_location, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'farm_location', 'Zamboanga City'),
    'farmer'
  );
  RETURN NEW;
END;
$$;
