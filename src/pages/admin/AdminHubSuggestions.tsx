import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

type HubSuggestion = {
  id: string;
  type: "city" | "chip";
  label_en: string | null;
  label_ar: string | null;
  display_order: number | null;
  is_active: boolean | null;
  city_key: string | null;
  action_type: "category" | "subcategory" | "search" | null;
  action_value: string | null;
};

export default function AdminHubSuggestions() {
  const { toast } = useToast();
  const { language, isRTL } = useLanguage();
  const [rows, setRows] = useState<HubSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  const [newType, setNewType] = useState<"city" | "chip">("city");
  const [newLabelEn, setNewLabelEn] = useState("");
  const [newLabelAr, setNewLabelAr] = useState("");
  const [newCityKey, setNewCityKey] = useState("");
  const [newActionType, setNewActionType] = useState<"category" | "subcategory" | "search">("search");
  const [newActionValue, setNewActionValue] = useState("");

  const cities = useMemo(() => rows.filter(r => r.type === "city").sort((a,b)=> (a.display_order??0)-(b.display_order??0)), [rows]);
  const chips = useMemo(() => rows.filter(r => r.type === "chip").sort((a,b)=> (a.display_order??0)-(b.display_order??0)), [rows]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("hub_suggestions")
      .select("id,type,label_en,label_ar,display_order,is_active,city_key,action_type,action_value")
      .order("type", { ascending: true })
      .order("display_order", { ascending: true });

    if (error) {
      toast({ title: "Failed to load", description: error.message, variant: "destructive" });
      setRows([]);
    } else {
      setRows((data as any) ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleActive(id: string, is_active: boolean) {
    const { error } = await supabase.from("hub_suggestions").update({ is_active }).eq("id", id);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    else setRows(prev => prev.map(r => r.id === id ? { ...r, is_active } : r));
  }

  async function updateOrder(id: string, display_order: number) {
    const { error } = await supabase.from("hub_suggestions").update({ display_order }).eq("id", id);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    else setRows(prev => prev.map(r => r.id === id ? { ...r, display_order } : r));
  }

  async function remove(id: string) {
    const { error } = await supabase.from("hub_suggestions").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else setRows(prev => prev.filter(r => r.id !== id));
  }

  async function add() {
    const payload: any = {
      type: newType,
      label_en: newLabelEn || null,
      label_ar: newLabelAr || null,
      display_order: 0,
      is_active: true,
    };
    if (newType === "city") {
      payload.city_key = newCityKey || null;
    } else {
      payload.action_type = newActionType;
      payload.action_value = newActionValue || null;
    }
    const { error } = await supabase.from("hub_suggestions").insert(payload);
    if (error) toast({ title: "Add failed", description: error.message, variant: "destructive" });
    else {
      setNewLabelEn(""); setNewLabelAr(""); setNewCityKey(""); setNewActionValue("");
      toast({ title: "Saved" });
      load();
    }
  }

  const sectionTitle = (t: "city" | "chip") => language === "ar"
    ? (t === "city" ? "اقتراحات المدن" : "شرائح الاقتراحات")
    : (t === "city" ? "City Suggestions" : "Suggestion Chips");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className={isRTL ? "text-right" : "text-left"}>
            {language === "ar" ? "إدارة اقتراحات الصفحة الرئيسية" : "Manage Hub Suggestions"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-sm font-medium">{language === "ar" ? "النوع" : "Type"}</div>
              <Select value={newType} onValueChange={(v:any)=> setNewType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="city">{language === "ar" ? "مدينة" : "City"}</SelectItem>
                  <SelectItem value="chip">{language === "ar" ? "شريحة" : "Chip"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">{language === "ar" ? "الترتيب (0 = الأعلى)" : "Order (0 = top)"}</div>
              <div className="text-xs text-muted-foreground">{language === "ar" ? "يمكنك تعديل ترتيب كل عنصر من القائمة أدناه" : "Edit each item order in the lists below"}</div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">{language === "ar" ? "الاسم (EN)" : "Label (EN)"}</div>
              <Input value={newLabelEn} onChange={(e)=>setNewLabelEn(e.target.value)} placeholder="Tripoli" />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">{language === "ar" ? "الاسم (AR)" : "Label (AR)"}</div>
              <Input value={newLabelAr} onChange={(e)=>setNewLabelAr(e.target.value)} placeholder="طرابلس" />
            </div>

            {newType === "city" ? (
              <div className="space-y-2 md:col-span-2">
                <div className="text-sm font-medium">{language === "ar" ? "City Key (اختياري)" : "City Key (optional)"}</div>
                <Input value={newCityKey} onChange={(e)=>setNewCityKey(e.target.value)} placeholder="tripoli" />
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 md:col-span-2">
                <div className="space-y-2">
                  <div className="text-sm font-medium">{language === "ar" ? "نوع الإجراء" : "Action type"}</div>
                  <Select value={newActionType} onValueChange={(v:any)=> setNewActionType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="search">{language === "ar" ? "بحث" : "Search"}</SelectItem>
                      <SelectItem value="category">{language === "ar" ? "تصنيف" : "Category"}</SelectItem>
                      <SelectItem value="subcategory">{language === "ar" ? "تصنيف فرعي" : "Subcategory"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">{language === "ar" ? "قيمة الإجراء" : "Action value"}</div>
                  <Input value={newActionValue} onChange={(e)=>setNewActionValue(e.target.value)} placeholder={newActionType === "search" ? "كهربائي" : "UUID"} />
                </div>
              </div>
            )}

            <div className="md:col-span-2">
              <Button onClick={add} disabled={loading}>
                {language === "ar" ? "إضافة" : "Add"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {[{key:"city" as const, list:cities},{key:"chip" as const, list:chips}].map(section => (
          <Card key={section.key}>
            <CardHeader>
              <CardTitle className={isRTL ? "text-right" : "text-left"}>{sectionTitle(section.key)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {section.list.length === 0 ? (
                <div className="text-sm text-muted-foreground">{loading ? "..." : (language === "ar" ? "لا يوجد عناصر" : "No items")}</div>
              ) : section.list.map(item => (
                <div key={item.id} className="flex items-center justify-between gap-3 border rounded-md p-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {(language === "ar" ? (item.label_ar || item.label_en) : (item.label_en || item.label_ar)) || "-"}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {item.type === "city"
                        ? (item.city_key ? `city_key: ${item.city_key}` : "")
                        : `${item.action_type ?? ""} → ${item.action_value ?? ""}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Input
                      className="w-20"
                      type="number"
                      value={item.display_order ?? 0}
                      onChange={(e)=> updateOrder(item.id, Number(e.target.value))}
                    />
                    <div className="flex items-center gap-2">
                      <Switch checked={!!item.is_active} onCheckedChange={(v)=> toggleActive(item.id, v)} />
                    </div>
                    <Button variant="destructive" onClick={()=> remove(item.id)}>{language === "ar" ? "حذف" : "Delete"}</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
