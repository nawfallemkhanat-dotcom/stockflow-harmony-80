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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  costPrice: number;
  sellPrice: number;
  taxRate: number;
  stock: number;
  status: string;
}

const mockProducts: Product[] = [
  { id: "1", sku: "WPX-001", name: "Widget Pro X", category: "Electronics", unit: "pcs", costPrice: 150, sellPrice: 250, taxRate: 20, stock: 342, status: "In-Stock" },
  { id: "2", sku: "CBL-002", name: "Cable USB-C 2m", category: "Cables", unit: "pcs", costPrice: 15, sellPrice: 35, taxRate: 20, stock: 1200, status: "In-Stock" },
  { id: "3", sku: "SNS-003", name: "Sensor Module A", category: "Electronics", unit: "pcs", costPrice: 80, sellPrice: 140, taxRate: 20, stock: 45, status: "Low-Stock" },
  { id: "4", sku: "PWR-004", name: "Power Adapter 65W", category: "Power", unit: "pcs", costPrice: 40, sellPrice: 75, taxRate: 20, stock: 520, status: "In-Stock" },
  { id: "5", sku: "LED-005", name: "LED Panel 40W", category: "Lighting", unit: "pcs", costPrice: 120, sellPrice: 199, taxRate: 20, stock: 0, status: "Out-of-Stock" },
  { id: "6", sku: "CNT-006", name: "Connector RJ45", category: "Cables", unit: "pcs", costPrice: 2, sellPrice: 5, taxRate: 20, stock: 12, status: "Low-Stock" },
  { id: "7", sku: "TPT-007", name: "Thermal Paste 5g", category: "Accessories", unit: "pcs", costPrice: 8, sellPrice: 18, taxRate: 20, stock: 3, status: "Low-Stock" },
  { id: "8", sku: "FAN-008", name: "Fan 120mm", category: "Cooling", unit: "pcs", costPrice: 25, sellPrice: 45, taxRate: 20, stock: 8, status: "Low-Stock" },
];

const Products = () => {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = mockProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = () => setDialogOpen(true);

  const handleSave = () => {
    setDialogOpen(false);
    toast.success("Product created successfully");
  };

  return (
    <AppLayout>
      <PageHeader
        title="Products"
        description="Manage your product catalog"
        onAdd={handleAdd}
        addLabel="Add Product"
        searchValue={search}
        onSearchChange={setSearch}
      />

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Cost (MAD)</TableHead>
              <TableHead className="text-right">Sell (MAD)</TableHead>
              <TableHead className="text-right">TVA %</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => (
              <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell className="font-mono text-xs text-muted-foreground">{p.sku}</TableCell>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-muted-foreground">{p.category}</TableCell>
                <TableCell className="text-right font-mono">{p.costPrice.toFixed(2)}</TableCell>
                <TableCell className="text-right font-mono">{p.sellPrice.toFixed(2)}</TableCell>
                <TableCell className="text-right">{p.taxRate}%</TableCell>
                <TableCell className="text-right font-mono">{p.stock}</TableCell>
                <TableCell><StatusBadge status={p.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add Product Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Product</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input placeholder="e.g. WPX-009" />
              </div>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input placeholder="Product name" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="electronics">Electronics</SelectItem>
                    <SelectItem value="cables">Cables</SelectItem>
                    <SelectItem value="power">Power</SelectItem>
                    <SelectItem value="lighting">Lighting</SelectItem>
                    <SelectItem value="cooling">Cooling</SelectItem>
                    <SelectItem value="accessories">Accessories</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pcs">Pieces</SelectItem>
                    <SelectItem value="kg">Kilograms</SelectItem>
                    <SelectItem value="m">Meters</SelectItem>
                    <SelectItem value="l">Liters</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Cost Price (MAD)</Label>
                <Input type="number" placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Sell Price (MAD)</Label>
                <Input type="number" placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>TVA Rate %</Label>
                <Select defaultValue="20">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="7">7%</SelectItem>
                    <SelectItem value="10">10%</SelectItem>
                    <SelectItem value="14">14%</SelectItem>
                    <SelectItem value="20">20%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Product</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Products;
