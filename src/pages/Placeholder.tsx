import AppLayout from "@/components/layout/AppLayout";

const ComingSoon = ({ title }: { title: string }) => (
  <AppLayout>
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      <p className="text-muted-foreground mt-2">This module is coming soon.</p>
    </div>
  </AppLayout>
);

export const PurchaseOrders = () => <ComingSoon title="Purchase Orders" />;
export const Suppliers = () => <ComingSoon title="Suppliers" />;
export const SalesOrders = () => <ComingSoon title="Sales Orders" />;
export const Customers = () => <ComingSoon title="Customers" />;
export const Quotes = () => <ComingSoon title="Quotes" />;
export const CreditNotes = () => <ComingSoon title="Credit Notes" />;
export const SettingsPage = () => <ComingSoon title="Settings" />;
