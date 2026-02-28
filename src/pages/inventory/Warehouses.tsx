import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/shared/PageHeader";
import { Package, MapPin } from "lucide-react";

const warehouses = [
  { id: "1", name: "Main Warehouse", location: "Casablanca, Morocco", products: 847, totalStock: 12500, capacity: "85%" },
  { id: "2", name: "Store Front", location: "Rabat, Morocco", products: 320, totalStock: 4200, capacity: "62%" },
  { id: "3", name: "Distribution Center", location: "Tangier, Morocco", products: 580, totalStock: 8900, capacity: "74%" },
];

const Warehouses = () => {
  return (
    <AppLayout>
      <PageHeader
        title="Warehouses"
        description="Manage your warehouse locations"
        addLabel="Add Warehouse"
        onAdd={() => {}}
        showSearch={false}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {warehouses.map((w, i) => (
          <div
            key={w.id}
            className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors cursor-pointer opacity-0 animate-fade-in"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-foreground">{w.name}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3" />
                  {w.location}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Products</p>
                <p className="text-lg font-bold text-foreground">{w.products}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Stock</p>
                <p className="text-lg font-bold text-foreground">{w.totalStock.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Capacity</p>
                <p className="text-lg font-bold text-foreground">{w.capacity}</p>
              </div>
            </div>
            <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: w.capacity }}
              />
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
};

export default Warehouses;
