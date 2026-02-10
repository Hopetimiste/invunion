import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Onboarding from "./pages/Onboarding";
import Settings from "./pages/Settings";
import Transactions from "./pages/Transactions";
import CryptoTransactions from "./pages/CryptoTransactions";
import InvoicesIssued from "./pages/InvoicesIssued";
import InvoicesReceived from "./pages/InvoicesReceived";
import AdminDashboard from "./pages/AdminDashboard";
import AdminTenants from "./pages/AdminTenants";
import AdminLogs from "./pages/AdminLogs";
import AdminSettings from "./pages/AdminSettings";
import AdminConfiguration from "./pages/AdminConfiguration";
import NotFound from "./pages/NotFound";
import AccountSettings from "./pages/settings/AccountSettings";
import UserSettings from "./pages/settings/UserSettings";
import TechnicalSettings from "./pages/settings/TechnicalSettings";
import Support from "./pages/Support";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
            {/* Public routes */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            {/* Protected app routes */}
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/onboarding"
              element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/transactions"
              element={
                <ProtectedRoute>
                  <Transactions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/crypto-transactions"
              element={
                <ProtectedRoute>
                  <CryptoTransactions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/invoices-issued"
              element={
                <ProtectedRoute>
                  <InvoicesIssued />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/invoices-received"
              element={
                <ProtectedRoute>
                  <InvoicesReceived />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            
            {/* Settings sub-routes */}
            <Route
              path="/app/settings/account"
              element={
                <ProtectedRoute>
                  <AccountSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/settings/account/*"
              element={
                <ProtectedRoute>
                  <AccountSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/settings/user"
              element={
                <ProtectedRoute>
                  <UserSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/settings/user/*"
              element={
                <ProtectedRoute>
                  <UserSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/settings/technical"
              element={
                <ProtectedRoute>
                  <TechnicalSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/settings/technical/*"
              element={
                <ProtectedRoute>
                  <TechnicalSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/support"
              element={
                <ProtectedRoute>
                  <Support />
                </ProtectedRoute>
              }
            />
            
            {/* Admin routes */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/tenants"
              element={
                <AdminRoute>
                  <AdminTenants />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/logs"
              element={
                <AdminRoute>
                  <AdminLogs />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <AdminRoute>
                  <AdminSettings />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/configuration"
              element={
                <AdminRoute>
                  <AdminConfiguration />
                </AdminRoute>
              }
            />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </LanguageProvider>
  </QueryClientProvider>
);

export default App;
// Production ready: using api.invunion.com - Thu Feb  6 2026