import { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/shared/PageHeader";
import { Package, MapPin, Loader2, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface Warehouse {
  id: string;
  name: string;
  location: string | null;
  created_at: string;
  productCount: number;
  totalStock: number;
}

const Warehouses = () => {
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchWarehouses = async () => {
    if (!currentWorkspace) return;
    setLoading(true);

    const { data: whs, error } = await supabase
      .from("warehouses")
      .select("id, name, location, created_at")
      .eq("workspace_id", currentWorkspace.id)
      .order("name");

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    // Fetch stock levels to compute counts per warehouse
    const { data: stockData } = await supabase
      .from("stock_levels")
      .select("warehouse_id, product_id, quantity")
      .eq("workspace_id", currentWorkspace.id);

    const stockByWarehouse = new Map<string, { products: Set<string>; total: number }>();
    (stockData || []).forEach((sl: any) => {
      if (!stockByWarehouse.has(sl.warehouse_id)) {
        stockByWarehouse.set(sl.warehouse_id, { products: new Set(), total: 0 });
      }
      const entry = stockByWarehouse.get(sl.warehouse_id)!;
      entry.products.add(sl.product_id);
      entry.total += sl.quantity;
    });

    const mapped: Warehouse[] = (whs || []).map((w: any) => {
      const stock = stockByWarehouse.get(w.id);
      return {
        id: w.id,
        name: w.name,
        location: w.location,
        created_at: w.created_at,
        productCount: stock?.products.size || 0,
        totalStock: stock?.total || 0,
      };
    });

    setWarehouses(mapped);
    setLoading(false);
  };

  useEffect(() => { fetchWarehouses(); }, [currentWorkspace]);

  const openAdd = () => {
    setEditing(null);
    setName("");
    setLocation("");
    setDialogOpen(true);
  };

  const openEdit = (w: Warehouse) => {
    setEditing(w);
    setName(w.name);
    setLocation(w.location || "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!currentWorkspace || !name.trim()) return;
    setSaving(true);

    if (editing) {
      const { error } = await supabase
        .from("warehouses")
        .update({ name: name.trim(), location: location.trim() || null })
        .eq("id", editing.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Updated" });
    } else {
      const { error } = await supabase
        .from("warehouses")
        .insert({ workspace_id: currentWorkspace.id, name: name.trim(), location: location.trim() || null });
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Created", description: "Warehouse added." });
    }

    setSaving(false);
    setDialogOpen(false);
    fetchWarehouses();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("warehouses").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Deleted" });
      fetchWarehouses();
    }
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
        title="Warehouses"
        description="Manage your warehouse locations"
        addLabel="Add Warehouse"
        onAdd={openAdd}
        showSearch={false}
      />

      {warehouses.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          No warehouses yet. Click "Add Warehouse" to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.map((w, i) => (
            <div
              key={w.id}
              className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors opacity-0 animate-fade-in"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground">{w.name}</h3>
                  {w.location && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {w.location}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(w)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(w.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Products</p>
                  <p className="text-lg font-bold text-foreground">{w.productCount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Stock</p>
                  <p className="text-lg font-bold text-foreground">{w.totalStock.toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Warehouse" : "New Warehouse"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Warehouse name" />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, Country" />
            </div>
            <Button onClick={handleSave} disabled={saving || !name.trim()} className="w-full">
              {saving ? "Saving..." : editing ? "Update" : "Create Warehouse"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Warehouses;
