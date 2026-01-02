import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";

interface ServiceStat {
  id: string;
  title: string;
  calls: number;
  favorites: number;
}

interface StatsChartProps {
  serviceStats: ServiceStat[];
}

export function StatsChart({ serviceStats }: StatsChartProps) {
  const { isRTL } = useLanguage();

  const chartData = useMemo(() => {
    // Take top 5 services by total engagement
    return serviceStats
      .map(s => ({
        name: s.title.length > 12 ? s.title.slice(0, 12) + "..." : s.title,
        calls: s.calls,
        favorites: s.favorites,
      }))
      .sort((a, b) => (b.calls + b.favorites) - (a.calls + a.favorites))
      .slice(0, 5);
  }, [serviceStats]);

  if (chartData.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {isRTL ? "أداء الخدمات" : "Service Performance"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 16 }}>
              <XAxis type="number" hide />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={80}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelStyle={{ fontWeight: "bold" }}
              />
              <Bar 
                dataKey="calls" 
                fill="hsl(var(--primary))" 
                radius={[0, 4, 4, 0]}
                name={isRTL ? "مكالمات" : "Calls"}
              />
              <Bar 
                dataKey="favorites" 
                fill="hsl(var(--destructive))" 
                radius={[0, 4, 4, 0]}
                name={isRTL ? "مفضلة" : "Favorites"}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-6 mt-2 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-primary" />
            <span className="text-muted-foreground">{isRTL ? "مكالمات" : "Calls"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-destructive" />
            <span className="text-muted-foreground">{isRTL ? "مفضلة" : "Favorites"}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
