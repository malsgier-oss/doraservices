import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Settings,
  Edit2,
  Save,
  X,
  Loader2,
  LogOut,
  Briefcase,
  ClipboardList,
  Plus,
  User,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ServiceProviderCard } from "@/components/service/ServiceProviderCard";
import { ServiceRequestCard } from "@/components/service/ServiceRequestCard";

const Profile = () => {
  const [activeTab, setActiveTab] = useState("bookings");
  const [isEditing, setIsEditing] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile, loading, updateProfile } = useProfile();
  const { isBusiness, loading: roleLoading, upgradeToBusiness } = useUserRole();
  const { t, isRTL } = useLanguage();

  const [formData, setFormData] = useState({
    full_name: "",
    bio: "",
    avatar_url: "",
  });

  const handleEdit = () => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        bio: profile.bio || "",
        avatar_url: profile.avatar_url || "",
      });
    }
    setIsEditing(true);
  };

  const handleSave = async () => {
    const { error } = await updateProfile({
      full_name: formData.full_name || null,
      bio: formData.bio || null,
      avatar_url: formData.avatar_url || null,
    });

    if (error) {
      toast({
        title: t.common.error,
        description: "Failed to update profile",
        variant: "destructive",
      });
    } else {
      toast({
        title: t.profile.profileUpdated,
        description: t.profile.profileUpdatedDesc,
      });
      setIsEditing(false);
    }
  };

  const handleUpgradeToBusiness = async () => {
    setIsUpgrading(true);
    const { error } = await upgradeToBusiness();
    setIsUpgrading(false);

    if (error) {
      toast({
        title: t.common.error,
        description: "Failed to upgrade to provider account",
        variant: "destructive",
      });
    } else {
      toast({
        title: t.profile.providerAccount,
        description: "You can now create and list your services.",
      });
      navigate("/create-service");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  // Mock bookings data - will be replaced with real data
  const mockBookings = [
    {
      id: "1",
      providerName: "أحمد محمد",
      providerAvatar: "",
      serviceTitle: "صيانة مكيفات",
      status: "pending" as const,
      scheduledDate: new Date("2024-01-15"),
      requestedDate: new Date("2024-01-10"),
    },
    {
      id: "2",
      providerName: "فاطمة علي",
      providerAvatar: "",
      serviceTitle: "تنظيف منزلي",
      status: "in_progress" as const,
      scheduledDate: new Date("2024-01-10"),
      requestedDate: new Date("2024-01-08"),
    },
  ];

  // Mock services for business users
  const mockMyServices = [
    {
      id: "svc-1",
      providerName: profile?.full_name || "Provider",
      providerAvatar: profile?.avatar_url || "",
      serviceTitle: "Professional AC Repair",
      rating: 4.8,
      reviewCount: 24,
      hourlyRate: 75,
    },
  ];

  if (loading || roleLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "User";
  const initials = displayName.slice(0, 2).toUpperCase();
  const memberSince = profile?.created_at 
    ? format(new Date(profile.created_at), "MMMM yyyy")
    : "Recently";

  return (
    <Layout>
      {/* Profile Header */}
      <section className="bg-background py-8">
        <div className="container">
          <div className="flex flex-col items-center gap-6">
            {/* Circular Avatar */}
            <Avatar className="h-28 w-28 ring-4 ring-primary/20 shadow-lg">
              <AvatarImage src={profile?.avatar_url || ""} alt={displayName} />
              <AvatarFallback className="text-3xl font-display font-bold bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="text-center space-y-3">
              {isEditing ? (
                <div className="space-y-4 max-w-sm mx-auto text-start">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">{t.profile.fullName}</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) =>
                        setFormData({ ...formData, full_name: e.target.value })
                      }
                      placeholder={t.profile.fullName}
                      className="rounded-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">{t.profile.bio}</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) =>
                        setFormData({ ...formData, bio: e.target.value })
                      }
                      placeholder={t.profile.bioPlaceholder}
                      rows={3}
                      className="rounded-2xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="avatar_url">{t.profile.avatarUrl}</Label>
                    <Input
                      id="avatar_url"
                      value={formData.avatar_url}
                      onChange={(e) =>
                        setFormData({ ...formData, avatar_url: e.target.value })
                      }
                      placeholder={t.profile.avatarPlaceholder}
                      className="rounded-full"
                    />
                  </div>
                  <div className={`flex gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} className="rounded-full flex-1">
                      <X className="h-4 w-4" />
                      <span className={isRTL ? "mr-1" : "ml-1"}>{t.profile.cancelEdit}</span>
                    </Button>
                    <Button size="sm" onClick={handleSave} className="rounded-full flex-1">
                      <Save className="h-4 w-4" />
                      <span className={isRTL ? "mr-1" : "ml-1"}>{t.profile.saveChanges}</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <h1 className="font-display text-2xl font-bold text-foreground">
                      {displayName}
                    </h1>
                    <div className="flex gap-2 justify-center flex-wrap">
                      <Badge className="rounded-full bg-primary/10 text-primary border-0">
                        {t.profile.tier}: {profile?.tier || t.profile.explorer}
                      </Badge>
                      {isBusiness && (
                        <Badge className="rounded-full bg-success/10 text-success border-0">
                          <Briefcase className="h-3 w-3 mr-1" />
                          {t.profile.providerAccount}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {profile?.bio && (
                    <p className="text-muted-foreground text-sm max-w-md mx-auto">
                      {profile.bio}
                    </p>
                  )}

                  <div className="flex justify-center gap-6 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {t.profile.memberSince} {memberSince}
                    </span>
                  </div>

                  <div className="flex justify-center gap-4">
                    <div className="text-center bg-muted/50 rounded-full px-6 py-3">
                      <p className="font-display text-xl font-bold text-foreground">
                        {profile?.points || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">{t.profile.points}</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Action Buttons */}
            {!isEditing && (
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="outline" size="sm" onClick={handleEdit} className="rounded-full">
                  <Edit2 className="h-4 w-4" />
                  <span className={isRTL ? "mr-1" : "ml-1"}>{t.profile.editProfile}</span>
                </Button>
                
                {!isBusiness && (
                  <Button 
                    size="sm" 
                    onClick={handleUpgradeToBusiness}
                    disabled={isUpgrading}
                    className="rounded-full"
                  >
                    {isUpgrading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Briefcase className="h-4 w-4" />
                    )}
                    <span className={isRTL ? "mr-1" : "ml-1"}>{t.profile.becomeProvider}</span>
                  </Button>
                )}

                {isBusiness && (
                  <Button 
                    size="sm" 
                    onClick={() => navigate("/create-service")}
                    className="rounded-full"
                  >
                    <Plus className="h-4 w-4" />
                    <span className={isRTL ? "mr-1" : "ml-1"}>{t.profile.addService}</span>
                  </Button>
                )}

                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleSignOut}
                  className="rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                  <span className={isRTL ? "mr-1" : "ml-1"}>{t.profile.logout}</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="py-6">
        <div className="container">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className={`grid w-full max-w-md grid-cols-${isBusiness ? "3" : "2"} mx-auto mb-6 rounded-full p-1`}>
              <TabsTrigger value="bookings" className="flex items-center gap-1.5 rounded-full">
                <ClipboardList className="h-4 w-4" />
                {t.profile.myBookings}
              </TabsTrigger>
              {isBusiness && (
                <TabsTrigger value="services" className="flex items-center gap-1.5 rounded-full">
                  <Briefcase className="h-4 w-4" />
                  {t.profile.myServices}
                </TabsTrigger>
              )}
              <TabsTrigger value="settings" className="flex items-center gap-1.5 rounded-full">
                <Settings className="h-4 w-4" />
                {t.profile.settings}
              </TabsTrigger>
            </TabsList>

            {/* Bookings Tab */}
            <TabsContent value="bookings" className="animate-fade-in">
              <div className="max-w-2xl mx-auto space-y-4">
                <h2 className="font-display text-lg font-semibold">
                  {t.profile.myBookings}
                </h2>
                {mockBookings.length > 0 ? (
                  <div className="space-y-4">
                    {mockBookings.map((booking) => (
                      <ServiceRequestCard
                        key={booking.id}
                        id={booking.id}
                        providerName={booking.providerName}
                        providerAvatar={booking.providerAvatar}
                        serviceTitle={booking.serviceTitle}
                        status={booking.status}
                        scheduledDate={booking.scheduledDate}
                        requestedDate={booking.requestedDate}
                        onViewDetails={() => {}}
                        onCancel={() => {}}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-muted/30 rounded-3xl">
                    <div className="h-16 w-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                      <ClipboardList className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground font-medium">
                      {t.profile.noBookings}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t.profile.noBookingsDesc}
                    </p>
                    <Button 
                      className="mt-4 rounded-full" 
                      onClick={() => navigate("/")}
                    >
                      {t.services.bookService}
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Services Tab (Business Users) */}
            {isBusiness && (
              <TabsContent value="services" className="animate-fade-in">
                <div className="max-w-2xl mx-auto space-y-4">
                  <div className={`flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
                    <h2 className="font-display text-lg font-semibold">
                      {t.profile.myServices}
                    </h2>
                    <Button 
                      size="sm" 
                      className="rounded-full"
                      onClick={() => navigate("/create-service")}
                    >
                      <Plus className="h-4 w-4" />
                      <span className={isRTL ? "mr-1" : "ml-1"}>{t.profile.addService}</span>
                    </Button>
                  </div>
                  
                  {mockMyServices.length > 0 ? (
                    <div className="space-y-4">
                      {mockMyServices.map((service) => (
                        <div key={service.id} className="relative">
                          <ServiceProviderCard
                            id={service.id}
                            providerName={service.providerName}
                            providerAvatar={service.providerAvatar}
                            serviceTitle={service.serviceTitle}
                            rating={service.rating}
                            reviewCount={service.reviewCount}
                            hourlyRate={service.hourlyRate}
                            onBook={() => {}}
                          />
                          <div className={`absolute top-4 ${isRTL ? "left-4" : "right-4"} flex gap-2`}>
                            <Button size="icon" variant="outline" className="h-8 w-8 rounded-full">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-muted/30 rounded-3xl">
                      <div className="h-16 w-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                        <Briefcase className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground font-medium">
                        {t.profile.noServices}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t.profile.noServicesDesc}
                      </p>
                      <Button 
                        className="mt-4 rounded-full" 
                        onClick={() => navigate("/create-service")}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {t.profile.createService}
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
            )}

            {/* Settings Tab */}
            <TabsContent value="settings" className="animate-fade-in">
              <div className="max-w-md mx-auto space-y-4">
                <h2 className="font-display text-lg font-semibold">
                  {t.profile.settings}
                </h2>
                <div className="bg-card rounded-3xl p-6 space-y-4 shadow-sm">
                  <button 
                    onClick={handleEdit}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-muted/50 transition-colors ${isRTL ? "flex-row-reverse text-right" : ""}`}
                  >
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-medium">{t.profile.editProfile}</span>
                  </button>
                  
                  {!isBusiness && (
                    <button 
                      onClick={handleUpgradeToBusiness}
                      disabled={isUpgrading}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-muted/50 transition-colors ${isRTL ? "flex-row-reverse text-right" : ""}`}
                    >
                      <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                        <Briefcase className="h-5 w-5 text-success" />
                      </div>
                      <span className="font-medium">{t.profile.becomeProvider}</span>
                    </button>
                  )}
                  
                  <button 
                    onClick={handleSignOut}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-destructive/10 transition-colors ${isRTL ? "flex-row-reverse text-right" : ""}`}
                  >
                    <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                      <LogOut className="h-5 w-5 text-destructive" />
                    </div>
                    <span className="font-medium text-destructive">{t.profile.logout}</span>
                  </button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </Layout>
  );
};

export default Profile;
