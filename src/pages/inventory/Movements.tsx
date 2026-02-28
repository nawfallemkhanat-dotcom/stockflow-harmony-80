import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/shared/PageHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowDownRight, ArrowUpRight, ArrowLeftRight } from "lucide-react";

const mockMovements = [
  { id: "MOV-001", date: "2026-02-28", product: "Widget Pro X", type: "IN" as const, qty: 500, from: "—", to: "Main Warehouse", user: "admin@demo.com" },
  { id: "MOV-002", date: "2026-02-28", product: "Cable USB-C 2m", type: "OUT" as const, qty: 120, from: "Store Front", to: "—", user: "staff@demo.com" },
  { id: "MOV-003", date: "2026-02-27", product: "Sensor Module A", type: "TRANSFER" as const, qty: 50, from: "Main Warehouse", to: "Store Front", user: "admin@demo.com" },
  { id: "MOV-004", date: "2026-02-27", product: "Power Adapter 65W", type: "IN" as const, qty: 200, from: "—", to: "Main Warehouse", user: "admin@demo.com" },
  { id: "MOV-005", date: "2026-02-26", product: "LED Panel 40W", type: "OUT" as const, qty: 80, from: "Store Front", to: "—", user: "staff@demo.com" },
  { id: "MOV-006", date: "2026-02-26", product: "Fan 120mm", type: "IN" as const, qty: 100, from: "—", to: "Distribution Center", user: "admin@demo.com" },
];

const typeIcons = {
  IN: ArrowDownRight,
  OUT: ArrowUpRight,
  TRANSFER: ArrowLeftRight,
};

const typeColors = {
  IN: "text-success",
  OUT: "text-destructive",
  TRANSFER: "text-primary",
};

const Movements = () => {
  const [search, setSearch] = useState("");

  const filtered = mockMovements.filter(
    (m) =>
      m.product.toLowerCase().includes(search.toLowerCase()) ||
      m.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <PageHeader
        title="Stock Movements"
        description="Track all stock ins, outs, and transfers"
        addLabel="Record Movement"
        onAdd={() => {}}
        searchValue={search}
        onSearchChange={setSearch}
      />

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>User</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((m) => {
              const Icon = typeIcons[m.type];
              return (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{m.id}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.date}</TableCell>
                  <TableCell className="font-medium">{m.product}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${typeColors[m.type]}`}>
                      <Icon className="w-3.5 h-3.5" />
                      {m.type}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono">{m.qty}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.from}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.to}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.user}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
};

export default Movements;
