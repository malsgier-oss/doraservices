export interface Deal {
  id: string;
  businessId: string;
  businessName: string;
  businessImage: string;
  title: string;
  description: string;
  discount: string;
  originalPrice?: number;
  discountedPrice?: number;
  category: string;
  expiresAt: string;
  claimedCount: number;
  maxClaims?: number;
  isExclusive: boolean;
  pointsCost?: number;
}

export const deals: Deal[] = [
  {
    id: "1",
    businessId: "1",
    businessName: "Brew & Bean",
    businessImage: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400",
    title: "Buy One Get One Free",
    description: "Get a free coffee when you purchase any specialty drink",
    discount: "BOGO",
    category: "Coffee & Tea",
    expiresAt: "2025-01-15",
    claimedCount: 45,
    maxClaims: 100,
    isExclusive: false,
  },
  {
    id: "2",
    businessId: "2",
    businessName: "Fresh Harvest Market",
    businessImage: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400",
    title: "20% Off Organic Produce",
    description: "Save on all organic fruits and vegetables this week",
    discount: "20% OFF",
    originalPrice: 50,
    discountedPrice: 40,
    category: "Grocery",
    expiresAt: "2025-01-10",
    claimedCount: 89,
    isExclusive: false,
  },
  {
    id: "3",
    businessId: "3",
    businessName: "Zen Yoga Studio",
    businessImage: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=400",
    title: "First Class Free",
    description: "New members get their first yoga class absolutely free",
    discount: "FREE",
    category: "Fitness",
    expiresAt: "2025-02-01",
    claimedCount: 23,
    maxClaims: 50,
    isExclusive: true,
    pointsCost: 100,
  },
  {
    id: "4",
    businessId: "4",
    businessName: "The Italian Kitchen",
    businessImage: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400",
    title: "Free Appetizer",
    description: "Complimentary bruschetta with any pasta order",
    discount: "FREE APP",
    category: "Restaurant",
    expiresAt: "2025-01-20",
    claimedCount: 67,
    isExclusive: false,
  },
  {
    id: "5",
    businessId: "5",
    businessName: "Tech Repair Pro",
    businessImage: "https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=400",
    title: "15% Off Screen Repairs",
    description: "Discounted phone and tablet screen replacements",
    discount: "15% OFF",
    originalPrice: 150,
    discountedPrice: 127.5,
    category: "Services",
    expiresAt: "2025-01-25",
    claimedCount: 34,
    maxClaims: 75,
    isExclusive: true,
    pointsCost: 200,
  },
  {
    id: "6",
    businessId: "6",
    businessName: "Blooming Petals Florist",
    businessImage: "https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=400",
    title: "10% Off Bouquets",
    description: "Save on all fresh flower arrangements",
    discount: "10% OFF",
    category: "Retail",
    expiresAt: "2025-01-18",
    claimedCount: 12,
    isExclusive: false,
  },
];

export const dealCategories = [
  "All",
  "Coffee & Tea",
  "Restaurant",
  "Grocery",
  "Fitness",
  "Services",
  "Retail",
];
