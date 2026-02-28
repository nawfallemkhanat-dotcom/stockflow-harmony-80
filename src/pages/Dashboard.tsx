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
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const recentMovements = [
  { id: "MOV-001", product: "Widget Pro X", type: "IN", qty: 500, warehouse: "Main Warehouse", date: "2026-02-28" },
  { id: "MOV-002", product: "Cable USB-C 2m", type: "OUT", qty: 120, warehouse: "Store Front", date: "2026-02-28" },
  { id: "MOV-003", product: "Sensor Module A", type: "TRANSFER", qty: 50, warehouse: "Main → Store", date: "2026-02-27" },
  { id: "MOV-004", product: "Power Adapter 65W", type: "IN", qty: 200, warehouse: "Main Warehouse", date: "2026-02-27" },
  { id: "MOV-005", product: "LED Panel 40W", type: "OUT", qty: 80, warehouse: "Store Front", date: "2026-02-26" },
];

const lowStockItems = [
  { product: "Connector RJ45", current: 12, reorder: 50, warehouse: "Main Warehouse" },
  { product: "Thermal Paste 5g", current: 3, reorder: 25, warehouse: "Store Front" },
  { product: "Fan 120mm", current: 8, reorder: 30, warehouse: "Main Warehouse" },
];

const Dashboard = () => {
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
            value="1,247"
            change="+23 this month"
            changeType="positive"
            icon={Package}
            delay={0}
          />
          <StatCard
            title="Stock Value"
            value="2,340,000 MAD"
            change="+5.2% from last month"
            changeType="positive"
            icon={DollarSign}
            delay={100}
          />
          <StatCard
            title="Pending Orders"
            value="34"
            change="12 purchase, 22 sales"
            changeType="neutral"
            icon={ShoppingCart}
            delay={200}
          />
          <StatCard
            title="Low Stock Alerts"
            value="7"
            change="3 critical"
            changeType="negative"
            icon={AlertTriangle}
            delay={300}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Movements */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden opacity-0 animate-fade-in" style={{ animationDelay: "400ms" }}>
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Recent Stock Movements</h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Warehouse</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentMovements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{m.id}</TableCell>
                    <TableCell className="font-medium">{m.product}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-xs font-medium">
                        {m.type === "IN" && <ArrowDownRight className="w-3 h-3 text-success" />}
                        {m.type === "OUT" && <ArrowUpRight className="w-3 h-3 text-destructive" />}
                        {m.type === "TRANSFER" && <ArrowUpRight className="w-3 h-3 text-primary" />}
                        {m.type}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono">{m.qty}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{m.warehouse}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Low Stock Alerts */}
          <div className="bg-card border border-border rounded-xl overflow-hidden opacity-0 animate-fade-in" style={{ animationDelay: "500ms" }}>
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <h2 className="font-semibold text-foreground">Low Stock Alerts</h2>
            </div>
            <div className="divide-y divide-border">
              {lowStockItems.map((item, i) => (
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
                  {/* Progress bar */}
                  <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-warning transition-all"
                      style={{ width: `${Math.min((item.current / item.reorder) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
