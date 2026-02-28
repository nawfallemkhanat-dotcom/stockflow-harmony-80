import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
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
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, ArrowLeft, Save, FileDown } from "lucide-react";

interface CNLine {
  id?: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  line_total: number;
}

interface Customer { id: string; name: string; }
interface Product { id: string; name: string; sku: string; sell_price: number; }

const calcLineTotal = (qty: number, price: number): number => qty * price;

const CreditNoteForm = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const fromInvoice = searchParams.get("from_invoice");
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [cnNumber, setCnNumber] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [lines, setLines] = useState<CNLine[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [taxRates, setTaxRates] = useState<{ rate: number; name: string }[]>([]);
  const [addLineOpen, setAddLineOpen] = useState(false);

  const [newProductId, setNewProductId] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newQty, setNewQty] = useState(1);
  const [newPrice, setNewPrice] = useState(0);
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

  // Generate CN number
  useEffect(() => {
    if (!isNew || !currentWorkspace) return;
    const gen = async () => {
      const { count } = await supabase
        .from("credit_notes")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", currentWorkspace.id);
      setCnNumber(`CN-${String((count || 0) + 1).padStart(4, "0")}`);
    };
    gen();
  }, [isNew, currentWorkspace]);

  // Pre-fill from invoice
  useEffect(() => {
    if (!fromInvoice || !currentWorkspace) return;
    const loadInv = async () => {
      const { data: inv } = await supabase
        .from("invoices")
        .select("*, invoice_lines(*, products(name, sku))")
        .eq("id", fromInvoice)
        .single();
      if (!inv) return;
      setCustomerId(inv.customer_id);
      setInvoiceId(inv.id);
      setReason(`Credit for invoice ${inv.invoice_number}`);
      setLines(
        (inv.invoice_lines || []).map((l: any) => ({
          product_id: l.product_id,
          description: l.description || l.products?.name || "",
          quantity: l.quantity,
          unit_price: Number(l.unit_price),
          tax_rate: Number(l.tax_rate),
          line_total: Number(l.line_total),
        }))
      );
    };
    loadInv();
  }, [fromInvoice, currentWorkspace]);

  // Load existing CN
  useEffect(() => {
    if (isNew || !currentWorkspace) return;
    const loadCN = async () => {
      const { data: cn, error } = await supabase
        .from("credit_notes")
        .select("*, credit_note_lines(*, products(name, sku))")
        .eq("id", id)
        .single();
      if (error || !cn) {
        toast.error("Credit note not found");
        navigate("/billing/credit-notes");
        return;
      }
      setCnNumber(cn.credit_note_number);
      setCustomerId(cn.customer_id);
      setInvoiceId(cn.invoice_id);
      setReason(cn.reason || "");
      setLines(
        (cn.credit_note_lines || []).map((l: any) => ({
          id: l.id,
          product_id: l.product_id,
          description: l.description || l.products?.name || "",
          quantity: l.quantity,
          unit_price: Number(l.unit_price),
          tax_rate: Number(l.tax_rate),
          line_total: Number(l.line_total),
        }))
      );
      setLoading(false);
    };
    loadCN();
  }, [id, isNew, currentWorkspace]);

  const handleAddLine = () => {
    const product = products.find((p) => p.id === newProductId);
    const lineTotal = calcLineTotal(newQty, newPrice);
    setLines((prev) => [
      ...prev,
      {
        product_id: newProductId || null,
        description: newDescription || product?.name || "",
        quantity: newQty,
        unit_price: newPrice,
        tax_rate: newTaxRate,
        line_total: lineTotal,
      },
    ]);
    setAddLineOpen(false);
    setNewProductId("");
    setNewDescription("");
    setNewQty(1);
    setNewPrice(0);
  };

  const removeLine = (idx: number) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const handleProductSelect = (productId: string) => {
    setNewProductId(productId);
    const product = products.find((p) => p.id === productId);
    if (product) {
      setNewPrice(Number(product.sell_price));
      setNewDescription(product.name);
    }
  };

  const handleSave = async () => {
    if (!currentWorkspace || !user) return;
    if (!customerId) { toast.error("Please select a customer"); return; }
    if (lines.length === 0) { toast.error("Add at least one line item"); return; }

    setSaving(true);
    try {
      if (isNew) {
        const { data: cn, error: cnErr } = await supabase
          .from("credit_notes")
          .insert({
            workspace_id: currentWorkspace.id,
            credit_note_number: cnNumber,
            customer_id: customerId,
            invoice_id: invoiceId,
            reason: reason.trim() || null,
            subtotal,
            tax_total: taxTotal,
            total,
            created_by: user.id,
          })
          .select("id")
          .single();
        if (cnErr) throw cnErr;

        const lineInserts = lines.map((l) => ({
          credit_note_id: cn.id,
          product_id: l.product_id,
          description: l.description || null,
          quantity: l.quantity,
          unit_price: l.unit_price,
          tax_rate: l.tax_rate,
          line_total: l.line_total,
        }));
        const { error: lineErr } = await supabase.from("credit_note_lines").insert(lineInserts);
        if (lineErr) throw lineErr;

        toast.success("Credit note created");
        navigate(`/billing/credit-notes/${cn.id}`);
      } else {
        const { error: cnErr } = await supabase
          .from("credit_notes")
          .update({
            customer_id: customerId,
            invoice_id: invoiceId,
            reason: reason.trim() || null,
            subtotal,
            tax_total: taxTotal,
            total,
          })
          .eq("id", id);
        if (cnErr) throw cnErr;

        await supabase.from("credit_note_lines").delete().eq("credit_note_id", id);
        const lineInserts = lines.map((l) => ({
          credit_note_id: id!,
          product_id: l.product_id,
          description: l.description || null,
          quantity: l.quantity,
          unit_price: l.unit_price,
          tax_rate: l.tax_rate,
          line_total: l.line_total,
        }));
        const { error: lineErr } = await supabase.from("credit_note_lines").insert(lineInserts);
        if (lineErr) throw lineErr;

        toast.success("Credit note updated");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    }
    setSaving(false);
  };

  const handleExportPDF = async () => {
    if (!id || isNew) return;
    setExporting(true);
    try {
      const res = await supabase.functions.invoke("generate-credit-note-pdf", {
        body: { credit_note_id: id },
      });
      if (res.error) throw res.error;
      const blob = new Blob([res.data.html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const w = window.open(url, "_blank");
      if (w) w.onload = () => setTimeout(() => w.print(), 500);
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

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/billing/credit-notes")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">{cnNumber}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isNew ? "New credit note" : "Credit note details"}
              {invoiceId && <span className="ml-2 text-xs">(linked to invoice)</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <Button variant="outline" onClick={handleExportPDF} disabled={exporting}>
              {exporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileDown className="w-4 h-4 mr-2" />}
              Export PDF
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {isNew ? "Create" : "Update"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Customer & Reason */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>CN Number</Label>
                <Input value={cnNumber} disabled className="font-mono" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for credit note..." rows={2} />
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Line Items</h2>
              <Button size="sm" variant="outline" onClick={() => setAddLineOpen(true)}>
                <Plus className="w-4 h-4 mr-1" /> Add Item
              </Button>
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
                    <TableHead className="text-right">{currentWorkspace?.tax_label} %</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((l, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{l.description || "—"}</TableCell>
                      <TableCell className="text-right font-mono">{l.quantity}</TableCell>
                      <TableCell className="text-right font-mono">{l.unit_price.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{l.tax_rate}%</TableCell>
                      <TableCell className="text-right font-mono font-semibold">{l.line_total.toFixed(2)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeLine(idx)}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        {/* Summary */}
        <div>
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
                <SelectTrigger><SelectValue placeholder="Select product or leave blank" /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.sku} — {p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Line item description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input type="number" min={1} value={newQty} onChange={(e) => setNewQty(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Unit Price</Label>
                <Input type="number" step="0.01" value={newPrice} onChange={(e) => setNewPrice(Number(e.target.value))} />
              </div>
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
            <div className="text-right text-sm text-muted-foreground">
              Line total: <span className="font-mono font-semibold text-foreground">{calcLineTotal(newQty, newPrice).toFixed(2)}</span>
            </div>
            <Button onClick={handleAddLine} disabled={newQty <= 0 || newPrice <= 0}>
              Add to Credit Note
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default CreditNoteForm;
