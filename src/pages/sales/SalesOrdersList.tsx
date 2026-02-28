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
import { toast } from "sonner";
import { Loader2, FileText, ShoppingCart, Banknote, Truck } from "lucide-react";
import { format } from "date-fns";

interface SalesOrder {
  id: string;
  order_number: string;
  status: string;
  subtotal: number;
  tax_total: number;
  total: number;
  notes: string | null;
  created_at: string;
  customers: { name: string } | null;
}

const SalesOrdersList = () => {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const loadOrders = async () => {
    if (!currentWorkspace) return;
    const { data, error } = await supabase
      .from("sales_orders")
      .select("id, order_number, status, subtotal, tax_total, total, notes, created_at, customers(name)")
      .eq("workspace_id", currentWorkspace.id)
      .order("created_at", { ascending: false });
    if (!error) setOrders((data || []) as any);
    setLoading(false);
  };

  useEffect(() => { loadOrders(); }, [currentWorkspace]);

  const filtered = statusFilter === "all"
    ? orders
    : orders.filter((o) => o.status === statusFilter);

  const totalValue = orders.reduce((s, o) => s + Number(o.total), 0);
  const draftCount = orders.filter((o) => o.status === "draft").length;
  const paidCount = orders.filter((o) => o.status === "paid").length;
  const shippedCount = orders.filter((o) => o.status === "shipped").length;

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
    { label: "Paid", value: "paid" },
    { label: "Shipped", value: "shipped" },
    { label: "Cancelled", value: "cancelled" },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="Sales Orders"
        description="Manage outgoing orders to customers"
        onAdd={() => navigate("/sales/orders/new")}
        addLabel="New Sales Order"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Orders" value={String(orders.length)} icon={FileText} />
        <StatCard title={`Total Value (${currentWorkspace?.currency})`} value={totalValue.toFixed(0)} icon={Banknote} />
        <StatCard title="Paid" value={String(paidCount)} icon={ShoppingCart} />
        <StatCard title="Shipped" value={String(shippedCount)} icon={Truck} />
      </div>

      {/* Status Filter */}
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
            {orders.length === 0
              ? 'No sales orders yet. Click "New Sales Order" to create one.'
              : "No orders match the selected filter."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total ({currentWorkspace?.currency})</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((o) => (
                <TableRow
                  key={o.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/sales/orders/${o.id}`)}
                >
                  <TableCell className="font-mono font-medium">{o.order_number}</TableCell>
                  <TableCell>{o.customers?.name || "—"}</TableCell>
                  <TableCell><StatusBadge status={o.status} /></TableCell>
                  <TableCell className="text-right font-mono">{Number(o.total).toFixed(2)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(o.created_at), "dd MMM yyyy")}
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

export default SalesOrdersList;
