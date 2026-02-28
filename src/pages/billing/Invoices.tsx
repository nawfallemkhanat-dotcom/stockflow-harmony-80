import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

const mockInvoices = [
  { id: "INV-2026-001", customer: "Maroc Tech SARL", date: "2026-02-28", dueDate: "2026-03-30", subtotal: 12500, tva: 2500, total: 15000, status: "Paid", currency: "MAD" },
  { id: "INV-2026-002", customer: "Atlas Distribution", date: "2026-02-25", dueDate: "2026-03-27", subtotal: 8400, tva: 1680, total: 10080, status: "Pending", currency: "MAD" },
  { id: "INV-2026-003", customer: "Sahara Electronics", date: "2026-02-20", dueDate: "2026-03-22", subtotal: 34000, tva: 6800, total: 40800, status: "Overdue", currency: "MAD" },
  { id: "INV-2026-004", customer: "Rif Components", date: "2026-02-18", dueDate: "2026-03-20", subtotal: 5600, tva: 1120, total: 6720, status: "Draft", currency: "MAD" },
  { id: "INV-2026-005", customer: "Casablanca Imports", date: "2026-02-15", dueDate: "2026-03-17", subtotal: 22000, tva: 4400, total: 26400, status: "Paid", currency: "MAD" },
];

const Invoices = () => {
  const [search, setSearch] = useState("");

  const filtered = mockInvoices.filter(
    (inv) =>
      inv.id.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <PageHeader
        title="Invoices"
        description="Manage your invoices and billing"
        addLabel="Create Invoice"
        onAdd={() => {}}
        searchValue={search}
        onSearchChange={setSearch}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total", value: "99,000 MAD", sub: "5 invoices" },
          { label: "Paid", value: "41,400 MAD", sub: "2 invoices" },
          { label: "Pending", value: "10,080 MAD", sub: "1 invoice" },
          { label: "Overdue", value: "40,800 MAD", sub: "1 invoice" },
        ].map((s, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
            <p className="text-xl font-bold text-foreground mt-1">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              <TableHead className="text-right">TVA 20%</TableHead>
              <TableHead className="text-right">Total (MAD)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((inv) => (
              <TableRow key={inv.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell className="font-mono text-sm font-medium">{inv.id}</TableCell>
                <TableCell className="font-medium">{inv.customer}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{inv.date}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{inv.dueDate}</TableCell>
                <TableCell className="text-right font-mono">{inv.subtotal.toLocaleString()}</TableCell>
                <TableCell className="text-right font-mono">{inv.tva.toLocaleString()}</TableCell>
                <TableCell className="text-right font-mono font-semibold">{inv.total.toLocaleString()}</TableCell>
                <TableCell><StatusBadge status={inv.status} /></TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Eye className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
};

export default Invoices;
