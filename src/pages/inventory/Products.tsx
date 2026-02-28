import { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { Loader2, Pencil, Trash2 } from "lucide-react";

interface Product {
  id: string;
  sku: string;
  name: string;
  category_id: string | null;
  category_name: string;
  unit: string;
  cost_price: number;
  sell_price: number;
  tax_rate: number;
  tax_rate_id: string | null;
  stock: number;
  active: boolean;
}

interface Category { id: string; name: string; }
interface TaxRate { id: string; name: string; rate: number; }

const Products = () => {
  const { currentWorkspace, currentRole } = useWorkspace();
  const { user } = useAuth();
  const canEdit = currentRole === "owner" || currentRole === "admin" || currentRole === "staff";
  const canDelete = currentRole === "owner" || currentRole === "admin";

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formSku, setFormSku] = useState("");
  const [formName, setFormName] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formUnit, setFormUnit] = useState("pcs");
  const [formCostPrice, setFormCostPrice] = useState(0);
  const [formSellPrice, setFormSellPrice] = useState(0);
  const [formTaxRateId, setFormTaxRateId] = useState("");
  const [formInitialQty, setFormInitialQty] = useState(0);

  const loadProducts = async () => {
    if (!currentWorkspace) return;
    const { data, error } = await supabase
      .from("products")
      .select("id, sku, name, cost_price, sell_price, unit, active, category_id, categories(name), tax_rate_id, tax_rates(id, rate)")
      .eq("workspace_id", currentWorkspace.id)
      .order("name");

    if (!error && data) {
      const { data: stockData } = await supabase
        .from("stock_levels")
        .select("product_id, quantity")
        .eq("workspace_id", currentWorkspace.id);

      const stockMap: Record<string, number> = {};
      (stockData || []).forEach((s: any) => {
        stockMap[s.product_id] = (stockMap[s.product_id] || 0) + s.quantity;
      });

      setProducts(
        data.map((p: any) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          category_id: p.category_id,
          category_name: p.categories?.name || "—",
          unit: p.unit,
          cost_price: Number(p.cost_price),
          sell_price: Number(p.sell_price),
          tax_rate: p.tax_rates?.rate != null ? Number(p.tax_rates.rate) : 20,
          tax_rate_id: p.tax_rate_id,
          stock: stockMap[p.id] || 0,
          active: p.active,
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!currentWorkspace) return;
    const loadAll = async () => {
      const [catsRes, taxRes] = await Promise.all([
        supabase.from("categories").select("id, name").eq("workspace_id", currentWorkspace.id).order("name"),
        supabase.from("tax_rates").select("id, name, rate").eq("workspace_id", currentWorkspace.id).eq("active", true).order("rate", { ascending: false }),
      ]);
      setCategories(catsRes.data || []);
      setTaxRates(taxRes.data || []);
      await loadProducts();
    };
    loadAll();
  }, [currentWorkspace]);

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.category_name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || p.category_id === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getStatus = (stock: number, active: boolean) => {
    if (!active) return "Inactive";
    if (stock === 0) return "Out-of-Stock";
    if (stock <= 10) return "Low-Stock";
    return "In-Stock";
  };

  const resetForm = () => {
    setFormSku(""); setFormName(""); setFormCategoryId(""); setFormUnit("pcs");
    setFormCostPrice(0); setFormSellPrice(0); setFormTaxRateId(""); setFormInitialQty(0);
    setEditingId(null);
  };

  const handleAdd = () => { resetForm(); setDialogOpen(true); };

  const handleEdit = (p: Product) => {
    setEditingId(p.id);
    setFormSku(p.sku);
    setFormName(p.name);
    setFormCategoryId(p.category_id || "");
    setFormUnit(p.unit);
    setFormCostPrice(p.cost_price);
    setFormSellPrice(p.sell_price);
    setFormTaxRateId(p.tax_rate_id || "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!currentWorkspace || !formSku.trim() || !formName.trim()) {
      toast.error("SKU and Name are required");
      return;
    }
    if (!formCategoryId) {
      toast.error("Category is required");
      return;
    }
    setSaving(true);

    const payload = {
      workspace_id: currentWorkspace.id,
      sku: formSku.trim(),
      name: formName.trim(),
      category_id: formCategoryId,
      unit: formUnit,
      cost_price: formCostPrice,
      sell_price: formSellPrice,
      tax_rate_id: formTaxRateId || null,
    };

    if (editingId) {
      const { error } = await supabase.from("products").update(payload).eq("id", editingId);
      if (error) toast.error(error.message);
      else { toast.success("Product updated"); setDialogOpen(false); await loadProducts(); }
    } else {
      const { data: newProduct, error } = await supabase.from("products").insert(payload).select("id").single();
      if (error) toast.error(error.message);
      else {
        // Create initial stock movement if quantity > 0
        if (formInitialQty > 0 && newProduct) {
          // Get first warehouse for this workspace
          const { data: warehouses } = await supabase
            .from("warehouses")
            .select("id")
            .eq("workspace_id", currentWorkspace.id)
            .limit(1);
          if (warehouses && warehouses.length > 0) {
            await supabase.from("stock_movements").insert({
              workspace_id: currentWorkspace.id,
              product_id: newProduct.id,
              quantity: formInitialQty,
              movement_type: "IN" as const,
              to_warehouse_id: warehouses[0].id,
              created_by: user?.id || "",
              notes: "Initial stock",
            });
          }
        }
        toast.success("Product created");
        setDialogOpen(false);
        await loadProducts();
      }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Product deleted"); await loadProducts(); }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Products"
        description="Manage your product catalog"
        onAdd={canEdit ? handleAdd : undefined}
        addLabel="Add Product"
        searchValue={search}
        onSearchChange={setSearch}
      />

      {/* Category Filter */}
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <Button
          size="sm"
          variant={categoryFilter === "all" ? "default" : "outline"}
          onClick={() => setCategoryFilter("all")}
        >
          All
        </Button>
        {categories.map((c) => (
          <Button
            key={c.id}
            size="sm"
            variant={categoryFilter === c.id ? "default" : "outline"}
            onClick={() => setCategoryFilter(c.id)}
          >
            {c.name}
          </Button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-5 py-10 text-center text-muted-foreground text-sm">
            {products.length === 0
              ? 'No products yet. Click "Add Product" to get started.'
              : "No products match your filters."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Cost ({currentWorkspace?.currency})</TableHead>
                <TableHead className="text-right">Sell ({currentWorkspace?.currency})</TableHead>
                <TableHead className="text-right">{currentWorkspace?.tax_label} %</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead className="w-20"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{p.sku}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.category_name}</TableCell>
                  <TableCell className="text-right font-mono">{p.cost_price.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono">{p.sell_price.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{p.tax_rate}%</TableCell>
                  <TableCell className="text-right font-mono">{p.stock}</TableCell>
                  <TableCell><StatusBadge status={getStatus(p.stock, p.active)} /></TableCell>
                  {canEdit && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(p)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        {canDelete && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(p.id)}>
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>SKU *</Label>
                <Input placeholder="e.g. WPX-009" value={formSku} onChange={(e) => setFormSku(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input placeholder="Product name" value={formName} onChange={(e) => setFormName(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={formCategoryId} onValueChange={setFormCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select value={formUnit} onValueChange={setFormUnit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pcs">Pieces</SelectItem>
                    <SelectItem value="kg">Kilograms</SelectItem>
                    <SelectItem value="m">Meters</SelectItem>
                    <SelectItem value="l">Liters</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Cost Price ({currentWorkspace?.currency})</Label>
                <Input type="number" value={formCostPrice} onChange={(e) => setFormCostPrice(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Sell Price ({currentWorkspace?.currency})</Label>
                <Input type="number" value={formSellPrice} onChange={(e) => setFormSellPrice(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>{currentWorkspace?.tax_label} Rate</Label>
                <Select value={formTaxRateId} onValueChange={setFormTaxRateId}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {taxRates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {!editingId && (
              <div className="space-y-2">
                <Label>Initial Quantity</Label>
                <Input type="number" min={0} value={formInitialQty} onChange={(e) => setFormInitialQty(Number(e.target.value))} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editingId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Products;
