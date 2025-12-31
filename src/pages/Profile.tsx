import { useState, useRef } from "react";
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
  Plus,
  Trash2,
  Camera,
  AlertCircle,
  Heart,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useLanguage } from "@/contexts/LanguageContext";
import { useServices } from "@/hooks/useServices";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

const Profile = () => {
  const [activeTab, setActiveTab] = useState("favorites");
  const [isEditing, setIsEditing] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile, loading, updateProfile } = useProfile();
  const { isBusiness, loading: roleLoading, upgradeToBusiness } = useUserRole();
  const { t, isRTL } = useLanguage();
  const { myServices, deleteService } = useServices();
  const { uploadAvatar, uploading } = useAvatarUpload();

  const [formData, setFormData] = useState({
    full_name: "",
    bio: "",
    avatar_url: "",
    phone: "",
  });

  // Check if provider is missing phone number
  const providerMissingPhone = isBusiness && !profile?.phone;

  const handleEdit = () => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        bio: profile.bio || "",
        avatar_url: profile.avatar_url || "",
        phone: profile.phone || "",
      });
    }
    setIsEditing(true);
  };

  const handleSave = async () => {
    const { error } = await updateProfile({
      full_name: formData.full_name || null,
      bio: formData.bio || null,
      avatar_url: formData.avatar_url || null,
      phone: formData.phone || null,
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

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: t.common.error,
        description: isRTL ? "يرجى اختيار صورة" : "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t.common.error,
        description: isRTL ? "حجم الصورة كبير جداً (الحد الأقصى 5MB)" : "Image too large (max 5MB)",
        variant: "destructive",
      });
      return;
    }

    const { url, error } = await uploadAvatar(file);
    
    if (error) {
      toast({
        title: t.common.error,
        description: isRTL ? "فشل رفع الصورة" : "Failed to upload image",
        variant: "destructive",
      });
      return;
    }

    if (url) {
      // Update profile with new avatar URL
      const { error: updateError } = await updateProfile({ avatar_url: url });
      if (!updateError) {
        toast({
          title: t.profile.profileUpdated,
          description: isRTL ? "تم تحديث الصورة بنجاح" : "Avatar updated successfully",
        });
      }
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

  const handleDeleteService = async (id: string) => {
    const { error } = await deleteService(id);
    if (error) {
      toast({
        title: t.common.error,
        description: "Failed to delete service",
        variant: "destructive",
      });
    } else {
      toast({
        title: t.profile.serviceDeleted,
        description: t.profile.serviceDeletedDesc,
      });
    }
  };

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
            {/* Circular Avatar with Upload */}
            <div className="relative">
              <Avatar className="h-28 w-28 ring-4 ring-primary/20 shadow-lg">
                <AvatarImage src={profile?.avatar_url || ""} alt={displayName} />
                <AvatarFallback className="text-3xl font-display font-bold bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
            </div>

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
                    <Label htmlFor="phone" className="flex items-center gap-1">
                      {t.profile.phone}
                      {isBusiness && <span className="text-destructive">*</span>}
                    </Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder={t.profile.phonePlaceholder}
                      className="rounded-full"
                      dir="ltr"
                    />
                    {isBusiness && (
                      <p className="text-xs text-muted-foreground">
                        {isRTL ? "مطلوب للتواصل مع العملاء" : "Required for customer contact"}
                      </p>
                    )}
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
                    {isBusiness && (
                      <Badge className="rounded-full bg-success/10 text-success border-0">
                        <Briefcase className="h-3 w-3 mr-1" />
                        {t.profile.providerAccount}
                      </Badge>
                    )}
                  </div>

                  {profile?.bio && (
                    <p className="text-muted-foreground text-sm max-w-md mx-auto">
                      {profile.bio}
                    </p>
                  )}

                  {/* Phone Warning for Providers */}
                  {providerMissingPhone && (
                    <Alert variant="destructive" className="max-w-md mx-auto mt-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {isRTL 
                          ? "يرجى إضافة رقم هاتفك حتى يتمكن العملاء من التواصل معك" 
                          : "Please add your phone number so customers can contact you"}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex justify-center gap-6 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {t.profile.memberSince} {memberSince}
                    </span>
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
            <TabsList className={`grid w-full max-w-md ${isBusiness ? "grid-cols-3" : "grid-cols-2"} mx-auto mb-6 rounded-full p-1`}>
              <TabsTrigger value="favorites" className="flex items-center gap-1.5 rounded-full">
                <Heart className="h-4 w-4" />
                {t.favorites?.title || (isRTL ? "المفضلة" : "Favorites")}
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

            {/* Favorites Tab */}
            <TabsContent value="favorites" className="animate-fade-in">
              <div className="max-w-2xl mx-auto">
                <div className="text-center py-12 bg-muted/30 rounded-3xl">
                  <div className="h-16 w-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                    <Heart className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground font-medium">
                    {t.favorites?.noFavorites || (isRTL ? "لا توجد مفضلات" : "No favorites yet")}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t.favorites?.noFavoritesDesc || (isRTL ? "أضف خدمات إلى المفضلة" : "Add services to favorites")}
                  </p>
                  <Button 
                    className="mt-4 rounded-full" 
                    onClick={() => navigate("/favorites")}
                  >
                    {isRTL ? "عرض المفضلة" : "View Favorites"}
                  </Button>
                </div>
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
                  
                  {myServices.length > 0 ? (
                    <div className="space-y-4">
                      {myServices.map((service) => (
                        <div key={service.id} className="bg-card rounded-2xl p-4 shadow-card">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h3 className="font-semibold text-foreground">{service.title}</h3>
                              <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
                              <Badge variant="outline" className="mt-2">
                                {t.categories[service.category as keyof typeof t.categories] || service.category}
                              </Badge>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                size="icon" 
                                variant="outline" 
                                className="h-8 w-8 rounded-full"
                                onClick={() => handleDeleteService(service.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
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
                <div className="bg-card rounded-2xl p-4 shadow-card space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground">{t.language.title}</span>
                    <span className="text-muted-foreground text-sm">
                      {isRTL ? t.language.arabic : t.language.english}
                    </span>
                  </div>
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
