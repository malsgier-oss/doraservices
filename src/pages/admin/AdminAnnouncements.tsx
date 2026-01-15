import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type CityRow = { id: string; name: string; name_ar?: string | null };

type AnnouncementRow = {
  id: string;
  title: string;
  message: string;
  city_id: string | null;
  priority: number;
  is_active: boolean;
  start_at: string | null;
  end_at: string | null;
  created_at?: string;
};

const toDatetimeLocal = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fromDatetimeLocal = (v: string) => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
};

export default function AdminAnnouncements() {
  const [cities, setCities] = useState<CityRow[]>([]);
  const [rows, setRows] = useState<AnnouncementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<Partial<AnnouncementRow>>({
    title: "",
    message: "",
    city_id: null,
    priority: 0,
    is_active: true,
    start_at: null,
    end_at: null,
  });

  const cityOptions = useMemo(() => {
    const sorted = [...cities].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    return [{ id: "__global__", name: "Global", name_ar: "عام" }, ...sorted] as any[];
  }, [cities]);

  const load = async () => {
    setLoading(true);
    const [citiesRes, annRes] = await Promise.all([
      supabase.from("cities").select("id,name,name_ar").order("name", { ascending: true }),
      supabase.from("announcements").select("*").order("priority", { ascending: false }).order("created_at", { ascending: false }),
    ]);

    if (citiesRes.error) toast.error(citiesRes.error.message);
    if (annRes.error) toast.error(annRes.error.message);

    setCities((citiesRes.data || []) as any);
    setRows((annRes.data || []) as any);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm({
      title: "",
      message: "",
      city_id: null,
      priority: 0,
      is_active: true,
      start_at: null,
      end_at: null,
    });
  };

  const upsert = async () => {
    if (!form.title?.trim() || !form.message?.trim()) {
      toast.error("Title and message are required");
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        id: form.id,
        title: form.title.trim(),
        message: form.message.trim(),
        city_id: form.city_id || null,
        priority: Number(form.priority || 0),
        is_active: Boolean(form.is_active),
        start_at: form.start_at || null,
        end_at: form.end_at || null,
      };

      const { error } = await supabase.from("announcements").upsert(payload);
      if (error) throw error;

      toast.success(form.id ? "Announcement updated" : "Announcement created");
      resetForm();
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      load();
    }
  };

  const startEdit = (r: AnnouncementRow) => {
    setForm({
      id: r.id,
      title: r.title,
      message: r.message,
      city_id: r.city_id,
      priority: r.priority,
      is_active: r.is_active,
      start_at: r.start_at,
      end_at: r.end_at,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Hub Announcements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={form.title || ""}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Short headline"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Message</label>
              <Textarea
                value={form.message || ""}
                onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                placeholder="1–2 lines max"
              />
            </div>

            <div className="grid md:grid-cols-3 gap-3">
              <div className="grid gap-2">
                <label className="text-sm font-medium">City</label>
                <Select
                  value={form.city_id ?? "__global__"}
                  onValueChange={(v) => setForm((p) => ({ ...p, city_id: v === "__global__" ? null : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    {cityOptions.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.id === "__global__" ? "Global" : c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Priority</label>
                <Input
                  type="number"
                  value={String(form.priority ?? 0)}
                  onChange={(e) => setForm((p) => ({ ...p, priority: Number(e.target.value) }))}
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Active</label>
                <div className="h-10 flex items-center">
                  <Switch checked={Boolean(form.is_active)} onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))} />
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Start at (optional)</label>
                <Input
                  type="datetime-local"
                  value={toDatetimeLocal(form.start_at ?? null)}
                  onChange={(e) => setForm((p) => ({ ...p, start_at: fromDatetimeLocal(e.target.value) }))}
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">End at (optional)</label>
                <Input
                  type="datetime-local"
                  value={toDatetimeLocal(form.end_at ?? null)}
                  onChange={(e) => setForm((p) => ({ ...p, end_at: fromDatetimeLocal(e.target.value) }))}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={upsert} disabled={saving}>
                {saving ? "Saving..." : form.id ? "Update" : "Create"}
              </Button>
              {form.id && (
                <Button variant="secondary" onClick={resetForm} disabled={saving}>
                  Cancel edit
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Announcements</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">No announcements.</div>
          ) : (
            <div className="space-y-3">
              {rows.map((r) => (
                <div key={r.id} className="rounded-2xl border border-border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{r.title}</div>
                      <div className="text-sm text-muted-foreground">{r.message}</div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        City: {r.city_id ? r.city_id : "Global"} • Priority: {r.priority} • {r.is_active ? "Active" : "Inactive"}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => startEdit(r)}>
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => remove(r.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
