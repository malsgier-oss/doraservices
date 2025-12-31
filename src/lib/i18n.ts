// Arabic translations for the Service Hub app
export const ar = {
  // App name
  appName: "الدائرة",
  appTagline: "مركز الخدمات المحلية",
  
  // Navigation
  nav: {
    home: "الرئيسية",
    activity: "النشاط",
    services: "خدماتي",
    profile: "الملف",
  },
  
  // Categories
  categories: {
    homeMaintenance: "صيانة المنزل",
    personalCare: "العناية الشخصية",
    techSupport: "الدعم التقني",
    petServices: "خدمات الحيوانات",
    cleaning: "التنظيف",
    automotive: "السيارات",
    education: "التعليم",
    health: "الصحة",
  },
  
  // Hub
  hub: {
    welcome: "مرحباً",
    whatService: "ما الخدمة التي تحتاجها اليوم؟",
    browseCategories: "تصفح الفئات",
    featuredProviders: "مزودو الخدمات المميزون",
    viewAll: "عرض الكل",
  },
  
  // Service Directory
  services: {
    title: "الخدمات",
    startingFrom: "يبدأ من",
    perHour: "/ساعة",
    bookService: "احجز الخدمة",
    noServices: "لا توجد خدمات في هذه الفئة",
    backToHub: "العودة للرئيسية",
  },
  
  // Booking
  booking: {
    title: "حجز الخدمة",
    describeNeeds: "صف احتياجاتك",
    descriptionPlaceholder: "اشرح ما تحتاجه بالتفصيل...",
    selectDate: "اختر التاريخ",
    selectTime: "اختر الوقت",
    preferredTime: "الوقت المفضل",
    morning: "صباحاً",
    afternoon: "ظهراً",
    evening: "مساءً",
    submitRequest: "إرسال الطلب",
    requestSent: "تم إرسال الطلب",
    requestSentDesc: "سيتواصل معك مزود الخدمة قريباً",
    cancel: "إلغاء",
  },
  
  // Activity
  activity: {
    title: "طلباتي",
    noRequests: "لا توجد طلبات بعد",
    noRequestsDesc: "ابدأ بحجز خدمة من الصفحة الرئيسية",
    pending: "قيد الانتظار",
    inProgress: "قيد التنفيذ",
    completed: "مكتملة",
    viewDetails: "عرض التفاصيل",
    cancelRequest: "إلغاء الطلب",
    providerName: "مزود الخدمة",
    scheduledFor: "موعد الخدمة",
    requestedOn: "تاريخ الطلب",
  },
  
  // Service Creator (Business Onboarding)
  creator: {
    title: "أضف خدمتك",
    subtitle: "انضم كمزود خدمة في الدائرة",
    serviceName: "اسم الخدمة",
    serviceNamePlaceholder: "مثال: صيانة مكيفات احترافية",
    category: "الفئة",
    selectCategory: "اختر الفئة",
    hourlyRate: "السعر بالساعة (ر.س)",
    ratePlaceholder: "مثال: 150",
    bio: "نبذة عنك",
    bioPlaceholder: "اكتب نبذة قصيرة عن خبرتك وخدماتك...",
    createService: "إنشاء الخدمة",
    serviceCreated: "تم إنشاء الخدمة",
    serviceCreatedDesc: "خدمتك الآن متاحة للعملاء",
  },
  
  // Profile
  profile: {
    title: "الملف الشخصي",
    editProfile: "تعديل الملف",
    myServices: "خدماتي",
    settings: "الإعدادات",
    logout: "تسجيل الخروج",
    becomeProvider: "كن مزود خدمة",
  },
  
  // Auth
  auth: {
    login: "تسجيل الدخول",
    signup: "إنشاء حساب",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    fullName: "الاسم الكامل",
    forgotPassword: "نسيت كلمة المرور؟",
    noAccount: "ليس لديك حساب؟",
    hasAccount: "لديك حساب بالفعل؟",
    continueAsGuest: "المتابعة كضيف",
  },
  
  // Common
  common: {
    loading: "جاري التحميل...",
    error: "حدث خطأ",
    retry: "إعادة المحاولة",
    save: "حفظ",
    cancel: "إلغاء",
    confirm: "تأكيد",
    delete: "حذف",
    edit: "تعديل",
    search: "بحث",
    searchPlaceholder: "ابحث عن خدمة...",
    sar: "ر.س",
  },
  
  // Ratings
  rating: {
    reviews: "تقييم",
    noReviews: "لا توجد تقييمات",
  },
};

export type TranslationKey = keyof typeof ar;
