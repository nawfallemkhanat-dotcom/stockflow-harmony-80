import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
              <Route path="/purchases/orders" element={<ProtectedRoute><PurchaseOrders /></ProtectedRoute>} />
              <Route path="/purchases/suppliers" element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
              <Route path="/sales/orders" element={<ProtectedRoute><SalesOrders /></ProtectedRoute>} />
              <Route path="/sales/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
              <Route path="/billing/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
              <Route path="/billing/quotes" element={<ProtectedRoute><Quotes /></ProtectedRoute>} />
              <Route path="/billing/credit-notes" element={<ProtectedRoute><CreditNotes /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </WorkspaceProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
