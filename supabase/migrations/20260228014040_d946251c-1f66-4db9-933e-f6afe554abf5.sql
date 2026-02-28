
-- Create credit_note_lines table
CREATE TABLE public.credit_note_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  credit_note_id UUID NOT NULL REFERENCES public.credit_notes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  description TEXT,
  quantity NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL,
  tax_rate NUMERIC NOT NULL DEFAULT 20,
  line_total NUMERIC NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.credit_note_lines ENABLE ROW LEVEL SECURITY;

-- RLS: Members can view lines via credit note workspace
CREATE POLICY "Members can view CN lines"
  ON public.credit_note_lines FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM credit_notes cn
    WHERE cn.id = credit_note_lines.credit_note_id
    AND is_workspace_member(auth.uid(), cn.workspace_id)
  ));

-- RLS: Staff+ can manage lines
CREATE POLICY "Staff+ can manage CN lines"
  ON public.credit_note_lines FOR ALL
  USING (EXISTS (
    SELECT 1 FROM credit_notes cn
    WHERE cn.id = credit_note_lines.credit_note_id
    AND get_workspace_role(auth.uid(), cn.workspace_id) IN ('owner', 'admin', 'staff')
  ));
