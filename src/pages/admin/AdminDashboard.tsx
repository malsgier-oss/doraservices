import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Users, Tag, AlertTriangle, ShieldAlert, UserCheck, Store, KeyRound } from "lucide-react";
import { useAdminStats, usePlatformSettings, useSettingsMutations } from "@/hooks/useAdmin";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: settings, isLoading: settingsLoading } = usePlatformSettings();
  const { updateSetting } = useSettingsMutations();

  const handleToggle = (key: string, currentValue: string) => {
    const newValue = currentValue === "true" ? "false" : "true";
    updateSetting.mutate({ key, value: newValue });
  };

  const statCards = [
    { label: "Total Users", value: stats?.totalUsers || 0, icon: Users, color: "text-primary", to: "/admin/users" },
    { label: "Active Deals", value: stats?.activeDeals || 0, icon: Tag, color: "text-primary", to: "/admin/deals?status=active" },
    { label: "Suspended Users", value: stats?.suspendedProfiles || 0, icon: ShieldAlert, color: "text-destructive", to: "/admin/users?status=suspended" },
    { label: "Pending Reports", value: stats?.pendingReports || 0, icon: AlertTriangle, color: "text-yellow-500", to: "/admin/reports?status=pending" },
    { label: "Pending Providers", value: stats?.pendingProviders ?? 0, icon: UserCheck, color: "text-amber-500", to: "/admin/providers?providerStatus=pending" },
    { label: "Pending Services", value: stats?.pendingServices ?? 0, icon: Store, color: "text-amber-500", to: "/admin/services?approval=pending" },
    { label: "Pending Password Resets", value: stats?.pendingPasswordResets ?? 0, icon: KeyRound, color: "text-amber-500", to: "/admin/password-resets" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of platform activity and quick controls</p>
      </div>

      {/* Stats Grid — each card links to the relevant admin page */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link key={stat.label} to={stat.to} className="block">
            <Card className="transition-colors hover:bg-muted/50 h-full">
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
          </Link>
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
                  <Label htmlFor="deal-publishing">Deal Publishing</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow new deals to be published
                  </p>
                </div>
                <Switch
                  id="deal-publishing"
                  checked={settings?.deal_publishing_enabled === "true"}
                  onCheckedChange={() => handleToggle("deal_publishing_enabled", settings?.deal_publishing_enabled || "true")}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="deals-visible" className="text-destructive font-semibold">
                    Emergency Kill Switch
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Hide all deals from the platform (emergency use only)
                  </p>
                </div>
                <Switch
                  id="deals-visible"
                  checked={settings?.deals_visible === "true"}
                  onCheckedChange={() => handleToggle("deals_visible", settings?.deals_visible || "true")}
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
                  checked={settings?.user_registration_enabled === "true"}
                  onCheckedChange={() => handleToggle("user_registration_enabled", settings?.user_registration_enabled || "true")}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
