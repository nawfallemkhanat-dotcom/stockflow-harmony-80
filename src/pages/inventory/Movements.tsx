import { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/shared/PageHeader";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ArrowDownRight, ArrowUpRight, ArrowLeftRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";

interface Movement {
  id: string;
  movement_type: "IN" | "OUT" | "TRANSFER";
  quantity: number;
  reference: string | null;
  notes: string | null;
  created_at: string;
  product_name: string;
  from_warehouse_name: string | null;
  to_warehouse_name: string | null;
}

interface Product { id: string; name: string; sku: string; }
interface Warehouse { id: string; name: string; }

const typeIcons = { IN: ArrowDownRight, OUT: ArrowUpRight, TRANSFER: ArrowLeftRight };
const typeColors = { IN: "text-success", OUT: "text-destructive", TRANSFER: "text-primary" };

const Movements = () => {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [movementType, setMovementType] = useState<"IN" | "OUT" | "TRANSFER">("IN");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const fetchMovements = async () => {
    if (!currentWorkspace) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("stock_movements")
      .select("id, movement_type, quantity, reference, notes, created_at, product_id, from_warehouse_id, to_warehouse_id, products(name), from_wh:warehouses!stock_movements_from_warehouse_id_fkey(name), to_wh:warehouses!stock_movements_to_warehouse_id_fkey(name)")
      .eq("workspace_id", currentWorkspace.id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const mapped: Movement[] = (data || []).map((m: any) => ({
      id: m.id,
      movement_type: m.movement_type,
      quantity: m.quantity,
      reference: m.reference,
      notes: m.notes,
      created_at: m.created_at,
      product_name: m.products?.name || "—",
      from_warehouse_name: m.from_wh?.name || null,
      to_warehouse_name: m.to_wh?.name || null,
    }));

    setMovements(mapped);
    setLoading(false);
  };

  const fetchRefData = async () => {
    if (!currentWorkspace) return;
    const [prodRes, whRes] = await Promise.all([
      supabase.from("products").select("id, name, sku").eq("workspace_id", currentWorkspace.id).eq("active", true).order("name"),
      supabase.from("warehouses").select("id, name").eq("workspace_id", currentWorkspace.id).order("name"),
    ]);
    setProducts(prodRes.data || []);
    setWarehouses(whRes.data || []);
  };

  useEffect(() => {
    fetchMovements();
    fetchRefData();
  }, [currentWorkspace]);

  const filtered = movements
    .filter((m) => typeFilter === "all" || m.movement_type === typeFilter)
    .filter((m) =>
      m.product_name.toLowerCase().includes(search.toLowerCase()) ||
      (m.reference || "").toLowerCase().includes(search.toLowerCase())
    );

  const openDialog = () => {
    setMovementType("IN");
    setProductId("");
    setQuantity(1);
    setFromWarehouseId("");
    setToWarehouseId("");
    setReference("");
    setNotes("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!currentWorkspace || !user || !productId) return;
    if (quantity <= 0) { toast.error("Quantity must be positive"); return; }

    if (movementType === "IN" && !toWarehouseId) {
      toast.error("Select destination warehouse"); return;
    }
    if (movementType === "OUT" && !fromWarehouseId) {
      toast.error("Select source warehouse"); return;
    }
    if (movementType === "TRANSFER" && (!fromWarehouseId || !toWarehouseId)) {
      toast.error("Select both source and destination warehouses"); return;
    }
    if (movementType === "TRANSFER" && fromWarehouseId === toWarehouseId) {
      toast.error("Source and destination must differ"); return;
    }

    setSaving(true);
    try {
      // Insert movement
      const { error: movErr } = await supabase.from("stock_movements").insert({
        workspace_id: currentWorkspace.id,
        product_id: productId,
        movement_type: movementType,
        quantity,
        from_warehouse_id: movementType === "IN" ? null : fromWarehouseId,
        to_warehouse_id: movementType === "OUT" ? null : toWarehouseId,
        reference: reference.trim() || null,
        notes: notes.trim() || null,
        created_by: user.id,
      });
      if (movErr) throw movErr;

      // Update stock levels
      if (movementType === "IN" || movementType === "TRANSFER") {
        await upsertStock(productId, toWarehouseId, quantity);
      }
      if (movementType === "OUT" || movementType === "TRANSFER") {
        await upsertStock(productId, fromWarehouseId, -quantity);
      }

      toast.success("Movement recorded");
      setDialogOpen(false);
      fetchMovements();
    } catch (err: any) {
      toast.error(err.message || "Failed to record movement");
    }
    setSaving(false);
  };

  const upsertStock = async (prodId: string, whId: string, delta: number) => {
    if (!currentWorkspace) return;
    // Check if stock_level row exists
    const { data: existing } = await supabase
      .from("stock_levels")
      .select("id, quantity")
      .eq("product_id", prodId)
      .eq("warehouse_id", whId)
      .eq("workspace_id", currentWorkspace.id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("stock_levels")
        .update({ quantity: existing.quantity + delta })
        .eq("id", existing.id);
    } else {
      await supabase.from("stock_levels").insert({
        workspace_id: currentWorkspace.id,
        product_id: prodId,
        warehouse_id: whId,
        quantity: delta,
      });
    }
  };

  const filters = [
    { label: "All", value: "all" },
    { label: "IN", value: "IN" },
    { label: "OUT", value: "OUT" },
    { label: "Transfer", value: "TRANSFER" },
  ];

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
        title="Stock Movements"
        description="Track all stock ins, outs, and transfers"
        addLabel="Record Movement"
        onAdd={openDialog}
        searchValue={search}
        onSearchChange={setSearch}
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        {filters.map((f) => (
          <Button
            key={f.value}
            variant={typeFilter === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-5 py-10 text-center text-muted-foreground text-sm">
            {movements.length === 0
              ? 'No movements yet. Click "Record Movement" to get started.'
              : "No movements match the selected filter."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m) => {
                const Icon = typeIcons[m.movement_type];
                return (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(m.created_at), "dd MMM yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="font-medium">{m.product_name}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${typeColors[m.movement_type]}`}>
                        <Icon className="w-3.5 h-3.5" />
                        {m.movement_type}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono">{m.quantity}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.from_warehouse_name || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.to_warehouse_name || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground font-mono">{m.reference || "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Record Movement Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Stock Movement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Movement Type</Label>
              <Select value={movementType} onValueChange={(v) => setMovementType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">Stock In</SelectItem>
                  <SelectItem value="OUT">Stock Out</SelectItem>
                  <SelectItem value="TRANSFER">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Product</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.sku} — {p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {products.length === 0 && (
                <p className="text-xs text-muted-foreground">No products available. Add products first.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
            </div>

            {(movementType === "OUT" || movementType === "TRANSFER") && (
              <div className="space-y-2">
                <Label>From Warehouse</Label>
                <Select value={fromWarehouseId} onValueChange={setFromWarehouseId}>
                  <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(movementType === "IN" || movementType === "TRANSFER") && (
              <div className="space-y-2">
                <Label>To Warehouse</Label>
                <Select value={toWarehouseId} onValueChange={setToWarehouseId}>
                  <SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {warehouses.length === 0 && (
                  <p className="text-xs text-muted-foreground">No warehouses. Create one first.</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Reference (optional)</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="PO-0001, SO-0001, etc." />
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional details..." rows={2} />
            </div>

            <Button onClick={handleSave} disabled={saving || !productId} className="w-full">
              {saving ? "Recording..." : "Record Movement"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Movements;
