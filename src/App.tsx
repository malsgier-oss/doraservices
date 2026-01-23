import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/components/theme-provider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { ProviderRoute } from "@/components/auth/ProviderRoute";
import { AppErrorBoundary } from "@/components/layout/AppErrorBoundary";
import { FullScreenFallback } from "@/components/layout/FullScreenFallback";
import { RouteAnalytics } from "@/observability/RouteAnalytics";

import { ONBOARDING_DONE_KEY } from "./pages/onboardingKeys";

const Hub = React.lazy(() => import("./pages/Hub"));
const CreateListing = React.lazy(() => import("./pages/buy-sell/CreateListing"));
const ListingsBrowse = React.lazy(() => import("./pages/buy-sell/ListingsBrowse"));
const MyListings = React.lazy(() => import("./pages/buy-sell/MyListings"));
const EditListing = React.lazy(() => import("./pages/buy-sell/EditListing"));
const TrendingServicesPage = React.lazy(() => import("./pages/services/TrendingServicesPage"));
const RecommendationsPage = React.lazy(() => import("./pages/services/RecommendationsPage"));
const Favorites = React.lazy(() => import("./pages/Favorites"));
const ServiceCreator = React.lazy(() => import("./pages/ServiceCreator"));
const Profile = React.lazy(() => import("./pages/Profile"));
const Auth = React.lazy(() => import("./pages/Auth"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const ProviderDashboard = React.lazy(() => import("./pages/ProviderDashboard"));
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const ServiceEditor = React.lazy(() => import("./pages/ServiceEditor"));
const PendingVerification = React.lazy(() => import("./pages/PendingVerification"));
const PendingConfirmation = React.lazy(() => import("./pages/PendingConfirmation"));
const ChangePassword = React.lazy(() => import("./pages/ChangePassword"));
const ForgotPassword = React.lazy(() => import("./pages/ForgotPassword"));
const Onboarding = React.lazy(() => import("./pages/Onboarding"));

const AdminLayout = React.lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = React.lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = React.lazy(() => import("./pages/admin/AdminUsers"));
const AdminReports = React.lazy(() => import("./pages/admin/AdminReports"));
const AdminSettings = React.lazy(() => import("./pages/admin/AdminSettings"));
const AdminMessages = React.lazy(() => import("./pages/admin/AdminMessages"));
const AdminAuditLog = React.lazy(() => import("./pages/admin/AdminAuditLog"));
const AdminProviders = React.lazy(() => import("./pages/admin/AdminProviders"));
const AdminServices = React.lazy(() => import("./pages/admin/AdminServices"));
const AdminListings = React.lazy(() => import("./pages/admin/AdminListings"));
const AdminCategories = React.lazy(() => import("./pages/admin/AdminCategories"));
const AdminCities = React.lazy(() => import("./pages/admin/AdminCities"));
const AdminAnalytics = React.lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminMedia = React.lazy(() => import("./pages/admin/AdminMedia"));
const AdminBulkUpload = React.lazy(() => import("./pages/admin/AdminBulkUpload"));
const AdminSubCities = React.lazy(() => import("./pages/admin/AdminSubCities"));
const AdminPasswordResets = React.lazy(() => import("./pages/admin/AdminPasswordResets"));
const AdminReviews = React.lazy(() => import("./pages/admin/AdminReviews"));
const AdminAnnouncements = React.lazy(() => import("./pages/admin/AdminAnnouncements"));

const SitePage = React.lazy(() => import("./pages/SitePage"));
const AdminHubSuggestions = React.lazy(() => import("./pages/admin/AdminHubSuggestions"));
const AdminHub = React.lazy(() => import("./pages/admin/AdminHub"));
const AdminPages = React.lazy(() => import("./pages/admin/AdminPages"));
const AdminGuides = React.lazy(() => import("./pages/admin/AdminGuides"));

const PendingRatingPrompt = React.lazy(() =>
  import("@/components/service/PendingRatingPrompt").then((m) => ({ default: m.PendingRatingPrompt })),
);

// ✅ keep QueryClient stable (and reduce refetch “loading” flashes)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

function RouteFallback() {
  return <FullScreenFallback variant="page" />;
}

/**
 * If user is logged in, redirect them away from /auth to the right place.
 */
function AuthenticatedRedirect({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, profileLoading } = useAuth();

  if (loading || profileLoading) {
    return <FullScreenFallback variant="auth" />;
  }

  if (user) {
    // Logged in but profile not loaded — still redirect away from /auth
    if (!profile) return <Navigate to="/" replace />;

    // Dora P0: browsing and calling should not be blocked by any "verification" flag.
    // Provider approval is enforced only on provider/admin-only routes.
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

/**
 * App-first onboarding gate (first open only).
 *
 * - Shows /onboarding only once (localStorage flag)
 * - Never blocks auth flows or special routes
 */
function OnboardingGate({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    const path = location.pathname;
    const allow =
      path === "/onboarding" ||
      path === "/auth" ||
      path === "/forgot-password" ||
      path === "/change-password" ||
      path === "/pending-confirmation" ||
      path === "/pending-verification" ||
      path.startsWith("/admin");

    if (allow) return;

    let done = false;
    try {
      done = localStorage.getItem(ONBOARDING_DONE_KEY) === "1";
    } catch {
      done = true; // if storage is blocked, don't trap users
    }

    if (!done) {
      navigate("/onboarding", { replace: true });
    }
  }, [location.pathname, navigate]);

  return <>{children}</>;
}

const AppRoutes = () => {
  return (
    <OnboardingGate>
      <React.Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Onboarding */}
          <Route path="/onboarding" element={<Onboarding />} />

          {/* Hub is public */}
          <Route path="/" element={<Hub />} />

          {/* Core signed-in experiences */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Buy & Sell (Listings only — no stores/businesses/deals) */}
          <Route path="/buy-sell/listings" element={<ListingsBrowse />} />
          <Route path="/buy-sell/create-listing" element={<CreateListing />} />
          <Route
            path="/buy-sell/my-listings"
            element={
              <ProtectedRoute>
                <MyListings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/buy-sell/edit-listing/:id"
            element={
              <ProtectedRoute>
                <EditListing />
              </ProtectedRoute>
            }
          />

          {/* Services */}
          <Route path="/services/trending" element={<TrendingServicesPage />} />
          <Route path="/services/recommendations" element={<RecommendationsPage />} />

          {/* Public site pages */}
          <Route path="/:slug(about|contact|help|become-provider|terms|privacy)" element={<SitePage />} />

          {/* Auth routes */}
          <Route
            path="/auth"
            element={
              <AuthenticatedRedirect>
                <Auth />
              </AuthenticatedRedirect>
            }
          />
          <Route path="/pending-confirmation" element={<PendingConfirmation />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route
            path="/pending-verification"
            element={
              <ProtectedRoute>
                <PendingVerification />
              </ProtectedRoute>
            }
          />
          <Route
            path="/change-password"
            element={
              <ProtectedRoute>
                <ChangePassword />
              </ProtectedRoute>
            }
          />

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
              <ProviderRoute>
                <ServiceCreator />
              </ProviderRoute>
            }
          />
          <Route
            path="/edit-service/:id"
            element={
              <ProviderRoute>
                <ServiceEditor />
              </ProviderRoute>
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

          {/* Provider Dashboard should require approved provider */}
          <Route
            path="/provider-dashboard"
            element={
              <ProviderRoute>
                <ProviderDashboard />
              </ProviderRoute>
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
            <Route path="listings" element={<AdminListings />} />
            <Route path="hub" element={<AdminHub />} />
            <Route path="hub-suggestions" element={<AdminHubSuggestions />} />
            <Route path="guides" element={<AdminGuides />} />
            <Route path="pages" element={<AdminPages />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="cities" element={<AdminCities />} />
            <Route path="sub-cities" element={<AdminSubCities />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="announcements" element={<AdminAnnouncements />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="messages" element={<AdminMessages />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="media" element={<AdminMedia />} />
            <Route path="bulk-upload" element={<AdminBulkUpload />} />
            <Route path="audit-log" element={<AdminAuditLog />} />
            <Route path="password-resets" element={<AdminPasswordResets />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </React.Suspense>
    </OnboardingGate>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LanguageProvider>
        <ThemeProvider>
          <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppErrorBoundary>
              <AppRoutes />
              <RouteAnalytics />
              <React.Suspense fallback={null}>
                <PendingRatingPrompt />
              </React.Suspense>
            </AppErrorBoundary>
          </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
