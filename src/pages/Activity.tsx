import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { ServiceRequestCard } from "@/components/service/ServiceRequestCard";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBookings } from "@/hooks/useBookings";
import { cn } from "@/lib/utils";

type Status = "pending" | "in_progress" | "completed" | "cancelled";

export default function Activity() {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const { myBookings, loading, cancelBooking } = useBookings();
  const [activeTab, setActiveTab] = useState<Status | "all">("all");

  const tabs: { id: Status | "all"; label: string }[] = [
    { id: "all", label: t.activity.all },
    { id: "pending", label: t.activity.pending },
    { id: "in_progress", label: t.activity.inProgress },
    { id: "completed", label: t.activity.completed },
  ];

  const filteredRequests =
    activeTab === "all"
      ? myBookings
      : myBookings.filter((r) => r.status === activeTab);

  const handleCancel = async (id: string) => {
    await cancelBooking(id);
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

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
            filteredRequests.map((booking) => (
              <ServiceRequestCard
                key={booking.id}
                id={booking.id}
                serviceTitle={booking.service_title || "Service"}
                providerName={booking.provider_name || "Provider"}
                providerAvatar={booking.provider_avatar}
                status={booking.status}
                scheduledDate={new Date(booking.scheduled_date)}
                requestedDate={new Date(booking.created_at)}
                onViewDetails={() => {}}
                onCancel={() => handleCancel(booking.id)}
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
              <p className="text-sm text-muted-foreground mb-4">
                {t.activity.noRequestsDesc}
              </p>
              <Button 
                onClick={() => navigate("/")}
                className="rounded-full"
              >
                {t.services.bookService}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
