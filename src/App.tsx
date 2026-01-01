import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import Hub from "./pages/Hub";
import Favorites from "./pages/Favorites";
import ServiceCreator from "./pages/ServiceCreator";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import ProviderDashboard from "./pages/ProviderDashboard";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";


import AdminReports from "./pages/admin/AdminReports";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminMessages from "./pages/admin/AdminMessages";
import AdminAuditLog from "./pages/admin/AdminAuditLog";
import AdminProviders from "./pages/admin/AdminProviders";
import AdminServices from "./pages/admin/AdminServices";
import AdminReviews from "./pages/admin/AdminReviews";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminCities from "./pages/admin/AdminCities";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminMedia from "./pages/admin/AdminMedia";
import AdminBulkUpload from "./pages/admin/AdminBulkUpload";
import AdminSubCities from "./pages/admin/AdminSubCities";

const queryClient = new QueryClient();

function AuthenticatedRedirect({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

const AppRoutes = () => {
  return (
    <Routes>
      {/* Hub is now public - no auth required to browse */}
      <Route path="/" element={<Hub />} />
      
      {/* Protected routes - require login */}
      <Route
        path="/favorites"
        element={
          <ProtectedRoute>
            <Favorites />
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-service"
        element={
          <ProtectedRoute>
            <ServiceCreator />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/provider-dashboard"
        element={
          <ProtectedRoute>
            <ProviderDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/auth"
        element={
          <AuthenticatedRedirect>
            <Auth />
          </AuthenticatedRedirect>
        }
      />
      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="providers" element={<AdminProviders />} />
        <Route path="services" element={<AdminServices />} />
        
        <Route path="reviews" element={<AdminReviews />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="cities" element={<AdminCities />} />
        <Route path="sub-cities" element={<AdminSubCities />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="messages" element={<AdminMessages />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="media" element={<AdminMedia />} />
        <Route path="bulk-upload" element={<AdminBulkUpload />} />
        <Route path="audit-log" element={<AdminAuditLog />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;