import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Users,
  Briefcase,
  Star,
  TrendingUp,
  Download,
  Activity,
  MapPin,
  Layers,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";

const COLORS = ["#3b82f6", "#ec4899", "#f97316", "#8b5cf6", "#eab308", "#06b6d4", "#ef4444", "#10b981"];

export default function AdminAnalytics() {
  // Fetch overview stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-analytics-stats"],
    queryFn: async () => {
      const [users, providers, services, reviews] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).not("provider_status", "is", null),
        supabase.from("services").select("*", { count: "exact", head: true }),
        supabase.from("service_reviews").select("*", { count: "exact", head: true }),
      ]);

      return {
        totalUsers: users.count || 0,
        totalProviders: providers.count || 0,
        totalServices: services.count || 0,
        totalReviews: reviews.count || 0,
      };
    },
  });

  // Fetch user growth data (last 30 days)
  const { data: userGrowth } = useQuery({
    queryKey: ["admin-analytics-user-growth"],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30);
      const { data } = await supabase
        .from("profiles")
        .select("created_at")
        .gte("created_at", thirtyDaysAgo.toISOString());

      // Group by day
      const grouped: Record<string, number> = {};
      for (let i = 0; i < 30; i++) {
        const day = format(subDays(new Date(), i), "MMM d");
        grouped[day] = 0;
      }

      data?.forEach((profile) => {
        const day = format(new Date(profile.created_at), "MMM d");
        if (grouped[day] !== undefined) {
          grouped[day]++;
        }
      });

      return Object.entries(grouped)
        .map(([date, count]) => ({ date, users: count }))
        .reverse();
    },
  });

  // Fetch services by category
  const { data: servicesByCategory } = useQuery({
    queryKey: ["admin-analytics-services-category"],
    queryFn: async () => {
      const { data } = await supabase.from("services").select("category");

      const grouped: Record<string, number> = {};
      data?.forEach((service) => {
        grouped[service.category] = (grouped[service.category] || 0) + 1;
      });

      return Object.entries(grouped).map(([name, value]) => ({ name, value }));
    },
  });

  // Fetch services by city
  const { data: servicesByCity } = useQuery({
    queryKey: ["admin-analytics-services-city"],
    queryFn: async () => {
      const { data } = await supabase.from("services").select("city");

      const grouped: Record<string, number> = {};
      data?.forEach((service) => {
        const city = service.city || "Unknown";
        grouped[city] = (grouped[city] || 0) + 1;
      });

      return Object.entries(grouped)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    },
  });

  // Fetch provider status distribution
  const { data: providerStats } = useQuery({
    queryKey: ["admin-analytics-providers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("provider_status")
        .not("provider_status", "is", null);

      const grouped: Record<string, number> = {
        pending: 0,
        approved: 0,
        rejected: 0,
      };

      data?.forEach((profile) => {
        const status = profile.provider_status || "pending";
        grouped[status] = (grouped[status] || 0) + 1;
      });

      return Object.entries(grouped).map(([name, value]) => ({ name, value }));
    },
  });

  // Fetch top services by views
  const { data: topServices } = useQuery({
    queryKey: ["admin-analytics-top-services"],
    queryFn: async () => {
      const { data } = await supabase
        .from("services")
        .select("title, views_count, category")
        .order("views_count", { ascending: false })
        .limit(10);

      return data || [];
    },
  });

  const exportData = async (type: "users" | "services" | "providers") => {
    let data: Record<string, unknown>[] = [];
    let filename = "";

    if (type === "users") {
      const { data: profiles } = await supabase.from("profiles").select("*");
      data = profiles || [];
      filename = "users_export.csv";
    } else if (type === "services") {
      const { data: services } = await supabase.from("services").select("*");
      data = services || [];
      filename = "services_export.csv";
    } else if (type === "providers") {
      const { data: providers } = await supabase
        .from("profiles")
        .select("*")
        .not("provider_status", "is", null);
      data = providers || [];
      filename = "providers_export.csv";
    }

    if (data.length === 0) return;

    const headers = Object.keys(data[0]).join(",");
    const rows = data.map((row) =>
      Object.values(row)
        .map((v) => (typeof v === "string" ? `"${v.replace(/"/g, '""')}"` : v))
        .join(",")
    );
    const csv = [headers, ...rows].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Analytics</h1>
          <p className="text-muted-foreground">Platform statistics and insights</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportData("users")}>
            <Download className="h-4 w-4 mr-2" />
            Export Users
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportData("services")}>
            <Download className="h-4 w-4 mr-2" />
            Export Services
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportData("providers")}>
            <Download className="h-4 w-4 mr-2" />
            Export Providers
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-2xl font-bold">{stats?.totalUsers}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Providers</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-2xl font-bold">{stats?.totalProviders}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Services</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-2xl font-bold">{stats?.totalServices}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Reviews</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-2xl font-bold">{stats?.totalReviews}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* User Growth */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              User Growth (30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Services by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Services by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={servicesByCategory}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry) => entry.name}
                  >
                    {servicesByCategory?.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Services by City */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Services by City
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={servicesByCity} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Provider Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Provider Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={providerStats}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                  >
                    <Cell fill="#10b981" /> {/* approved - green */}
                    <Cell fill="#f59e0b" /> {/* pending - yellow */}
                    <Cell fill="#ef4444" /> {/* rejected - red */}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Services */}
      <Card>
        <CardHeader>
          <CardTitle>Top Services by Views</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topServices?.map((service, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium w-6">{index + 1}.</span>
                  <span className="font-medium">{service.title}</span>
                  <span className="text-sm text-muted-foreground">({service.category})</span>
                </div>
                <span className="font-medium">{service.views_count} views</span>
              </div>
            ))}
            {topServices?.length === 0 && (
              <p className="text-center text-muted-foreground py-4">No data available</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
