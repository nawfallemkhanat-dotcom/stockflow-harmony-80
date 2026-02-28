import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, ArrowLeft, Save, Banknote, Truck } from "lucide-react";

interface SOLine {
  id?: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
  discount_pct: number;
  tax_rate: number;
  line_total: number;
}

interface Customer { id: string; name: string; }
interface Product { id: string; name: string; sku: string; sell_price: number; }

const calcLineTotal = (qty: number, price: number, discountPct: number): number => {
  const subtotal = qty * price;
  return subtotal - subtotal * (discountPct / 100);
};

const SalesOrderForm = () => {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("draft");
  const [lines, setLines] = useState<SOLine[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [taxRates, setTaxRates] = useState<{ rate: number; name: string }[]>([]);
  const [addLineOpen, setAddLineOpen] = useState(false);

  const [newProductId, setNewProductId] = useState("");
  const [newQty, setNewQty] = useState(1);
  const [newPrice, setNewPrice] = useState(0);
  const [newDiscount, setNewDiscount] = useState(0);
  const [newTaxRate, setNewTaxRate] = useState(20);

  const subtotal = lines.reduce((s, l) => s + l.line_total, 0);
  const taxTotal = lines.reduce((s, l) => s + l.line_total * (l.tax_rate / 100), 0);
  const total = subtotal + taxTotal;

  useEffect(() => {
    if (!currentWorkspace) return;
    const load = async () => {
      const [custRes, prodRes, taxRes] = await Promise.all([
        supabase.from("customers").select("id, name").eq("workspace_id", currentWorkspace.id),
        supabase.from("products").select("id, name, sku, sell_price").eq("workspace_id", currentWorkspace.id).eq("active", true),
        supabase.from("tax_rates").select("rate, name").eq("workspace_id", currentWorkspace.id).eq("active", true).order("rate", { ascending: false }),
      ]);
      setCustomers(custRes.data || []);
      setProducts(prodRes.data || []);
      setTaxRates(taxRes.data || []);
      if (taxRes.data?.length) {
        const def = taxRes.data.find((t: any) => t.rate === 20);
        if (def) setNewTaxRate(def.rate);
      }
    };
    load();
  }, [currentWorkspace]);

  useEffect(() => {
    if (!isNew || !currentWorkspace) return;
    const genNumber = async () => {
      const { count } = await supabase
        .from("sales_orders")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", currentWorkspace.id);
      setOrderNumber(`SO-${String((count || 0) + 1).padStart(4, "0")}`);
    };
    genNumber();
  }, [isNew, currentWorkspace]);

  useEffect(() => {
    if (isNew || !currentWorkspace) return;
    const loadSO = async () => {
      const { data: so, error } = await supabase
        .from("sales_orders")
        .select("*, sales_order_lines(*, products(name, sku))")
        .eq("id", id)
        .single();
      if (error || !so) {
        toast.error("Sales order not found");
        navigate("/sales/orders");
        return;
      }
      setOrderNumber(so.order_number);
      setCustomerId(so.customer_id);
      setNotes(so.notes || "");
      setStatus(so.status);
      setLines(
        (so.sales_order_lines || []).map((l: any) => ({
          id: l.id,
          product_id: l.product_id,
          product_name: l.products?.name || "",
          quantity: l.quantity,
          unit_price: Number(l.unit_price),
          discount_pct: Number(l.discount_pct),
          tax_rate: Number(l.tax_rate),
          line_total: Number(l.line_total),
        }))
      );
      setLoading(false);
    };
    loadSO();
  }, [id, isNew, currentWorkspace]);

  const handleAddLine = () => {
    const product = products.find((p) => p.id === newProductId);
    if (!product) return;
    const lineTotal = calcLineTotal(newQty, newPrice, newDiscount);
    setLines((prev) => [
      ...prev,
      {
        product_id: newProductId,
        product_name: product.name,
        quantity: newQty,
        unit_price: newPrice,
        discount_pct: newDiscount,
        tax_rate: newTaxRate,
        line_total: lineTotal,
      },
    ]);
    setAddLineOpen(false);
    setNewProductId("");
    setNewQty(1);
    setNewPrice(0);
    setNewDiscount(0);
  };

  const removeLine = (idx: number) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const handleProductSelect = (productId: string) => {
    setNewProductId(productId);
    const product = products.find((p) => p.id === productId);
    if (product) setNewPrice(Number(product.sell_price));
  };

  const handleSave = async (newStatus?: string) => {
    if (!currentWorkspace || !user) return;
    if (!customerId) { toast.error("Please select a customer"); return; }
    if (lines.length === 0) { toast.error("Add at least one line item"); return; }

    setSaving(true);
    const targetStatus = newStatus || status;

    try {
      if (isNew) {
        const { data: so, error: soErr } = await supabase
          .from("sales_orders")
          .insert({
            workspace_id: currentWorkspace.id,
            order_number: orderNumber,
            customer_id: customerId,
            status: targetStatus as any,
            subtotal,
            tax_total: taxTotal,
            total,
            notes: notes || null,
            created_by: user.id,
          })
          .select("id")
          .single();
        if (soErr) throw soErr;

        const lineInserts = lines.map((l) => ({
          sales_order_id: so.id,
          product_id: l.product_id,
          quantity: l.quantity,
          unit_price: l.unit_price,
          discount_pct: l.discount_pct,
          tax_rate: l.tax_rate,
          line_total: l.line_total,
        }));
        const { error: lineErr } = await supabase.from("sales_order_lines").insert(lineInserts);
        if (lineErr) throw lineErr;

        toast.success("Sales order created");
        navigate(`/sales/orders/${so.id}`);
      } else {
        const { error: soErr } = await supabase
          .from("sales_orders")
          .update({
            customer_id: customerId,
            status: targetStatus as any,
            subtotal,
            tax_total: taxTotal,
            total,
            notes: notes || null,
          })
          .eq("id", id);
        if (soErr) throw soErr;

        await supabase.from("sales_order_lines").delete().eq("sales_order_id", id);
        const lineInserts = lines.map((l) => ({
          sales_order_id: id!,
          product_id: l.product_id,
          quantity: l.quantity,
          unit_price: l.unit_price,
          discount_pct: l.discount_pct,
          tax_rate: l.tax_rate,
          line_total: l.line_total,
        }));
        const { error: lineErr } = await supabase.from("sales_order_lines").insert(lineInserts);
        if (lineErr) throw lineErr;

        setStatus(targetStatus);
        toast.success("Sales order updated");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
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

  const isEditable = status === "draft";
  const workflowSteps = ["draft", "paid", "shipped"];

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/sales/orders")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">{orderNumber}</h1>
              <StatusBadge status={status} />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isNew ? "New sales order" : "Edit sales order"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditable && (
            <>
              <Button variant="outline" onClick={() => handleSave()} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save Draft
              </Button>
              <Button onClick={() => handleSave("paid")} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Banknote className="w-4 h-4 mr-2" />}
                Mark as Paid
              </Button>
            </>
          )}
          {status === "paid" && (
            <Button onClick={() => handleSave("shipped")} disabled={saving} className="bg-success hover:bg-success/90">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Truck className="w-4 h-4 mr-2" />}
              Mark as Shipped
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Customer & Notes */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer</Label>
                <Select value={customerId} onValueChange={setCustomerId} disabled={!isEditable}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {customers.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No customers yet.{" "}
                    <button onClick={() => navigate("/sales/customers")} className="text-primary hover:underline">
                      Add one first
                    </button>
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>SO Number</Label>
                <Input value={orderNumber} disabled className="font-mono" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} disabled={!isEditable} placeholder="Optional notes..." rows={2} />
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Line Items</h2>
              {isEditable && (
                <Button size="sm" variant="outline" onClick={() => setAddLineOpen(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Add Item
                </Button>
              )}
            </div>
            {lines.length === 0 ? (
              <div className="px-5 py-10 text-center text-muted-foreground text-sm">
                No items yet. Click "Add Item" to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Disc %</TableHead>
                    <TableHead className="text-right">{currentWorkspace?.tax_label} %</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    {isEditable && <TableHead className="w-10"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((l, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{l.product_name || "—"}</TableCell>
                      <TableCell className="text-right font-mono">{l.quantity}</TableCell>
                      <TableCell className="text-right font-mono">{l.unit_price.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{l.discount_pct}%</TableCell>
                      <TableCell className="text-right">{l.tax_rate}%</TableCell>
                      <TableCell className="text-right font-mono font-semibold">{l.line_total.toFixed(2)}</TableCell>
                      {isEditable && (
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeLine(idx)}>
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        {/* Right: Totals & Workflow */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h2 className="font-semibold text-foreground mb-2">Summary</h2>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-mono">{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{currentWorkspace?.tax_label}</span>
              <span className="font-mono">{taxTotal.toFixed(2)}</span>
            </div>
            <div className="border-t border-border pt-3 flex justify-between font-semibold">
              <span>Total ({currentWorkspace?.currency})</span>
              <span className="font-mono text-lg">{total.toFixed(2)}</span>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-semibold text-foreground mb-3">Workflow</h2>
            <div className="space-y-2">
              {workflowSteps.map((s, i) => {
                const isCurrent = s === status;
                const isPast = workflowSteps.indexOf(status) > i;
                return (
                  <div key={s} className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${isPast ? "bg-success" : isCurrent ? "bg-primary" : "bg-muted"}`} />
                    <span className={`text-sm capitalize ${isCurrent ? "font-semibold text-foreground" : isPast ? "text-success" : "text-muted-foreground"}`}>
                      {s}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Add Line Dialog */}
      <Dialog open={addLineOpen} onOpenChange={setAddLineOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Line Item</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Product</Label>
              <Select value={newProductId} onValueChange={handleProductSelect}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.sku} — {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input type="number" min={1} value={newQty} onChange={(e) => setNewQty(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Unit Price ({currentWorkspace?.currency})</Label>
                <Input type="number" min={0} step="0.01" value={newPrice} onChange={(e) => setNewPrice(Number(e.target.value))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Discount %</Label>
                <Input type="number" min={0} max={100} value={newDiscount} onChange={(e) => setNewDiscount(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>{currentWorkspace?.tax_label} Rate</Label>
                <Select value={String(newTaxRate)} onValueChange={(v) => setNewTaxRate(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {taxRates.map((t) => (
                      <SelectItem key={t.rate} value={String(t.rate)}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {newProductId && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Line subtotal</span>
                  <span className="font-mono">{calcLineTotal(newQty, newPrice, newDiscount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{currentWorkspace?.tax_label} ({newTaxRate}%)</span>
                  <span className="font-mono">{(calcLineTotal(newQty, newPrice, newDiscount) * newTaxRate / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t border-border pt-1">
                  <span>Line total</span>
                  <span className="font-mono">
                    {(calcLineTotal(newQty, newPrice, newDiscount) * (1 + newTaxRate / 100)).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddLineOpen(false)}>Cancel</Button>
            <Button onClick={handleAddLine} disabled={!newProductId || newQty < 1}>Add Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default SalesOrderForm;
