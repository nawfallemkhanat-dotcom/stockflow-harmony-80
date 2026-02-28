import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/inventory/Products";
import Warehouses from "./pages/inventory/Warehouses";
import Movements from "./pages/inventory/Movements";
import Invoices from "./pages/billing/Invoices";
import {
  PurchaseOrders,
  Suppliers,
  SalesOrders,
  Customers,
  Quotes,
  CreditNotes,
  SettingsPage,
} from "./pages/Placeholder";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/inventory/products" element={<Products />} />
          <Route path="/inventory/warehouses" element={<Warehouses />} />
          <Route path="/inventory/movements" element={<Movements />} />
          <Route path="/purchases/orders" element={<PurchaseOrders />} />
          <Route path="/purchases/suppliers" element={<Suppliers />} />
          <Route path="/sales/orders" element={<SalesOrders />} />
          <Route path="/sales/customers" element={<Customers />} />
          <Route path="/billing/invoices" element={<Invoices />} />
          <Route path="/billing/quotes" element={<Quotes />} />
          <Route path="/billing/credit-notes" element={<CreditNotes />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
