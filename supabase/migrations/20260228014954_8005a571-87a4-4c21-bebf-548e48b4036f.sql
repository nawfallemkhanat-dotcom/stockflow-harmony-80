
CREATE OR REPLACE FUNCTION public.create_default_workspace()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ws_id UUID;
BEGIN
  INSERT INTO public.workspaces (name, country_code, currency, tax_label)
  VALUES (COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'My') || '''s Workspace', 'MA', 'MAD', 'TVA')
  RETURNING id INTO ws_id;

  INSERT INTO public.memberships (user_id, workspace_id, role) VALUES (NEW.id, ws_id, 'owner');

  INSERT INTO public.tax_rates (workspace_id, country_code, name, rate, is_default) VALUES
    (ws_id, 'MA', 'TVA 20% (Standard)', 20.00, true),
    (ws_id, 'MA', 'TVA 14%', 14.00, false),
    (ws_id, 'MA', 'TVA 10%', 10.00, false),
    (ws_id, 'MA', 'TVA 7%', 7.00, false),
    (ws_id, 'MA', 'Exonéré 0%', 0.00, false);

  INSERT INTO public.categories (workspace_id, name) VALUES
    (ws_id, 'Electronics'), (ws_id, 'Cables'), (ws_id, 'Power'),
    (ws_id, 'Lighting'), (ws_id, 'Cooling'), (ws_id, 'Accessories'),
    (ws_id, 'Computers'), (ws_id, 'Consoles');

  RETURN NEW;
END;
$function$;
