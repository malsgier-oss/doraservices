import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { ServiceRequestCard } from "@/components/service/ServiceRequestCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

type Status = "pending" | "in_progress" | "completed";

export default function Activity() {
  const { t, isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState<Status | "all">("all");

  // Mock service requests
  const mockRequests = [
    {
      id: "1",
      serviceTitle: isRTL ? "صيانة مكيفات احترافية" : "Professional AC Repair",
      providerName: isRTL ? "أحمد الشمري" : "John Smith",
      status: "pending" as Status,
      scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      requestedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      id: "2",
      serviceTitle: isRTL ? "تنظيف منازل شامل" : "Full House Cleaning",
      providerName: isRTL ? "سارة القحطاني" : "Sarah Johnson",
      status: "in_progress" as Status,
      scheduledDate: new Date(),
      requestedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      id: "3",
      serviceTitle: isRTL ? "صيانة أجهزة إلكترونية" : "Electronics Repair",
      providerName: isRTL ? "محمد العتيبي" : "Mike Williams",
      status: "completed" as Status,
      scheduledDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      requestedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
  ];

  const tabs: { id: Status | "all"; label: string }[] = [
    { id: "all", label: t.activity.all },
    { id: "pending", label: t.activity.pending },
    { id: "in_progress", label: t.activity.inProgress },
    { id: "completed", label: t.activity.completed },
  ];

  const filteredRequests =
    activeTab === "all"
      ? mockRequests
      : mockRequests.filter((r) => r.status === activeTab);

  return (
    <Layout>
      <div className="container py-6 space-y-6">
        {/* Header */}
        <h1 className={cn(
          "text-2xl font-bold text-foreground",
          isRTL ? "text-right" : "text-left"
        )}>
          {t.activity.title}
        </h1>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Requests List */}
        <div className="space-y-3">
          {filteredRequests.length > 0 ? (
            filteredRequests.map((request) => (
              <ServiceRequestCard
                key={request.id}
                {...request}
                onViewDetails={() => console.log("View details:", request.id)}
                onCancel={() => console.log("Cancel:", request.id)}
              />
            ))
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                <span className="text-3xl">📋</span>
              </div>
              <h3 className="font-semibold text-foreground mb-1">
                {t.activity.noRequests}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t.activity.noRequestsDesc}
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
