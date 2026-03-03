ALTER TABLE public.profiles ALTER COLUMN email_verificata SET DEFAULT false;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.profiles (
        user_id,
        email,
        email_verificata,
        username,
        nome,
        cognome,
        telefono,
        tipo_account,
        profilo_pubblico,
        notifiche_email,
        notifiche_push,
        newsletter,
        mostra_email,
        mostra_telefono,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        false,
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
        COALESCE(NEW.raw_user_meta_data->>'nome', ''),
        COALESCE(NEW.raw_user_meta_data->>'cognome', ''),
        COALESCE(NEW.raw_user_meta_data->>'telefono', ''),
        COALESCE(NEW.raw_user_meta_data->>'tipoAccount', 'privato'),
        COALESCE((NEW.raw_user_meta_data->>'profiloPubblico')::boolean, true),
        COALESCE((NEW.raw_user_meta_data->>'notificheEmail')::boolean, true),
        COALESCE((NEW.raw_user_meta_data->>'notifichePush')::boolean, true),
        COALESCE((NEW.raw_user_meta_data->>'newsletter')::boolean, false),
        COALESCE((NEW.raw_user_meta_data->>'mostraEmail')::boolean, false),
        COALESCE((NEW.raw_user_meta_data->>'mostraTelefono')::boolean, false),
        NOW(),
        NOW()
    );
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$function$