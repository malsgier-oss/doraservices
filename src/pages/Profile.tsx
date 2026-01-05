import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
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
  MapPin,
  Phone,
  Clock,
  Pencil,
  Pause,
  Play,
  ImageOff,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useLanguage } from "@/contexts/LanguageContext";
import { useServices } from "@/hooks/useServices";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";
import { useCities } from "@/hooks/useCities";
import { useSubCities } from "@/hooks/useSubCities";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ProfileCompleteness } from "@/components/profile/ProfileCompleteness";
import { EditServiceDialog } from "@/components/service/EditServiceDialog";

// Format phone to Libyan style: 09x xxx xx xx
const formatLibyanPhone = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  const limited = digits.slice(0, 10);

  if (limited.length <= 3) return limited;
  if (limited.length <= 6) return `${limited.slice(0, 3)} ${limited.slice(3)}`;
  if (limited.length <= 8)
    return `${limited.slice(0, 3)} ${limited.slice(3, 6)} ${limited.slice(6)}`;
  return `${limited.slice(0, 3)} ${limited.slice(3, 6)} ${limited.slice(
    6,
    8
  )} ${limited.slice(8)}`;
};

const Profile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);

  const { user, signOut } = useAuth();
  const { profile, loading, updateProfile } = useProfile();
  const { isBusiness, loading: roleLoading, upgradeToBusiness } = useUserRole();
  const { t, isRTL, language } = useLanguage();

  const servicesApi = useServices();
  const { myServices, deleteService, updateService } = servicesApi;

  const { uploadAvatar, uploading } = useAvatarUpload();
  const { data: cities } = useCities();

  const [formData, setFormData] = useState({
    full_name: "",
    bio: "",
    avatar_url: "",
    phone: "",
    city: "",
    sub_city: "",
  });

  // Sub-cities should follow the "currently selected" city while editing
  const selectedCityId = (isEditing ? formData.city : profile?.city) || null;
  const { data: subCities } = useSubCities(selectedCityId);

  // ✅ Fix TS typing for editingService safely
  type MyService = ReturnType<typeof useServices>["myServices"][number];
  const [editingService, setEditingService] = useState<MyService | null>(null);
  const [isSavingService, setIsSavingService] = useState(false);
  const [togglingPauseId, setTogglingPauseId] = useState<string | null>(null);

  const providerMissingPhone = isBusiness && !profile?.phone;
  const isPendingApproval = isBusiness && profile?.provider_status === "pending";

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "User";
  const initials = displayName.slice(0, 2).toUpperCase();
  const memberSince = profile?.created_at
    ? format(new Date(profile.created_at), "MMMM yyyy")
    : "Recently";

  const cityLabel =
    profile?.city && cities?.length
      ? (cities.find((c) => c.id === profile.city)?.[
          language === "ar" ? "name_ar" : "name"
        ] as string) || null
      : null;

  const subCityLabel =
    profile?.sub_city && subCities?.length
      ? (subCities.find((sc) => sc.id === profile.sub_city)?.[
          language === "ar" ? "name_ar" : "name"
        ] as string) || null
      : null;

  const handleEdit = () => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        bio: profile.bio || "",
        avatar_url: profile.avatar_url || "",
        phone: profile.phone ? formatLibyanPhone(profile.phone) : "",
        city: profile.city || "",
        sub_city: profile.sub_city || "",
      });
    }
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    // Reset form so next edit starts clean
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        bio: profile.bio || "",
        avatar_url: profile.avatar_url || "",
        phone: profile.phone ? formatLibyanPhone(profile.phone) : "",
        city: profile.city || "",
        sub_city: profile.sub_city || "",
      });
    }
    setIsEditing(false);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatLibyanPhone(e.target.value);
    setFormData({ ...formData, phone: formatted });
  };

  const handleSave = async () => {
    const phoneDigits = formData.phone.replace(/\D/g, "");

    const { error } = await updateProfile({
      full_name: formData.full_name || null,
      bio: formData.bio || null,
      avatar_url: formData.avatar_url || null,
      phone: phoneDigits || null,
      city: formData.city || null,
      sub_city: formData.sub_city || null,
    });

    if (error) {
      toast({
        title: t.common.error,
        description: isRTL ? "فشل تحديث الملف" : "Failed to update profile",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: t.profile.profileUpdated,
      description: t.profile.profileUpdatedDesc,
    });

    setIsEditing(false);
  };

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: t.common.error,
        description: isRTL ? "يرجى اختيار صورة" : "Please select an image file",
        variant: "destructive",
      });
      input.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t.common.error,
        description: isRTL
          ? "حجم الصورة كبير جداً (الحد الأقصى 5MB)"
          : "Image too large (max 5MB)",
        variant: "destructive",
      });
      input.value = "";
      return;
    }

    const { url, error } = await uploadAvatar(file);

    if (error || !url) {
      toast({
        title: t.common.error,
        description: isRTL ? "فشل رفع الصورة" : "Failed to upload image",
        variant: "destructive",
      });
      input.value = "";
      return;
    }

    const { error: updateError } = await updateProfile({ avatar_url: url });
    if (!updateError) {
      toast({
        title: t.profile.profileUpdated,
        description: isRTL ? "تم تحديث الصورة بنجاح" : "Avatar updated successfully",
      });
    }

    // allow re-uploading same file
    input.value = "";
  };

  // ✅ Delete photo (available for users & providers) in edit mode
  const handleRemoveAvatar = async () => {
    const { error } = await updateProfile({ avatar_url: null });
    if (error) {
      toast({
        title: t.common.error,
        description: isRTL ? "فشل حذف الصورة" : "Failed to remove avatar",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: isRTL ? "تم حذف الصورة" : "Avatar removed",
      description: isRTL ? "تمت إعادة الصورة الافتراضية" : "Default avatar restored",
    });
  };

  const handleUpgradeToBusiness = async () => {
    setIsUpgrading(true);
    const { error } = await upgradeToBusiness();
    setIsUpgrading(false);

    if (error) {
      toast({
        title: t.common.error,
        description: isRTL
          ? "فشل الترقية إلى حساب مقدم خدمة"
          : "Failed to upgrade to provider account",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: t.profile.providerAccount,
      description: isRTL
        ? "يمكنك الآن إضافة خدماتك. حسابك قيد المراجعة."
        : "You can now add your services. Your account is pending approval.",
    });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleDeleteService = async (id: string) => {
    if (
      !confirm(
        isRTL ? "هل أنت متأكد من حذف هذه الخدمة؟" : "Are you sure you want to delete this service?"
      )
    ) {
      return;
    }

    const { error } = await deleteService(id);
    if (error) {
      toast({
        title: t.common.error,
        description: isRTL ? "فشل حذف الخدمة" : "Failed to delete service",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: t.profile.serviceDeleted,
      description: t.profile.serviceDeletedDesc,
    });
  };

  const handleEditService = (service: MyService) => {
    setEditingService(service);
  };

  const handleSaveService = async (
    serviceId: string,
    updates: {
      title: string;
      description: string | null;
      category: string;
      is_paused: boolean;
    }
  ) => {
    setIsSavingService(true);
    const { error } = await updateService(serviceId, updates);
    setIsSavingService(false);

    if (error) {
      toast({
        title: t.common.error,
        description: isRTL ? "فشل تحديث الخدمة" : "Failed to update service",
        variant: "destructive",
      });
      return { error };
    }

    toast({
      title: isRTL ? "تم التحديث" : "Updated",
      description: isRTL ? "تم تحديث الخدمة بنجاح" : "Service updated successfully",
    });
    setEditingService(null);
    return { error: null };
  };

  const handleTogglePause = async (service: MyService) => {
    setTogglingPauseId(service.id);
    const { error } = await updateService(service.id, {
      is_paused: !service.is_paused,
    });
    setTogglingPauseId(null);

    if (error) {
      toast({
        title: t.common.error,
        description: isRTL ? "فشل تحديث الحالة" : "Failed to update status",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: service.is_paused
        ? isRTL
          ? "تم تفعيل الخدمة"
          : "Service Activated"
        : isRTL
        ? "تم إيقاف الخدمة"
        : "Service Paused",
      description: service.is_paused
        ? isRTL
          ? "الخدمة مرئية للعملاء الآن"
          : "Service is now visible to customers"
        : isRTL
        ? "الخدمة مخفية عن العملاء"
        : "Service is hidden from customers",
    });
  };

  if (loading || roleLoading) {
    return (
      <Layout showHeader={false}>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout showHeader={false}>
      {/* Profile Header */}
      <section className="bg-background py-8">
        <div className="container">
          <div className="flex flex-col items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              <Avatar className="h-28 w-28 shadow-lg">
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
                      <Phone className="h-4 w-4" />
                      {t.profile.phone}
                      {isBusiness && <span className="text-destructive">*</span>}
                    </Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      placeholder="09x xxx xx xx"
                      className="rounded-full"
                      dir="ltr"
                    />
                    <p className="text-xs text-muted-foreground">
                      {isRTL ? "التنسيق: 09x xxx xx xx" : "Format: 09x xxx xx xx"}
                    </p>
                  </div>

                  {/* City */}
                  <div className="space-y-2">
                    <Label htmlFor="city" className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {isRTL ? "المدينة" : "City"}
                    </Label>
                    <Select
                      value={formData.city || "none"}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          city: value === "none" ? "" : value,
                          sub_city: "",
                        })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={isRTL ? "اختر مدينتك" : "Select your city"}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          {isRTL ? "-- اختر مدينة --" : "-- Select city --"}
                        </SelectItem>
                        {cities?.map((city) => (
                          <SelectItem key={city.id} value={city.id}>
                            {language === "ar" && city.name_ar ? city.name_ar : city.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sub-city */}
                  {formData.city && subCities && subCities.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="sub_city" className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {isRTL ? "المنطقة" : "Area"}
                      </Label>
                      <Select
                        value={formData.sub_city || "none"}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            sub_city: value === "none" ? "" : value,
                          })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={isRTL ? "اختر منطقتك" : "Select your area"}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            {isRTL ? "-- اختر منطقة --" : "-- Select area --"}
                          </SelectItem>
                          {subCities.map((sc) => (
                            <SelectItem key={sc.id} value={sc.id}>
                              {language === "ar" && sc.name_ar ? sc.name_ar : sc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Remove avatar (edit mode for everyone) */}
                  {!!profile?.avatar_url && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleRemoveAvatar}
                      className="rounded-full w-full"
                    >
                      <ImageOff className="h-4 w-4" />
                      <span className={isRTL ? "mr-1" : "ml-1"}>
                        {isRTL ? "حذف الصورة" : "Remove photo"}
                      </span>
                    </Button>
                  )}

                  <div className={`flex gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                      className="rounded-full flex-1"
                    >
                      <X className="h-4 w-4" />
                      <span className={isRTL ? "mr-1" : "ml-1"}>
                        {t.profile.cancelEdit}
                      </span>
                    </Button>
                    <Button size="sm" onClick={handleSave} className="rounded-full flex-1">
                      <Save className="h-4 w-4" />
                      <span className={isRTL ? "mr-1" : "ml-1"}>
                        {t.profile.saveChanges}
                      </span>
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
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        <Badge className="rounded-full bg-success/10 text-success border-0">
                          <Briefcase className="h-3 w-3 mr-1" />
                          {t.profile.providerAccount}
                        </Badge>
                        {isPendingApproval && (
                          <Badge className="rounded-full bg-amber-500/10 text-amber-600 border-0">
                            <Clock className="h-3 w-3 mr-1" />
                            {isRTL ? "قيد المراجعة" : "Pending Approval"}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {profile?.bio && (
                    <p className="text-muted-foreground text-sm max-w-md mx-auto">
                      {profile.bio}
                    </p>
                  )}

                  {/* Provider missing phone -> strong warning */}
                  {providerMissingPhone && (
                    <Alert variant="destructive" className="max-w-md mx-auto mt-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {isRTL
                          ? "أضف رقم هاتفك أولاً حتى يتمكن العملاء من التواصل معك. لن تتمكن من إضافة خدمة قبل ذلك."
                          : "Add your phone number first so customers can contact you. You cannot add a service before that."}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Pending notice */}
                  {isPendingApproval && (
                    <Alert className="max-w-md mx-auto mt-4 bg-amber-50 border-amber-200">
                      <Clock className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-800">
                        {isRTL
                          ? "حسابك قيد المراجعة. خدماتك لن تظهر للعملاء حتى تتم الموافقة."
                          : "Your account is pending approval. Your services won’t be visible until approved."}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex justify-center gap-6 text-sm text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {t.profile.memberSince} {memberSince}
                    </span>

                    {(cityLabel || subCityLabel) && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {cityLabel || (isRTL ? "—" : "—")}
                        {subCityLabel ? `, ${subCityLabel}` : ""}
                      </span>
                    )}
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

                {/* Provider add service button is disabled until phone exists */}
                {isBusiness && (
                  <Button
                    size="sm"
                    onClick={() => navigate("/create-service")}
                    className="rounded-full"
                    disabled={providerMissingPhone}
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

      {/* Profile Completeness for Business Users */}
      {isBusiness && !isEditing && (
        <section className="pb-4">
          <div className="container">
            <ProfileCompleteness
              profile={profile}
              hasServices={myServices.length > 0}
              className="max-w-2xl mx-auto"
            />
          </div>
        </section>
      )}

      {/* Provider: My Services only */}
      {isBusiness && (
        <section className="py-6">
          <div className="container">
            <div className="max-w-2xl mx-auto space-y-4">
              <div className={`flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
                <h2 className="font-display text-lg font-semibold">{t.profile.myServices}</h2>
                <Button
                  size="sm"
                  className="rounded-full"
                  onClick={() => navigate("/create-service")}
                  disabled={providerMissingPhone}
                >
                  <Plus className="h-4 w-4" />
                  <span className={isRTL ? "mr-1" : "ml-1"}>{t.profile.addService}</span>
                </Button>
              </div>

              {providerMissingPhone && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {isRTL
                      ? "أضف رقم هاتفك من (تعديل الملف) ثم يمكنك إضافة خدمة."
                      : "Add your phone number in (Edit profile) then you can add a service."}
                  </AlertDescription>
                </Alert>
              )}

              {myServices.length > 0 ? (
                <div className="space-y-4">
                  {myServices.map((service) => (
                    <div
                      key={service.id}
                      className={`bg-card rounded-2xl p-4 shadow-card ${
                        service.is_paused ? "opacity-60" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground">{service.title}</h3>
                            {service.is_paused && (
                              <Badge
                                variant="secondary"
                                className="bg-gray-200 text-gray-600 text-xs"
                              >
                                <Pause className="h-3 w-3 mr-1" />
                                {isRTL ? "متوقف" : "Paused"}
                              </Badge>
                            )}
                          </div>

                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {service.description}
                          </p>

                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge variant="outline">
                              {t.categories[service.category as keyof typeof t.categories] ||
                                service.category}
                            </Badge>
                            {isPendingApproval && (
                              <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                                {isRTL ? "قيد المراجعة" : "Pending"}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 rounded-full"
                            onClick={() => handleTogglePause(service)}
                            disabled={togglingPauseId === service.id}
                          >
                            {togglingPauseId === service.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : service.is_paused ? (
                              <Play className="h-4 w-4 text-green-600" />
                            ) : (
                              <Pause className="h-4 w-4 text-orange-500" />
                            )}
                          </Button>

                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 rounded-full"
                            onClick={() => handleEditService(service)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

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
                  <p className="text-muted-foreground font-medium">{t.profile.noServices}</p>
                  <p className="text-sm text-muted-foreground mt-1">{t.profile.noServicesDesc}</p>
                  <Button
                    className="mt-4 rounded-full"
                    onClick={() => navigate("/create-service")}
                    disabled={providerMissingPhone}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {t.profile.createService}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Edit Service Dialog */}
      <EditServiceDialog
        open={!!editingService}
        onOpenChange={(open) => !open && setEditingService(null)}
        service={editingService}
        onSave={handleSaveService}
        isSaving={isSavingService}
      />
    </Layout>
  );
};

export default Profile;