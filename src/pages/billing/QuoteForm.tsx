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
import {
  Loader2, Plus, Trash2, ArrowLeft, Save, Send, CheckCircle,
  XCircle, ShoppingCart, FileDown,
} from "lucide-react";

interface QLine {
  id?: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  discount_pct: number;
  tax_rate: number;
  line_total: number;
}

interface Customer { id: string; name: string; }
interface Product { id: string; name: string; sku: string; sell_price: number; }

const calcLineTotal = (qty: number, price: number, discPct: number) => {
  const sub = qty * price;
  return sub - sub * (discPct / 100);
};

const QuoteForm = () => {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [quoteNumber, setQuoteNumber] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("draft");
  const [lines, setLines] = useState<QLine[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [taxRates, setTaxRates] = useState<{ rate: number; name: string }[]>([]);
  const [addLineOpen, setAddLineOpen] = useState(false);

  const [newProductId, setNewProductId] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newQty, setNewQty] = useState(1);
  const [newPrice, setNewPrice] = useState(0);
  const [newDiscount, setNewDiscount] = useState(0);
  const [newTaxRate, setNewTaxRate] = useState(20);

  const subtotal = lines.reduce((s, l) => s + l.line_total, 0);
  const discountTotal = lines.reduce((s, l) => {
    const gross = l.quantity * l.unit_price;
    return s + gross * (l.discount_pct / 100);
  }, 0);
  const taxTotal = lines.reduce((s, l) => s + l.line_total * (l.tax_rate / 100), 0);
  const total = subtotal + taxTotal;

  // Load ref data
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

  // Generate quote number
  useEffect(() => {
    if (!isNew || !currentWorkspace) return;
    const gen = async () => {
      const { count } = await supabase
        .from("quotes")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", currentWorkspace.id);
      setQuoteNumber(`QT-${String((count || 0) + 1).padStart(4, "0")}`);
      const valid = new Date();
      valid.setDate(valid.getDate() + 30);
      setValidUntil(valid.toISOString().split("T")[0]);
    };
    gen();
  }, [isNew, currentWorkspace]);

  // Load existing quote
  useEffect(() => {
    if (isNew || !currentWorkspace) return;
    const loadQuote = async () => {
      const { data: q, error } = await supabase
        .from("quotes")
        .select("*, quote_lines(*, products(name, sku))")
        .eq("id", id)
        .single();
      if (error || !q) {
        toast.error("Quote not found");
        navigate("/billing/quotes");
        return;
      }
      setQuoteNumber(q.quote_number);
      setCustomerId(q.customer_id);
      setValidUntil(q.valid_until || "");
      setNotes(q.notes || "");
      setStatus(q.status);
      setLines(
        ((q as any).quote_lines || []).map((l: any) => ({
          id: l.id,
          product_id: l.product_id,
          description: l.description || l.products?.name || "",
          quantity: Number(l.quantity),
          unit_price: Number(l.unit_price),
          discount_pct: Number(l.discount_pct),
          tax_rate: Number(l.tax_rate),
          line_total: Number(l.line_total),
        }))
      );
      setLoading(false);
    };
    loadQuote();
  }, [id, isNew, currentWorkspace]);

  const handleAddLine = () => {
    const product = products.find((p) => p.id === newProductId);
    const lineTotal = calcLineTotal(newQty, newPrice, newDiscount);
    setLines((prev) => [
      ...prev,
      {
        product_id: newProductId || null,
        description: newDescription || product?.name || "",
        quantity: newQty,
        unit_price: newPrice,
        discount_pct: newDiscount,
        tax_rate: newTaxRate,
        line_total: lineTotal,
      },
    ]);
    setAddLineOpen(false);
    setNewProductId(""); setNewDescription(""); setNewQty(1); setNewPrice(0); setNewDiscount(0);
  };

  const removeLine = (idx: number) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const handleProductSelect = (productId: string) => {
    setNewProductId(productId);
    const product = products.find((p) => p.id === productId);
    if (product) { setNewPrice(Number(product.sell_price)); setNewDescription(product.name); }
  };

  const handleSave = async (newStatus?: string) => {
    if (!currentWorkspace || !user) return;
    if (!customerId) { toast.error("Please select a customer"); return; }
    if (lines.length === 0) { toast.error("Add at least one line item"); return; }

    setSaving(true);
    const targetStatus = newStatus || status;

    try {
      if (isNew) {
        const { data: q, error: qErr } = await supabase
          .from("quotes")
          .insert({
            workspace_id: currentWorkspace.id,
            quote_number: quoteNumber,
            customer_id: customerId,
            status: targetStatus,
            subtotal,
            tax_total: taxTotal,
            total,
            valid_until: validUntil || null,
            notes: notes || null,
            created_by: user.id,
          })
          .select("id")
          .single();
        if (qErr) throw qErr;

        const lineInserts = lines.map((l) => ({
          quote_id: q.id,
          product_id: l.product_id,
          description: l.description || null,
          quantity: l.quantity,
          unit_price: l.unit_price,
          discount_pct: l.discount_pct,
          tax_rate: l.tax_rate,
          line_total: l.line_total,
        }));
        const { error: lineErr } = await supabase.from("quote_lines").insert(lineInserts);
        if (lineErr) throw lineErr;

        toast.success("Quote created");
        navigate(`/billing/quotes/${q.id}`);
      } else {
        const { error: qErr } = await supabase
          .from("quotes")
          .update({
            customer_id: customerId,
            status: targetStatus,
            subtotal,
            tax_total: taxTotal,
            total,
            valid_until: validUntil || null,
            notes: notes || null,
          })
          .eq("id", id);
        if (qErr) throw qErr;

        await supabase.from("quote_lines").delete().eq("quote_id", id);
        const lineInserts = lines.map((l) => ({
          quote_id: id!,
          product_id: l.product_id,
          description: l.description || null,
          quantity: l.quantity,
          unit_price: l.unit_price,
          discount_pct: l.discount_pct,
          tax_rate: l.tax_rate,
          line_total: l.line_total,
        }));
        const { error: lineErr } = await supabase.from("quote_lines").insert(lineInserts);
        if (lineErr) throw lineErr;

        setStatus(targetStatus);
        toast.success("Quote updated");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    }
    setSaving(false);
  };

  const handleConvertToSO = async () => {
    if (!currentWorkspace || !user) return;
    setSaving(true);
    try {
      // Create SO from quote
      const { count } = await supabase
        .from("sales_orders")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", currentWorkspace.id);
      const soNumber = `SO-${String((count || 0) + 1).padStart(4, "0")}`;

      const { data: so, error: soErr } = await supabase
        .from("sales_orders")
        .insert({
          workspace_id: currentWorkspace.id,
          order_number: soNumber,
          customer_id: customerId,
          status: "draft" as any,
          subtotal,
          tax_total: taxTotal,
          total,
          notes: `Converted from ${quoteNumber}`,
          created_by: user.id,
        })
        .select("id")
        .single();
      if (soErr) throw soErr;

      const soLines = lines
        .filter((l) => l.product_id)
        .map((l) => ({
          sales_order_id: so.id,
          product_id: l.product_id!,
          quantity: l.quantity,
          unit_price: l.unit_price,
          discount_pct: l.discount_pct,
          tax_rate: l.tax_rate,
          line_total: l.line_total,
        }));
      if (soLines.length > 0) {
        const { error: lineErr } = await supabase.from("sales_order_lines").insert(soLines);
        if (lineErr) throw lineErr;
      }

      // Mark quote as accepted
      await supabase.from("quotes").update({ status: "accepted" }).eq("id", id);
      setStatus("accepted");

      toast.success(`Sales Order ${soNumber} created`);
      navigate(`/sales/orders/${so.id}`);
    } catch (err: any) {
      toast.error(err.message || "Conversion failed");
    }
    setSaving(false);
  };

  const handleExportPDF = async () => {
    if (!id || isNew) return;
    setExporting(true);
    try {
      const res = await supabase.functions.invoke("generate-quote-pdf", {
        body: { quote_id: id },
      });
      if (res.error) throw res.error;
      const blob = new Blob([res.data.html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const w = window.open(url, "_blank");
      if (w) { w.onload = () => { setTimeout(() => w.print(), 500); }; }
    } catch (err: any) {
      toast.error(err.message || "PDF export failed");
    }
    setExporting(false);
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
  const workflowSteps = ["draft", "sent", "accepted"];

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/billing/quotes")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">{quoteNumber}</h1>
              <StatusBadge status={status} />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isNew ? "New quote" : "Quote details"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!isNew && (
            <Button variant="outline" onClick={handleExportPDF} disabled={exporting}>
              {exporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileDown className="w-4 h-4 mr-2" />}
              Export PDF
            </Button>
          )}
          {isEditable && (
            <>
              <Button variant="outline" onClick={() => handleSave()} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save Draft
              </Button>
              <Button onClick={() => handleSave("sent")} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                Mark as Sent
              </Button>
            </>
          )}
          {status === "sent" && (
            <>
              <Button onClick={() => handleSave("accepted")} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Accept
              </Button>
              <Button variant="ghost" onClick={() => handleSave("rejected")} disabled={saving}>
                <XCircle className="w-4 h-4 mr-2" /> Reject
              </Button>
            </>
          )}
          {status === "accepted" && !isNew && (
            <Button onClick={handleConvertToSO} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShoppingCart className="w-4 h-4 mr-2" />}
              Convert to Sales Order
            </Button>
          )}
          {status === "draft" && !isNew && (
            <Button variant="ghost" onClick={() => handleSave("rejected")} disabled={saving}>
              <XCircle className="w-4 h-4 mr-2" /> Reject
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Customer, Valid Until & Notes */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              </div>
              <div className="space-y-2">
                <Label>Quote Number</Label>
                <Input value={quoteNumber} disabled className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label>Valid Until</Label>
                <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} disabled={!isEditable} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} disabled={!isEditable} placeholder="Terms, conditions..." rows={2} />
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
                    <TableHead>Description</TableHead>
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
                      <TableCell className="font-medium">{l.description || "—"}</TableCell>
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

        {/* Right: Summary & Workflow */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h2 className="font-semibold text-foreground mb-2">Summary</h2>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-mono">{subtotal.toFixed(2)}</span>
            </div>
            {discountTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Discount</span>
                <span className="font-mono text-destructive">-{discountTotal.toFixed(2)}</span>
              </div>
            )}
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
              {status === "rejected" && (
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-destructive" />
                  <span className="text-sm font-semibold text-destructive">Rejected</span>
                </div>
              )}
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
              <Label>Product (optional)</Label>
              <Select value={newProductId} onValueChange={handleProductSelect}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Line description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input type="number" min={1} value={newQty} onChange={(e) => setNewQty(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Unit Price</Label>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddLineOpen(false)}>Cancel</Button>
            <Button onClick={handleAddLine}>Add Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default QuoteForm;
