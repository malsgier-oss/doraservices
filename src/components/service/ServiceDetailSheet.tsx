import { useNavigate } from "react-router-dom";
import { X, Phone, MessageCircle, Star, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface ServiceDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: {
    id: string;
    titleKey: string;
    descKey: string;
    category: string;
    color: string;
    icon: LucideIcon;
  } | null;
}

export function ServiceDetailSheet({ open, onOpenChange, service }: ServiceDetailSheetProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();

  if (!service) return null;

  const IconComponent = service.icon;
  const title = t.featuredList[service.titleKey as keyof typeof t.featuredList] || service.titleKey;
  const description = t.featuredList[service.descKey as keyof typeof t.featuredList] || service.descKey;
  const categoryLabel = t.categories[service.category as keyof typeof t.categories] || service.category;

  const handleBookNow = () => {
    if (!user) {
      onOpenChange(false);
      navigate("/auth");
      return;
    }
    // Navigate to create service request or show booking flow
    onOpenChange(false);
    navigate("/create-service");
  };

  const handleCall = () => {
    // Placeholder for call functionality
    window.location.href = "tel:+1234567890";
  };

  const handleMessage = () => {
    // Placeholder for message functionality
    if (!user) {
      onOpenChange(false);
      navigate("/auth");
      return;
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="relative pb-0">
          <DrawerClose className="absolute top-0 right-4 h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X className="h-4 w-4 text-gray-600" />
          </DrawerClose>
          <div className="flex flex-col items-center pt-2">
            <div className={cn(
              "h-20 w-20 rounded-full flex items-center justify-center mb-4",
              service.color
            )}>
              <IconComponent className="h-10 w-10 text-[#333]" strokeWidth={1.5} />
            </div>
            <DrawerTitle className="text-xl font-bold text-[#333]">
              {title}
            </DrawerTitle>
            <p className="text-sm text-[#777] mt-1">{categoryLabel}</p>
          </div>
        </DrawerHeader>

        <div className="px-6 py-6 space-y-6" dir={isRTL ? "rtl" : "ltr"}>
          {/* Rating & Info */}
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span className="font-medium text-[#333]">4.8</span>
              <span className="text-[#999]">(120+)</span>
            </div>
            <div className="flex items-center gap-1 text-[#777]">
              <Clock className="h-4 w-4" />
              <span>{isRTL ? "متاح اليوم" : "Available today"}</span>
            </div>
            <div className="flex items-center gap-1 text-[#777]">
              <MapPin className="h-4 w-4" />
              <span>{isRTL ? "قريب منك" : "Near you"}</span>
            </div>
          </div>

          {/* Description */}
          <div className="bg-gray-50 rounded-[16px] p-4">
            <h3 className="font-semibold text-[#333] mb-2">
              {isRTL ? "عن الخدمة" : "About this service"}
            </h3>
            <p className="text-sm text-[#666] leading-relaxed">
              {description}
            </p>
          </div>

          {/* What's included */}
          <div>
            <h3 className="font-semibold text-[#333] mb-3">
              {isRTL ? "ما يشمله" : "What's included"}
            </h3>
            <ul className="space-y-2">
              {[
                isRTL ? "تشخيص المشكلة" : "Problem diagnosis",
                isRTL ? "قطع الغيار الأصلية" : "Original spare parts",
                isRTL ? "ضمان على العمل" : "Work guarantee",
                isRTL ? "دعم ما بعد الخدمة" : "After-service support",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-[#666]">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#333]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              size="lg"
              className="flex-1 h-14 rounded-[16px] border-gray-200"
              onClick={handleCall}
            >
              <Phone className="h-5 w-5 mr-2" />
              {isRTL ? "اتصل" : "Call"}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="flex-1 h-14 rounded-[16px] border-gray-200"
              onClick={handleMessage}
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              {isRTL ? "رسالة" : "Message"}
            </Button>
          </div>

          <Button
            size="lg"
            className="w-full h-14 rounded-[16px] bg-[#333] hover:bg-[#444] text-white font-semibold"
            onClick={handleBookNow}
          >
            {isRTL ? "احجز الآن" : "Book Now"}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
