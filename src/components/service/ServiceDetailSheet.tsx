import { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Phone, MessageCircle, Heart, ChevronRight, Flag } from "lucide-react";
import { toast } from "sonner";
import { ServiceProviderCard } from "./ServiceProviderCard";

export function ServiceDetailSheet({ open, onOpenChange, service, onToggleFavorite, isFavorite }: any) {
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [providers] = useState<any[]>([]); // Data would be fetched here

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[96dvh]" dir="rtl">
        <DrawerHeader className="border-b bg-white z-10">
          <div className="flex items-center gap-2">
            {selectedProvider && (
              <Button variant="ghost" size="icon" onClick={() => setSelectedProvider(null)}><ChevronRight /></Button>
            )}
            <DrawerTitle>{selectedProvider ? selectedProvider.provider_name : "المزودين"}</DrawerTitle>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto bg-muted/5">
          {selectedProvider ? (
            <DetailProfile 
              provider={selectedProvider} 
              isFavorite={isFavorite?.(selectedProvider.id)} 
              onToggleFavorite={onToggleFavorite} 
            />
          ) : (
            <div className="p-4 space-y-4">
              {providers.map(p => (
                <ServiceProviderCard 
                  key={p.id} 
                  provider={p} 
                  variant="row" 
                  isFavorite={isFavorite?.(p.id)}
                  onToggleFavorite={onToggleFavorite}
                  onDetails={() => setSelectedProvider(p)}
                />
              ))}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function DetailProfile({ provider, isFavorite, onToggleFavorite }: any) {
  const [rating, setRating] = useState(0);

  return (
    <div className="pb-24">
      {/* 1. Header Gallery */}
      <div className="flex overflow-x-auto snap-x h-72 bg-black hide-scrollbar">
        {(provider.image_urls || [provider.image_url]).map((src: string, i: number) => (
          <img key={i} src={src} className="w-full h-full object-contain shrink-0 snap-center" />
        ))}
      </div>

      <div className="p-6 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">{provider.provider_name}</h1>
            <p className="text-muted-foreground">{provider.title}</p>
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            className={cn("rounded-full", isFavorite && "bg-red-50 text-red-500")}
            onClick={() => onToggleFavorite(provider.id)}
          >
            <Heart className={cn("h-5 w-5", isFavorite && "fill-current")} />
          </Button>
        </div>

        {/* 2. Rating System */}
        <div className="bg-white border rounded-3xl p-5 shadow-sm">
          <h3 className="font-bold mb-4 text-center">ما هو تقييمك للخدمة؟</h3>
          <div className="flex justify-center gap-2 mb-4" dir="ltr">
            {[1,2,3,4,5].map(s => (
              <Star 
                key={s} 
                className={cn("h-9 w-9 cursor-pointer transition-transform active:scale-90", s <= rating ? "fill-amber-400 text-amber-400" : "text-gray-200")} 
                onClick={() => setRating(s)} 
              />
            ))}
          </div>
          <Textarea placeholder="اكتب مراجعتك هنا..." className="rounded-xl bg-muted/30 border-none mb-3" />
          <Button className="w-full rounded-xl h-11" onClick={() => toast.success("تم إرسال التقييم")}>إرسال</Button>
        </div>

        {/* 3. Random Reviews */}
        <div className="space-y-3">
          <h3 className="font-bold">المراجعات</h3>
          {provider.reviews?.map((r: string, i: number) => (
            <div key={i} className="p-3 bg-muted/20 rounded-xl text-sm border italic">"{r}"</div>
          ))}
        </div>

        {/* 4. Report Button */}
        <div className="pt-4 border-t flex justify-center">
          <Button variant="ghost" size="sm" className="text-muted-foreground text-xs" onClick={() => toast.info("تم فتح بلاغ")}>
            <Flag className="h-3 w-3 ml-1" /> الإبلاغ عن هذا المزود
          </Button>
        </div>
      </div>

      {/* 5. Sticky Actions: Call Right, WhatsApp Left */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-sm border-t flex gap-3 z-50">
        <Button className="flex-1 h-12 text-lg rounded-2xl" onClick={() => window.open(`tel:${provider.provider_phone}`)}>
          <Phone className="ml-2 h-5 w-5" /> اتصال
        </Button>
        <Button variant="secondary" className="flex-1 h-12 text-lg rounded-2xl bg-green-100 text-green-700" onClick={() => window.open(`https://wa.me/${provider.provider_phone}`)}>
          <MessageCircle className="ml-2 h-5 w-5" /> واتساب
        </Button>
      </div>
    </div>
  );
}
