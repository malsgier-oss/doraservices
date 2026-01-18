import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlatformSettings, useSettingsMutations } from "@/hooks/useAdmin";

/**
 * Dora admin settings (intentionally minimal).
 * Platform-wide controls that are actually used in the app should live here.
 */
export default function AdminSettings() {
  const { data: settings, isLoading } = usePlatformSettings();
  const { updateSetting } = useSettingsMutations();

  const toggle = (key: string, current: boolean) => {
    updateSetting.mutate({ key, value: !current });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const providerRegEnabled = Boolean(settings?.business_registration_enabled ?? true);
  const userRegEnabled = Boolean(settings?.user_registration_enabled ?? true);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Platform Settings</h1>
        <p className="text-muted-foreground mt-1">Global toggles (kept small on purpose)</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registration</CardTitle>
          <CardDescription>Enable/disable new signups</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="provider-registration">Provider Registration</Label>
              <p className="text-sm text-muted-foreground">Allow new providers to apply</p>
            </div>
            <Switch
              id="provider-registration"
              checked={providerRegEnabled}
              onCheckedChange={() => toggle("business_registration_enabled", providerRegEnabled)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="user-registration">User Registration</Label>
              <p className="text-sm text-muted-foreground">Allow new user signups</p>
            </div>
            <Switch
              id="user-registration"
              checked={userRegEnabled}
              onCheckedChange={() => toggle("user_registration_enabled", userRegEnabled)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
