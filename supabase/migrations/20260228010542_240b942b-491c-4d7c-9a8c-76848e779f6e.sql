
-- ENUM types
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'staff', 'viewer');
CREATE TYPE public.movement_type AS ENUM ('IN', 'OUT', 'TRANSFER');
CREATE TYPE public.order_status AS ENUM ('draft', 'ordered', 'received', 'paid', 'shipped', 'cancelled');
CREATE TYPE public.invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');

-- Timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Workspaces
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT 'MA',
  currency TEXT NOT NULL DEFAULT 'MAD',
  tax_label TEXT NOT NULL DEFAULT 'TVA',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Memberships
CREATE TABLE public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'staff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, workspace_id)
);
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- Security definer helpers
CREATE OR REPLACE FUNCTION public.is_workspace_member(_user_id UUID, _workspace_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.memberships WHERE user_id = _user_id AND workspace_id = _workspace_id) $$;

CREATE OR REPLACE FUNCTION public.get_workspace_role(_user_id UUID, _workspace_id UUID)
RETURNS app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM public.memberships WHERE user_id = _user_id AND workspace_id = _workspace_id $$;

CREATE POLICY "Members can view memberships" ON public.memberships FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Owners/admins can insert memberships" ON public.memberships FOR INSERT WITH CHECK (public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'admin'));
CREATE POLICY "Owners/admins can update memberships" ON public.memberships FOR UPDATE USING (public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'admin'));
CREATE POLICY "Owners can delete memberships" ON public.memberships FOR DELETE USING (public.get_workspace_role(auth.uid(), workspace_id) = 'owner');

CREATE POLICY "Members can view workspaces" ON public.workspaces FOR SELECT USING (public.is_workspace_member(auth.uid(), id));
CREATE POLICY "Owners/admins can update workspaces" ON public.workspaces FOR UPDATE USING (public.get_workspace_role(auth.uid(), id) IN ('owner', 'admin'));
CREATE POLICY "Auth users can create workspaces" ON public.workspaces FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view categories" ON public.categories FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Staff+ can manage categories" ON public.categories FOR ALL USING (public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'admin', 'staff'));

-- Tax Rates
CREATE TABLE public.tax_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  country_code TEXT NOT NULL DEFAULT 'MA',
  name TEXT NOT NULL,
  rate NUMERIC(5,2) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view tax rates" ON public.tax_rates FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Admins+ can manage tax rates" ON public.tax_rates FOR ALL USING (public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'admin'));

-- Products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id),
  unit TEXT NOT NULL DEFAULT 'pcs',
  cost_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  sell_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_rate_id UUID REFERENCES public.tax_rates(id),
  barcode TEXT,
  reorder_level INTEGER NOT NULL DEFAULT 10,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, sku)
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view products" ON public.products FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Staff+ can manage products" ON public.products FOR ALL USING (public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'admin', 'staff'));
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Warehouses
CREATE TABLE public.warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view warehouses" ON public.warehouses FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Staff+ can manage warehouses" ON public.warehouses FOR ALL USING (public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'admin', 'staff'));

-- Stock Levels
CREATE TABLE public.stock_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, warehouse_id)
);
ALTER TABLE public.stock_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view stock levels" ON public.stock_levels FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Staff+ can manage stock levels" ON public.stock_levels FOR ALL USING (public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'admin', 'staff'));

-- Stock Movements
CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  movement_type movement_type NOT NULL,
  quantity INTEGER NOT NULL,
  from_warehouse_id UUID REFERENCES public.warehouses(id),
  to_warehouse_id UUID REFERENCES public.warehouses(id),
  reference TEXT,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view movements" ON public.stock_movements FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Staff+ can create movements" ON public.stock_movements FOR INSERT WITH CHECK (public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'admin', 'staff'));

