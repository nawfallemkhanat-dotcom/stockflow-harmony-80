
CREATE TABLE public.quote_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  description TEXT,
  quantity NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL,
  discount_pct NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 20,
  line_total NUMERIC NOT NULL DEFAULT 0
);

ALTER TABLE public.quote_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view quote lines"
  ON public.quote_lines FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = quote_lines.quote_id
    AND is_workspace_member(auth.uid(), q.workspace_id)
  ));

CREATE POLICY "Staff+ can manage quote lines"
  ON public.quote_lines FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = quote_lines.quote_id
    AND get_workspace_role(auth.uid(), q.workspace_id) = ANY(ARRAY['owner'::app_role, 'admin'::app_role, 'staff'::app_role])
  ));
