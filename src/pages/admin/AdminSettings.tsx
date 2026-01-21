import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { usePlatformSettings, useSettingsMutations } from "@/hooks/useAdmin";
import { Skeleton } from "@/components/ui/skeleton";
import { Save } from "lucide-react";

export default function AdminSettings() {
  const { data: settings, isLoading } = usePlatformSettings();
  const { updateSetting } = useSettingsMutations();

  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handleSave = (key: string) => {
    updateSetting.mutate({ key, value: localSettings[key] ?? "" });
  };

  const handleToggle = (key: string) => {
    const newValue = localSettings[key] === "true" ? "false" : "true";
    setLocalSettings((prev) => ({ ...prev, [key]: newValue }));
    updateSetting.mutate({ key, value: newValue });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Platform Settings</h1>
        <p className="text-muted-foreground mt-1">Configure global platform settings</p>
      </div>

      {/* Toggle Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Toggles</CardTitle>
          <CardDescription>Enable or disable platform features</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Deal Publishing</Label>
              <p className="text-sm text-muted-foreground">
                Allow businesses to publish new deals
              </p>
            </div>
            <Switch
              checked={localSettings.deal_publishing_enabled === "true"}
              onCheckedChange={() => handleToggle("deal_publishing_enabled")}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-destructive">Deals Visibility (Kill Switch)</Label>
              <p className="text-sm text-muted-foreground">
                Show all deals to users (disable in emergency)
              </p>
            </div>
            <Switch
              checked={localSettings.deals_visible === "true"}
              onCheckedChange={() => handleToggle("deals_visible")}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Business Registration</Label>
              <p className="text-sm text-muted-foreground">
                Allow new business registrations
              </p>
            </div>
            <Switch
              checked={localSettings.business_registration_enabled === "true"}
              onCheckedChange={() => handleToggle("business_registration_enabled")}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Buy & Sell Marketplace</Label>
              <p className="text-sm text-muted-foreground">
                Enable marketplace features (deals, businesses) on Hub
              </p>
            </div>
            <Switch
              checked={localSettings.buy_sell_enabled === "true"}
              onCheckedChange={() => handleToggle("buy_sell_enabled")}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>User Registration</Label>
              <p className="text-sm text-muted-foreground">
                Allow new user signups
              </p>
            </div>
            <Switch
              checked={localSettings.user_registration_enabled === "true"}
              onCheckedChange={() => handleToggle("user_registration_enabled")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Hub (Home) Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Hub (Home) Settings</CardTitle>
          <CardDescription>Control what appears on the Hub (home) screen</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Featured Providers Section</Label>
              <p className="text-sm text-muted-foreground">Show / hide the featured providers section</p>
            </div>
            <Switch
              checked={(localSettings.hub_featured_enabled ?? "true") === "true"}
              onCheckedChange={() => handleToggle("hub_featured_enabled")}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Recent Services Section</Label>
              <p className="text-sm text-muted-foreground">Show / hide the recently added services section</p>
            </div>
            <Switch
              checked={(localSettings.hub_recent_enabled ?? "true") === "true"}
              onCheckedChange={() => handleToggle("hub_recent_enabled")}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Suggestion Chips</Label>
              <p className="text-sm text-muted-foreground">Show / hide the suggestion chips under the header</p>
            </div>
            <Switch
              checked={(localSettings.hub_suggestions_enabled ?? "true") === "true"}
              onCheckedChange={() => handleToggle("hub_suggestions_enabled")}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hub-featured-limit">Featured Providers Limit</Label>
              <div className="flex gap-2">
                <Input
                  id="hub-featured-limit"
                  type="number"
                  value={localSettings.hub_featured_limit || "10"}
                  onChange={(e) =>
                    setLocalSettings((prev) => ({ ...prev, hub_featured_limit: e.target.value }))
                  }
                />
                <Button
                  size="icon"
                  onClick={() => handleSave("hub_featured_limit")}
                  disabled={updateSetting.isPending}
                >
                  <Save className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hub-recent-limit">Recent Services Limit</Label>
              <div className="flex gap-2">
                <Input
                  id="hub-recent-limit"
                  type="number"
                  value={localSettings.hub_recent_limit || "10"}
                  onChange={(e) => setLocalSettings((prev) => ({ ...prev, hub_recent_limit: e.target.value }))}
                />
                <Button
                  size="icon"
                  onClick={() => handleSave("hub_recent_limit")}
                  disabled={updateSetting.isPending}
                >
                  <Save className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hub-suggestions-json">Suggestion Chips JSON (Advanced)</Label>
            <p className="text-sm text-muted-foreground">
              Optional. If empty, Hub uses the default built-in chips. Format: array of items with title_en,
              title_ar, subcategory_match, and optional icon_name.
            </p>
            <Textarea
              id="hub-suggestions-json"
              value={localSettings.hub_suggestions_json || ""}
              onChange={(e) => setLocalSettings((prev) => ({ ...prev, hub_suggestions_json: e.target.value }))}
              placeholder={`[\n  {\n    "title_en": "Fix AC",\n    "title_ar": "تصليح مكيف",\n    "subcategory_match": ["ac", "تكييف"],\n    "icon_name": "Wind"\n  }\n]`}
              className="min-h-[140px]"
            />
            <div className="flex justify-end">
              <Button
                onClick={() => handleSave("hub_suggestions_json")}
                disabled={updateSetting.isPending}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                Save Suggestions
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Numeric Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Deal Limits</CardTitle>
          <CardDescription>Configure deal-related limits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="max-deals">Max Deals per Business</Label>
              <div className="flex gap-2">
                <Input
                  id="max-deals"
                  type="number"
                  value={localSettings.max_deals_per_business || "10"}
                  onChange={(e) => setLocalSettings((prev) => ({ ...prev, max_deals_per_business: e.target.value }))}
                />
                <Button
                  size="icon"
                  onClick={() => handleSave("max_deals_per_business")}
                  disabled={updateSetting.isPending}
                >
                  <Save className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="min-duration">Min Deal Duration (days)</Label>
              <div className="flex gap-2">
                <Input
                  id="min-duration"
                  type="number"
                  value={localSettings.min_deal_duration_days || "1"}
                  onChange={(e) => setLocalSettings((prev) => ({ ...prev, min_deal_duration_days: e.target.value }))}
                />
                <Button
                  size="icon"
                  onClick={() => handleSave("min_deal_duration_days")}
                  disabled={updateSetting.isPending}
                >
                  <Save className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-duration">Max Deal Duration (days)</Label>
              <div className="flex gap-2">
                <Input
                  id="max-duration"
                  type="number"
                  value={localSettings.max_deal_duration_days || "90"}
                  onChange={(e) => setLocalSettings((prev) => ({ ...prev, max_deal_duration_days: e.target.value }))}
                />
                <Button
                  size="icon"
                  onClick={() => handleSave("max_deal_duration_days")}
                  disabled={updateSetting.isPending}
                >
                  <Save className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