-- Suppliers
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view suppliers" ON public.suppliers FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Staff+ can manage suppliers" ON public.suppliers FOR ALL USING (public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'admin', 'staff'));
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Customers
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  ice TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view customers" ON public.customers FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Staff+ can manage customers" ON public.customers FOR ALL USING (public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'admin', 'staff'));
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Purchase Orders
CREATE TABLE public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  status order_status NOT NULL DEFAULT 'draft',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, order_number)
);
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view POs" ON public.purchase_orders FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Staff+ can manage POs" ON public.purchase_orders FOR ALL USING (public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'admin', 'staff'));
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.purchase_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 20,
  line_total NUMERIC(12,2) NOT NULL DEFAULT 0
);
ALTER TABLE public.purchase_order_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view PO lines" ON public.purchase_order_lines FOR SELECT USING (EXISTS (SELECT 1 FROM public.purchase_orders po WHERE po.id = purchase_order_id AND public.is_workspace_member(auth.uid(), po.workspace_id)));
CREATE POLICY "Staff+ can manage PO lines" ON public.purchase_order_lines FOR ALL USING (EXISTS (SELECT 1 FROM public.purchase_orders po WHERE po.id = purchase_order_id AND public.get_workspace_role(auth.uid(), po.workspace_id) IN ('owner', 'admin', 'staff')));

-- Sales Orders
CREATE TABLE public.sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  status order_status NOT NULL DEFAULT 'draft',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, order_number)
);
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view SOs" ON public.sales_orders FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Staff+ can manage SOs" ON public.sales_orders FOR ALL USING (public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'admin', 'staff'));
CREATE TRIGGER update_sales_orders_updated_at BEFORE UPDATE ON public.sales_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.sales_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 20,
  line_total NUMERIC(12,2) NOT NULL DEFAULT 0
);
ALTER TABLE public.sales_order_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view SO lines" ON public.sales_order_lines FOR SELECT USING (EXISTS (SELECT 1 FROM public.sales_orders so WHERE so.id = sales_order_id AND public.is_workspace_member(auth.uid(), so.workspace_id)));
CREATE POLICY "Staff+ can manage SO lines" ON public.sales_order_lines FOR ALL USING (EXISTS (SELECT 1 FROM public.sales_orders so WHERE so.id = sales_order_id AND public.get_workspace_role(auth.uid(), so.workspace_id) IN ('owner', 'admin', 'staff')));

-- Invoices
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  sales_order_id UUID REFERENCES public.sales_orders(id),
  status invoice_status NOT NULL DEFAULT 'draft',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  due_date DATE,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, invoice_number)
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view invoices" ON public.invoices FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Staff+ can manage invoices" ON public.invoices FOR ALL USING (public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'admin', 'staff'));
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  description TEXT,
  quantity NUMERIC(12,2) NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 20,
  line_total NUMERIC(12,2) NOT NULL DEFAULT 0
);
ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view invoice lines" ON public.invoice_lines FOR SELECT USING (EXISTS (SELECT 1 FROM public.invoices inv WHERE inv.id = invoice_id AND public.is_workspace_member(auth.uid(), inv.workspace_id)));
CREATE POLICY "Staff+ can manage invoice lines" ON public.invoice_lines FOR ALL USING (EXISTS (SELECT 1 FROM public.invoices inv WHERE inv.id = invoice_id AND public.get_workspace_role(auth.uid(), inv.workspace_id) IN ('owner', 'admin', 'staff')));

-- Quotes
CREATE TABLE public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  quote_number TEXT NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  status TEXT NOT NULL DEFAULT 'draft',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  valid_until DATE,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, quote_number)
);
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view quotes" ON public.quotes FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Staff+ can manage quotes" ON public.quotes FOR ALL USING (public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'admin', 'staff'));
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Credit Notes
CREATE TABLE public.credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  credit_note_number TEXT NOT NULL,
  invoice_id UUID REFERENCES public.invoices(id),
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  reason TEXT,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, credit_note_number)
);
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view credit notes" ON public.credit_notes FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Staff+ can manage credit notes" ON public.credit_notes FOR ALL USING (public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'admin', 'staff'));

-- Auto-create workspace + membership + seed TVA on signup
CREATE OR REPLACE FUNCTION public.create_default_workspace()
RETURNS TRIGGER AS $$
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
    (ws_id, 'Lighting'), (ws_id, 'Cooling'), (ws_id, 'Accessories');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created_workspace AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_default_workspace();
