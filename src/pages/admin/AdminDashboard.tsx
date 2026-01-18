import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Users, Store, Eye, Phone, MessageCircle, AlertTriangle, ShieldAlert, Clock } from "lucide-react";
import { useAdminStats, usePlatformSettings, useSettingsMutations } from "@/hooks/useAdmin";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: settings, isLoading: settingsLoading } = usePlatformSettings();
  const { updateSetting } = useSettingsMutations();

  const handleToggle = (key: string, currentValue: boolean) => {
    updateSetting.mutate({ key, value: !currentValue });
  };

  const statCards = [
    { label: "Total Users", value: stats?.totalUsers || 0, icon: Users, color: "text-primary" },
    { label: "Pending Providers", value: stats?.pendingProviders || 0, icon: Clock, color: "text-yellow-500" },
    { label: "Total Services", value: stats?.totalServices || 0, icon: Store, color: "text-accent" },
    { label: "Pending Services", value: stats?.pendingServices || 0, icon: Clock, color: "text-yellow-500" },
    { label: "Total Views", value: stats?.totalViews || 0, icon: Eye, color: "text-primary" },
    { label: "Calls", value: stats?.totalCalls || 0, icon: Phone, color: "text-primary" },
    { label: "WhatsApp", value: stats?.totalWhatsapps || 0, icon: MessageCircle, color: "text-primary" },
    { label: "Pending Reports", value: stats?.pendingReports || 0, icon: AlertTriangle, color: "text-yellow-500" },
    { label: "Suspended Users", value: stats?.suspendedProfiles || 0, icon: ShieldAlert, color: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of platform activity and quick controls</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{stat.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Controls</CardTitle>
          <CardDescription>Quick toggles for platform-wide settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {settingsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="provider-registration">Provider Registration</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow new providers to apply
                  </p>
                </div>
                <Switch
                  id="provider-registration"
                  checked={Boolean(settings?.business_registration_enabled ?? true)}
                  onCheckedChange={() => handleToggle("business_registration_enabled", Boolean(settings?.business_registration_enabled ?? true))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="user-registration">User Registration</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow new user signups
                  </p>
                </div>
                <Switch
                  id="user-registration"
                  checked={Boolean(settings?.user_registration_enabled ?? true)}
                  onCheckedChange={() => handleToggle("user_registration_enabled", Boolean(settings?.user_registration_enabled ?? true))}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
