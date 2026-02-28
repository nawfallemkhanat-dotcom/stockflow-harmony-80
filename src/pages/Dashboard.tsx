import { useState, useEffect, useMemo } from "react";
import AppLayout from "@/components/layout/AppLayout";
import StatCard from "@/components/shared/StatCard";
import StatusBadge from "@/components/shared/StatusBadge";
import {
  Package,
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Receipt,
  TrendingUp,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { format } from "date-fns";

interface DashboardData {
  totalProducts: number;
  stockValue: number;
  pendingPOs: number;
  pendingSOs: number;
  lowStockCount: number;
  invoiceRevenue: number;
  recentMovements: any[];
  lowStockItems: any[];
  recentInvoices: any[];
  allPaidInvoices: any[];
}

const Dashboard = () => {
  const { currentWorkspace } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData>({
    totalProducts: 0,
    stockValue: 0,
    pendingPOs: 0,
    pendingSOs: 0,
    lowStockCount: 0,
    invoiceRevenue: 0,
    recentMovements: [],
    lowStockItems: [],
    recentInvoices: [],
    allPaidInvoices: [],
  });

  useEffect(() => {
    if (!currentWorkspace) return;
    const wsId = currentWorkspace.id;

    const load = async () => {
      const [
        productsRes,
        stockRes,
        poRes,
        soRes,
        movementsRes,
        invoicesRes,
        allPaidRes,
      ] = await Promise.all([
        supabase.from("products").select("id, name, cost_price, sell_price, reorder_level").eq("workspace_id", wsId).eq("active", true),
        supabase.from("stock_levels").select("quantity, product_id, warehouse_id, products(name, reorder_level), warehouses(name)").eq("workspace_id", wsId),
        supabase.from("purchase_orders").select("id, status").eq("workspace_id", wsId).in("status", ["draft", "ordered"]),
        supabase.from("sales_orders").select("id, status").eq("workspace_id", wsId).in("status", ["draft", "paid"]),
        supabase.from("stock_movements").select("id, movement_type, quantity, created_at, notes, reference, products(name), from_warehouse:warehouses!stock_movements_from_warehouse_id_fkey(name), to_warehouse:warehouses!stock_movements_to_warehouse_id_fkey(name)").eq("workspace_id", wsId).order("created_at", { ascending: false }).limit(5),
        supabase.from("invoices").select("id, invoice_number, status, total, created_at, customers(name)").eq("workspace_id", wsId).order("created_at", { ascending: false }).limit(5),
        supabase.from("invoices").select("total, created_at").eq("workspace_id", wsId).eq("status", "paid").order("created_at"),
      ]);

      const products = productsRes.data || [];
      const stocks = (stockRes.data || []) as any[];
      const movements = (movementsRes.data || []) as any[];
      const invoices = (invoicesRes.data || []) as any[];
      const allPaid = (allPaidRes.data || []) as any[];

      // Stock value: sum of quantity * cost_price per product
      const productCostMap = new Map(products.map((p) => [p.id, Number(p.sell_price)]));
      const stockValue = stocks.reduce((sum, s) => {
        const price = productCostMap.get(s.product_id) || 0;
        return sum + s.quantity * price;
      }, 0);

      // Low stock: stock_levels where quantity < reorder_level
      const lowStockItems = stocks
        .filter((s: any) => s.products && s.quantity < (s.products.reorder_level || 10))
        .map((s: any) => ({
          product: s.products?.name || "—",
          current: s.quantity,
          reorder: s.products?.reorder_level || 10,
          warehouse: s.warehouses?.name || "—",
        }))
        .slice(0, 5);

      // Invoice revenue (paid)
      const invoiceRevenue = invoices
        .filter((i: any) => i.status === "paid")
        .reduce((sum: number, i: any) => sum + Number(i.total), 0);

      setData({
        totalProducts: products.length,
        stockValue,
        pendingPOs: (poRes.data || []).length,
        pendingSOs: (soRes.data || []).length,
        lowStockCount: lowStockItems.length,
        invoiceRevenue,
        recentMovements: movements,
        lowStockItems,
        recentInvoices: invoices,
        allPaidInvoices: allPaid,
      });
      setLoading(false);
    };

    load();
  }, [currentWorkspace]);

  const currency = currentWorkspace?.currency || "MAD";

  // Build monthly revenue chart data from paid invoices (last 12 months)
  const revenueChartData = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: format(d, "MMM yyyy"),
      });
    }
    const monthMap: Record<string, number> = {};
    months.forEach((m) => (monthMap[m.key] = 0));
    data.allPaidInvoices.forEach((inv: any) => {
      const d = new Date(inv.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (monthMap[key] !== undefined) monthMap[key] += Number(inv.total);
    });
    return months.map((m) => ({ month: m.label, revenue: monthMap[m.key] }));
  }, [data.allPaidInvoices]);

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
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Overview of your inventory and billing</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Products"
            value={String(data.totalProducts)}
            change={`${currency} ${data.stockValue.toLocaleString()} stock value`}
            changeType="neutral"
            icon={Package}
            delay={0}
          />
          <StatCard
            title="Pending Orders"
            value={String(data.pendingPOs + data.pendingSOs)}
            change={`${data.pendingPOs} purchase, ${data.pendingSOs} sales`}
            changeType="neutral"
            icon={ShoppingCart}
            delay={100}
          />
          <StatCard
            title="Revenue (Paid)"
            value={`${data.invoiceRevenue.toLocaleString()} ${currency}`}
            change="From paid invoices"
            changeType="positive"
            icon={DollarSign}
            delay={200}
          />
          <StatCard
            title="Low Stock Alerts"
            value={String(data.lowStockCount)}
            change={data.lowStockCount > 0 ? "Items below reorder level" : "All stock healthy"}
            changeType={data.lowStockCount > 0 ? "negative" : "positive"}
            icon={AlertTriangle}
            delay={300}
          />
        </div>

        {/* Monthly Revenue Chart */}
        <div className="bg-card border border-border rounded-xl overflow-hidden opacity-0 animate-fade-in" style={{ animationDelay: "350ms" }}>
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground">Monthly Revenue</h2>
            <span className="text-xs text-muted-foreground ml-auto">Last 12 months ({currency})</span>
          </div>
          <div className="p-5" style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: 13,
                  }}
                  formatter={(value: number) => [`${value.toLocaleString()} ${currency}`, "Revenue"]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Movements */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden opacity-0 animate-fade-in" style={{ animationDelay: "400ms" }}>
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Recent Stock Movements</h2>
            </div>
            {data.recentMovements.length === 0 ? (
              <div className="px-5 py-10 text-center text-muted-foreground text-sm">
                No stock movements yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentMovements.map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.products?.name || "—"}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-xs font-medium">
                          {m.movement_type === "IN" && <ArrowDownRight className="w-3 h-3 text-success" />}
                          {m.movement_type === "OUT" && <ArrowUpRight className="w-3 h-3 text-destructive" />}
                          {m.movement_type === "TRANSFER" && <ArrowUpRight className="w-3 h-3 text-primary" />}
                          {m.movement_type}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono">{m.quantity}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {m.movement_type === "TRANSFER"
                          ? `${m.from_warehouse?.name || "?"} → ${m.to_warehouse?.name || "?"}`
                          : m.movement_type === "IN"
                          ? m.to_warehouse?.name || "—"
                          : m.from_warehouse?.name || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(m.created_at), "dd MMM")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Low Stock Alerts */}
            <div className="bg-card border border-border rounded-xl overflow-hidden opacity-0 animate-fade-in" style={{ animationDelay: "500ms" }}>
              <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <h2 className="font-semibold text-foreground">Low Stock Alerts</h2>
              </div>
              {data.lowStockItems.length === 0 ? (
                <div className="px-5 py-6 text-center text-muted-foreground text-sm">
                  All products above reorder levels ✓
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {data.lowStockItems.map((item: any, i: number) => (
                    <div key={i} className="px-5 py-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground">{item.product}</p>
                        <StatusBadge status={item.current <= 5 ? "out-of-stock" : "low-stock"} />
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-muted-foreground">{item.warehouse}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.current} / {item.reorder} units
                        </p>
                      </div>
                      <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-warning transition-all"
                          style={{ width: `${Math.min((item.current / item.reorder) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Invoices */}
            <div className="bg-card border border-border rounded-xl overflow-hidden opacity-0 animate-fade-in" style={{ animationDelay: "600ms" }}>
              <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                <Receipt className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-foreground">Recent Invoices</h2>
              </div>
              {data.recentInvoices.length === 0 ? (
                <div className="px-5 py-6 text-center text-muted-foreground text-sm">
                  No invoices yet.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {data.recentInvoices.map((inv: any) => (
                    <div key={inv.id} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground font-mono">{inv.invoice_number}</p>
                        <p className="text-xs text-muted-foreground">{inv.customers?.name || "—"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold font-mono">{Number(inv.total).toLocaleString()} {currency}</p>
                        <StatusBadge status={inv.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
