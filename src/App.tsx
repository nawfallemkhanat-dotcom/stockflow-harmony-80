import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/inventory/Products";
import Warehouses from "./pages/inventory/Warehouses";
import Movements from "./pages/inventory/Movements";
import Invoices from "./pages/billing/Invoices";
import InvoiceForm from "./pages/billing/InvoiceForm";
import PurchaseOrdersList from "./pages/purchases/PurchaseOrdersList";
import PurchaseOrderForm from "./pages/purchases/PurchaseOrderForm";
import SuppliersList from "./pages/purchases/SuppliersList";
import SalesOrdersList from "./pages/sales/SalesOrdersList";
import SalesOrderForm from "./pages/sales/SalesOrderForm";
import CustomersList from "./pages/sales/CustomersList";
import QuotesList from "./pages/billing/QuotesList";
import QuoteForm from "./pages/billing/QuoteForm";
import CreditNotesList from "./pages/billing/CreditNotesList";
import CreditNoteForm from "./pages/billing/CreditNoteForm";
import SettingsPage from "./pages/settings/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HashRouter>
        <AuthProvider>
          <WorkspaceProvider>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/inventory/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
              <Route path="/inventory/warehouses" element={<ProtectedRoute><Warehouses /></ProtectedRoute>} />
              <Route path="/inventory/movements" element={<ProtectedRoute><Movements /></ProtectedRoute>} />
              <Route path="/purchases/orders" element={<ProtectedRoute><PurchaseOrdersList /></ProtectedRoute>} />
              <Route path="/purchases/orders/:id" element={<ProtectedRoute><PurchaseOrderForm /></ProtectedRoute>} />
              <Route path="/purchases/suppliers" element={<ProtectedRoute><SuppliersList /></ProtectedRoute>} />
              <Route path="/sales/orders" element={<ProtectedRoute><SalesOrdersList /></ProtectedRoute>} />
              <Route path="/sales/orders/:id" element={<ProtectedRoute><SalesOrderForm /></ProtectedRoute>} />
              <Route path="/sales/customers" element={<ProtectedRoute><CustomersList /></ProtectedRoute>} />
              <Route path="/billing/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
              <Route path="/billing/invoices/:id" element={<ProtectedRoute><InvoiceForm /></ProtectedRoute>} />
              <Route path="/billing/quotes" element={<ProtectedRoute><QuotesList /></ProtectedRoute>} />
              <Route path="/billing/quotes/:id" element={<ProtectedRoute><QuoteForm /></ProtectedRoute>} />
              <Route path="/billing/credit-notes" element={<ProtectedRoute><CreditNotesList /></ProtectedRoute>} />
              <Route path="/billing/credit-notes/:id" element={<ProtectedRoute><CreditNoteForm /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </WorkspaceProvider>
        </AuthProvider>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
