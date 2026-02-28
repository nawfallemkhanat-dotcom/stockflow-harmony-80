import { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
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
import { Loader2 } from "lucide-react";

interface Product {
  id: string;
  sku: string;
  name: string;
  category_name: string;
  unit: string;
  cost_price: number;
  sell_price: number;
  tax_rate: number;
  stock: number;
  active: boolean;
}

interface Category {
  id: string;
  name: string;
}

const Products = () => {
  const { currentWorkspace } = useWorkspace();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New product form state
  const [newSku, setNewSku] = useState("");
  const [newName, setNewName] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newUnit, setNewUnit] = useState("pcs");
  const [newCostPrice, setNewCostPrice] = useState(0);
  const [newSellPrice, setNewSellPrice] = useState(0);
  const [newTaxRate, setNewTaxRate] = useState("20");

  const loadProducts = async () => {
    if (!currentWorkspace) return;
    const { data, error } = await supabase
      .from("products")
      .select("id, sku, name, cost_price, sell_price, unit, active, category_id, categories(name), tax_rates(rate)")
      .eq("workspace_id", currentWorkspace.id)
      .order("name");

    if (!error && data) {
      // Get stock levels
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
          category_name: p.categories?.name || "—",
          unit: p.unit,
          cost_price: Number(p.cost_price),
          sell_price: Number(p.sell_price),
          tax_rate: p.tax_rates?.rate != null ? Number(p.tax_rates.rate) : 20,
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
      const { data: cats } = await supabase
        .from("categories")
        .select("id, name")
        .eq("workspace_id", currentWorkspace.id)
        .order("name");
      setCategories(cats || []);
      await loadProducts();
    };
    loadAll();
  }, [currentWorkspace]);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.category_name.toLowerCase().includes(search.toLowerCase())
  );

  const getStatus = (stock: number, active: boolean) => {
    if (!active) return "Inactive";
    if (stock === 0) return "Out-of-Stock";
    if (stock <= 10) return "Low-Stock";
    return "In-Stock";
  };

  const handleAdd = () => {
    setNewSku("");
    setNewName("");
    setNewCategoryId("");
    setNewUnit("pcs");
    setNewCostPrice(0);
    setNewSellPrice(0);
    setNewTaxRate("20");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!currentWorkspace || !newSku || !newName) {
      toast.error("SKU and Name are required");
      return;
    }
    setSaving(true);

    // Find matching tax_rate id
    let taxRateId: string | null = null;
    const { data: taxRates } = await supabase
      .from("tax_rates")
      .select("id, rate")
      .eq("workspace_id", currentWorkspace.id)
      .eq("rate", Number(newTaxRate))
      .eq("active", true)
      .limit(1);
    if (taxRates?.length) taxRateId = taxRates[0].id;

    const { error } = await supabase.from("products").insert({
      workspace_id: currentWorkspace.id,
      sku: newSku,
      name: newName,
      category_id: newCategoryId || null,
      unit: newUnit,
      cost_price: newCostPrice,
      sell_price: newSellPrice,
      tax_rate_id: taxRateId,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Product created");
      setDialogOpen(false);
      await loadProducts();
    }
    setSaving(false);
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
        onAdd={handleAdd}
        addLabel="Add Product"
        searchValue={search}
        onSearchChange={setSearch}
      />

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-5 py-10 text-center text-muted-foreground text-sm">
            No products yet. Click "Add Product" to get started.
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-mono text-xs text-muted-foreground">{p.sku}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.category_name}</TableCell>
                  <TableCell className="text-right font-mono">{p.cost_price.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono">{p.sell_price.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{p.tax_rate}%</TableCell>
                  <TableCell className="text-right font-mono">{p.stock}</TableCell>
                  <TableCell><StatusBadge status={getStatus(p.stock, p.active)} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Product</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input placeholder="e.g. WPX-009" value={newSku} onChange={(e) => setNewSku(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input placeholder="Product name" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={newCategoryId} onValueChange={setNewCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select value={newUnit} onValueChange={setNewUnit}>
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
                <Input type="number" value={newCostPrice} onChange={(e) => setNewCostPrice(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Sell Price ({currentWorkspace?.currency})</Label>
                <Input type="number" value={newSellPrice} onChange={(e) => setNewSellPrice(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>{currentWorkspace?.tax_label} Rate</Label>
                <Select value={newTaxRate} onValueChange={setNewTaxRate}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="7">7%</SelectItem>
                    <SelectItem value="10">10%</SelectItem>
                    <SelectItem value="14">14%</SelectItem>
                    <SelectItem value="20">20%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Products;
