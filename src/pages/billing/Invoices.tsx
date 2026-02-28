import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import StatCard from "@/components/shared/StatCard";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Loader2, FileText, Banknote, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface Invoice {
  id: string;
  invoice_number: string;
  status: string;
  subtotal: number;
  tax_total: number;
  discount_total: number;
  total: number;
  due_date: string | null;
  created_at: string;
  customers: { name: string } | null;
}

const Invoices = () => {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const loadInvoices = async () => {
    if (!currentWorkspace) return;
    const { data, error } = await supabase
      .from("invoices")
      .select("id, invoice_number, status, subtotal, tax_total, discount_total, total, due_date, created_at, customers(name)")
      .eq("workspace_id", currentWorkspace.id)
      .order("created_at", { ascending: false });
    if (!error) setInvoices((data || []) as any);
    setLoading(false);
  };

  useEffect(() => { loadInvoices(); }, [currentWorkspace]);

  const filtered = invoices
    .filter((inv) => statusFilter === "all" || inv.status === statusFilter)
    .filter((inv) =>
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      inv.customers?.name?.toLowerCase().includes(search.toLowerCase())
    );

  const totalValue = invoices.reduce((s, o) => s + Number(o.total), 0);
  const paidValue = invoices.filter((o) => o.status === "paid").reduce((s, o) => s + Number(o.total), 0);
  const pendingValue = invoices.filter((o) => o.status === "sent").reduce((s, o) => s + Number(o.total), 0);
  const overdueValue = invoices.filter((o) => o.status === "overdue").reduce((s, o) => s + Number(o.total), 0);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const filters = [
    { label: "All", value: "all" },
    { label: "Draft", value: "draft" },
    { label: "Sent", value: "sent" },
    { label: "Paid", value: "paid" },
    { label: "Overdue", value: "overdue" },
    { label: "Cancelled", value: "cancelled" },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="Invoices"
        description="Manage your invoices and billing"
        onAdd={() => navigate("/billing/invoices/new")}
        addLabel="Create Invoice"
        searchValue={search}
        onSearchChange={setSearch}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard title={`Total (${currentWorkspace?.currency})`} value={totalValue.toFixed(0)} icon={FileText} />
        <StatCard title="Paid" value={paidValue.toFixed(0)} icon={Banknote} />
        <StatCard title="Pending" value={pendingValue.toFixed(0)} icon={Clock} />
        <StatCard title="Overdue" value={overdueValue.toFixed(0)} icon={AlertTriangle} />
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {filters.map((f) => (
          <Button
            key={f.value}
            variant={statusFilter === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-5 py-10 text-center text-muted-foreground text-sm">
            {invoices.length === 0
              ? 'No invoices yet. Click "Create Invoice" to create one.'
              : "No invoices match the selected filter."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="text-right">{currentWorkspace?.tax_label}</TableHead>
                <TableHead className="text-right">Total ({currentWorkspace?.currency})</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((inv) => (
                <TableRow
                  key={inv.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/billing/invoices/${inv.id}`)}
                >
                  <TableCell className="font-mono font-medium">{inv.invoice_number}</TableCell>
                  <TableCell>{inv.customers?.name || "—"}</TableCell>
                  <TableCell><StatusBadge status={inv.status} /></TableCell>
                  <TableCell className="text-right font-mono">{Number(inv.subtotal).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono">{Number(inv.tax_total).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{Number(inv.total).toFixed(2)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {inv.due_date ? format(new Date(inv.due_date), "dd MMM yyyy") : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(inv.created_at), "dd MMM yyyy")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </AppLayout>
  );
};

export default Invoices;
