import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Loader2, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface PurchaseOrder {
  id: string;
  order_number: string;
  status: string;
  subtotal: number;
  tax_total: number;
  total: number;
  notes: string | null;
  created_at: string;
  suppliers: { name: string } | null;
}

const PurchaseOrdersList = () => {
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchOrders = useCallback(async () => {
    if (!currentWorkspace) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("purchase_orders")
      .select("id, order_number, status, subtotal, tax_total, total, notes, created_at, suppliers(name)")
      .eq("workspace_id", currentWorkspace.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load purchase orders");
      console.error(error);
    } else {
      setOrders((data as any) || []);
    }
    setLoading(false);
  }, [currentWorkspace]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const filtered = orders.filter((o) => {
    const matchesSearch =
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      (o.suppliers?.name || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = orders.reduce(
    (acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      acc.all++;
      return acc;
    },
    { all: 0 } as Record<string, number>
  );

  const totalValue = orders.reduce((sum, o) => sum + Number(o.total), 0);

  return (
    <AppLayout>
      <PageHeader
        title="Purchase Orders"
        description="Manage orders to your suppliers"
        onAdd={() => navigate("/purchases/orders/new")}
        addLabel="Create PO"
        searchValue={search}
        onSearchChange={setSearch}
      />

      {/* Status filter tabs */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {["all", "draft", "ordered", "received", "cancelled"].map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(s)}
            className="capitalize"
          >
            {s} {statusCounts[s] ? `(${statusCounts[s]})` : ""}
          </Button>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground font-medium">Total Orders</p>
          <p className="text-xl font-bold text-foreground mt-1">{orders.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground font-medium">Total Value</p>
          <p className="text-xl font-bold text-foreground mt-1">
            {totalValue.toLocaleString("fr-MA", { minimumFractionDigits: 2 })} {currentWorkspace?.currency}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground font-medium">Pending Receipt</p>
          <p className="text-xl font-bold text-foreground mt-1">
            {statusCounts["ordered"] || 0}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p>No purchase orders found.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/purchases/orders/new")}>
            Create your first PO
          </Button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO #</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="text-right">{currentWorkspace?.tax_label}</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((o) => (
                <TableRow
                  key={o.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/purchases/orders/${o.id}`)}
                >
                  <TableCell className="font-mono text-sm font-medium">{o.order_number}</TableCell>
                  <TableCell className="font-medium">{o.suppliers?.name || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right font-mono">{Number(o.subtotal).toLocaleString("fr-MA", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right font-mono">{Number(o.tax_total).toLocaleString("fr-MA", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{Number(o.total).toLocaleString("fr-MA", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell><StatusBadge status={o.status} /></TableCell>
                  <TableCell>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </AppLayout>
  );
};

export default PurchaseOrdersList;
