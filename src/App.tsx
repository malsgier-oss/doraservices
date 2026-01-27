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
import { lazyWithRetry } from "@/utils/lazyWithRetry";

const Hub = lazyWithRetry(() => import("./pages/Hub"));
const DealsBrowse = lazyWithRetry(() => import("./pages/buy-sell/DealsBrowse"));
const CreateListing = lazyWithRetry(() => import("./pages/buy-sell/CreateListing"));
const ListingsBrowse = lazyWithRetry(() => import("./pages/buy-sell/ListingsBrowse"));
const MyListings = lazyWithRetry(() => import("./pages/buy-sell/MyListings"));
const EditListing = lazyWithRetry(() => import("./pages/buy-sell/EditListing"));
const CategoryDetail = lazyWithRetry(() => import("./pages/buy-sell/CategoryDetail"));
const ListingDetailModal = lazyWithRetry(() => import("./pages/buy-sell/ListingDetailModal"));
const ListingDetailPage = lazyWithRetry(() => import("./pages/buy-sell/ListingDetailPage"));
const TrendingServicesPage = lazyWithRetry(() => import("./pages/services/TrendingServicesPage"));
const RecommendationsPage = lazyWithRetry(() => import("./pages/services/RecommendationsPage"));
const ServiceCategoryDetail = lazyWithRetry(() => import("./pages/services/ServiceCategoryDetail"));
const ServiceDetailPage = lazyWithRetry(() => import("./pages/services/ServiceDetailPage"));
const Favorites = lazyWithRetry(() => import("./pages/Favorites"));
const ServiceCreator = lazyWithRetry(() => import("./pages/ServiceCreator"));
const Profile = lazyWithRetry(() => import("./pages/Profile"), { retries: 3, delay: 800 });
const Auth = lazyWithRetry(() => import("./pages/Auth"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const ProviderDashboard = lazyWithRetry(() => import("./pages/ProviderDashboard"));
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
const ServiceEditor = lazyWithRetry(() => import("./pages/ServiceEditor"));
const PendingVerification = lazyWithRetry(() => import("./pages/PendingVerification"));
const PendingConfirmation = lazyWithRetry(() => import("./pages/PendingConfirmation"));
const ChangePassword = lazyWithRetry(() => import("./pages/ChangePassword"));
const ForgotPassword = lazyWithRetry(() => import("./pages/ForgotPassword"));
const Onboarding = lazyWithRetry(() => import("./pages/Onboarding"));

const AdminLayout = lazyWithRetry(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = lazyWithRetry(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazyWithRetry(() => import("./pages/admin/AdminUsers"));
const AdminReports = lazyWithRetry(() => import("./pages/admin/AdminReports"));
const AdminSettings = lazyWithRetry(() => import("./pages/admin/AdminSettings"));
const AdminMessages = lazyWithRetry(() => import("./pages/admin/AdminMessages"));
const AdminAuditLog = lazyWithRetry(() => import("./pages/admin/AdminAuditLog"));
const AdminProviders = lazyWithRetry(() => import("./pages/admin/AdminProviders"));
const AdminServices = lazyWithRetry(() => import("./pages/admin/AdminServices"));
const AdminDeals = lazyWithRetry(() => import("./pages/admin/AdminDeals"));
const AdminListings = lazyWithRetry(() => import("./pages/admin/AdminListings"));
const AdminCategories = lazyWithRetry(() => import("./pages/admin/AdminCategories"));
const AdminCities = lazyWithRetry(() => import("./pages/admin/AdminCities"));
const AdminAnalytics = lazyWithRetry(() => import("./pages/admin/AdminAnalytics"));
const AdminMedia = lazyWithRetry(() => import("./pages/admin/AdminMedia"));
const AdminBulkUpload = lazyWithRetry(() => import("./pages/admin/AdminBulkUpload"));
const AdminSubCities = lazyWithRetry(() => import("./pages/admin/AdminSubCities"));
const AdminPasswordResets = lazyWithRetry(() => import("./pages/admin/AdminPasswordResets"));
const AdminReviews = lazyWithRetry(() => import("./pages/admin/AdminReviews"));
const AdminAnnouncements = lazyWithRetry(() => import("./pages/admin/AdminAnnouncements"));

const SitePage = lazyWithRetry(() => import("./pages/SitePage"));
const AdminHubSuggestions = lazyWithRetry(() => import("./pages/admin/AdminHubSuggestions"));
const AdminHub = lazyWithRetry(() => import("./pages/admin/AdminHub"));
const AdminPages = lazyWithRetry(() => import("./pages/admin/AdminPages"));
const AdminGuides = lazyWithRetry(() => import("./pages/admin/AdminGuides"));

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
  const location = useLocation();
  // Safe typed access to backgroundLocation state for modal routing
  const state = location.state as { backgroundLocation?: typeof location } | null;
  const backgroundLocation = state?.backgroundLocation;

  return (
    <OnboardingGate>
      <React.Suspense fallback={<RouteFallback />}>
        {/* Normal routes - use backgroundLocation if modal is open */}
        <Routes location={backgroundLocation || location}>
        {/* Onboarding */}
        <Route path="/onboarding" element={<Onboarding />} />
        {/* Hub is public */}
        <Route path="/" element={<Navigate to="/services" replace />} />
        <Route path="/services" element={<Hub initialTab="services" />} />
        <Route path="/buy-sell" element={<Hub initialTab="buy-sell" />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/buy-sell/deals/:type" element={<DealsBrowse />} />
        <Route path="/buy-sell/category/:categoryId" element={<CategoryDetail />} />
        {/* Listing detail route for deep links (renders as standalone page) */}
        <Route path="/buy-sell/category/:categoryId/listing/:listingId" element={<ListingDetailModal />} />
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
        <Route path="/listings/:id" element={<ListingDetailPage />} />
        <Route path="/services/trending" element={<TrendingServicesPage />} />
        <Route path="/services/recommendations" element={<RecommendationsPage />} />
        <Route path="/services/category/:categoryId" element={<ServiceCategoryDetail />} />
        <Route path="/services/:id" element={<ServiceDetailPage />} />

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

        {/* These should require a logged-in user */}
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

        {/* ✅ Provider Dashboard should require APPROVED provider */}
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
          <Route path="deals" element={<AdminDeals />} />
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

        {/* Modal routes - render on top when backgroundLocation exists */}
        {backgroundLocation && (
          <Routes>
            <Route path="/buy-sell/category/:categoryId/listing/:listingId" element={<ListingDetailModal />} />
          </Routes>
        )}
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
