
-- Add unique constraint on category name per workspace
ALTER TABLE public.categories
ADD CONSTRAINT categories_workspace_name_unique UNIQUE (workspace_id, name);

-- Make product category_id required (NOT NULL) with a migration-safe approach
-- First set any NULL category_ids to a default (we won't enforce NOT NULL yet since existing data may have nulls)
-- Instead, we'll handle this at the application level

-- Seed missing default categories for existing workspaces
INSERT INTO public.categories (workspace_id, name)
SELECT w.id, c.name
FROM public.workspaces w
CROSS JOIN (VALUES ('Computers'), ('Consoles')) AS c(name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories cat
  WHERE cat.workspace_id = w.id AND cat.name = c.name
);
