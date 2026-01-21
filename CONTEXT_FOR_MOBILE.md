# 📱 Context & Remaining Plan - Hub Buy/Sell Section

## ✅ **COMPLETED FEATURES**

### 1. **Core Buy/Sell Infrastructure**
- ✅ Buy/Sell tab toggle (controlled by `buy_sell_enabled` in platform_settings)
- ✅ Category filtering system (clicking categories filters all deals/businesses)
- ✅ Deal detail sheets (full-screen drawer with deal info, promo codes, business details)
- ✅ Business detail sheets (shows business info + active deals from that business)
- ✅ Share functionality (native Web Share API on mobile, copy link on desktop)

### 2. **Components Created**
- `BusinessDetailSheet.tsx` - Full business detail view
- `DealDetailSheet.tsx` - Full deal detail view  
- `FeaturedDeals.tsx` - Featured deals carousel
- `TrendingDeals.tsx` - Trending deals (sorted by views+clicks)
- `NewListings.tsx` - New deals (last 7 days)
- `BusinessDirectory.tsx` - Grid of businesses
- `BuySellCategories.tsx` - Category grid (8 categories)
- `BusinessCard.tsx` - Business card component
- `DealCard.tsx` - Deal card component

### 3. **Hooks Created**
- `useBusiness.ts` - Fetch single business
- `useBusinesses.ts` - Fetch businesses list (with filters)
- `useDeals.ts` - Fetch deals list (with filters: cityId, category, featured, businessId)
- `useBusinessReviews.ts` - Fetch business reviews/ratings

### 4. **Integration Points**
- ✅ Hub.tsx - Main integration with state management
- ✅ All sections filter by selected category
- ✅ Click handlers connect deals → DealDetailSheet, businesses → BusinessDetailSheet
- ✅ Deal clicks in BusinessDetailSheet open DealDetailSheet

---

## 🔧 **CURRENT STATE**

### **Key Files**
```
src/pages/Hub.tsx                    - Main Hub page (2400+ lines)
src/components/hub/
  ├── BusinessDetailSheet.tsx        - Business detail modal
  ├── DealDetailSheet.tsx            - Deal detail modal
  ├── FeaturedDeals.tsx              - Featured deals section
  ├── TrendingDeals.tsx              - Trending deals section
  ├── NewListings.tsx                - New listings section
  ├── BusinessDirectory.tsx          - Business grid
  ├── BuySellCategories.tsx          - Category grid
  ├── BusinessCard.tsx                - Business card UI
  └── DealCard.tsx                    - Deal card UI

src/hooks/
  ├── useBusiness.ts                 - Single business fetch
  ├── useBusinesses.ts               - Businesses list fetch
  ├── useDeals.ts                    - Deals list fetch
  └── useBusinessReviews.ts          - Business reviews/ratings
```

### **State Management (Hub.tsx)**
```typescript
// Deal detail state
const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
const [dealSheetOpen, setDealSheetOpen] = useState(false);

// Business detail state
const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
const [businessSheetOpen, setBusinessSheetOpen] = useState(false);

// Category filter state
const [selectedBuySellCategory, setSelectedBuySellCategory] = useState<string | null>(null);
```

### **Category Filtering**
- Categories: `electronics`, `vehicles`, `home`, `fashion`, `sports`, `games`, `books`, `other`
- Clicking a category filters ALL sections:
  - Featured Deals
  - Active Deals (BuySellDealsSection)
  - Trending Deals
  - New Listings
  - Featured Businesses
  - Business Directory
- Clear filter button appears when category is selected
- Clicking same category again clears filter

---

## 📋 **REMAINING TODOs**

### **1. "View All" Navigation (6 TODOs)**
**Location:** `src/pages/Hub.tsx` lines 1780, 1805, 1827, 1852, 1456, 1542

**Current:** Scrolls to section
**Needed:** Navigate to dedicated pages or expand sections

**Sections:**
- ✅ Featured Deals - Line 1780
- ✅ Trending Deals - Line 1805  
- ✅ New Listings - Line 1827
- ✅ Business Directory - Line 1852
- ⚠️ Trending Services (Services tab) - Line 1456
- ⚠️ Recommendations (Services tab) - Line 1542

**Options:**
1. Create dedicated routes (e.g., `/deals/featured`, `/deals/trending`)
2. Expand sections in-place (show more items)
3. Open full-screen modal with all items

---

### **2. City Filtering for Deals/Businesses**
**Current:** `useDeals` and `useBusinesses` have `cityId` parameter but filtering not fully implemented

**Location:**
- `src/hooks/useDeals.ts` - Line 58: `// TODO: Filter by city if cityId is provided`
- `src/hooks/useBusinesses.ts` - Line 50: `// TODO: Filter by city if cityId is provided`

**Needed:**
- Join with businesses table for deals (deals.business_id → businesses.city)
- Filter businesses by location field or city relationship

---

### **3. Search Functionality**
**Current:** Search exists for services, but not for deals/businesses

**Needed:**
- Add search input to Buy/Sell tab
- Filter deals by title/description
- Filter businesses by name/description
- Integrate with existing `SearchFilters` component

---

### **4. Business Reviews Display**
**Current:** `useBusinessReviews` hook exists but reviews not displayed in BusinessDetailSheet

**Location:** `src/components/hub/BusinessDetailSheet.tsx`

**Needed:**
- Display reviews list in BusinessDetailSheet
- Show review count and average rating (already fetched)
- Add "Write Review" button (if authenticated)

---

### **5. Performance Optimizations**
**Potential:**
- Virtual scrolling for long lists
- Image optimization (already added lazy loading)
- Prefetching next page of results
- Memoization of filtered results

---

### **6. Empty States**
**Current:** Some sections return `null` when empty

**Needed:**
- Better empty state messages
- "Add your first deal" CTAs
- Illustration/icon for empty states

---

### **7. Error Handling**
**Current:** Basic error handling in hooks

**Needed:**
- User-friendly error messages
- Retry buttons
- Offline state handling

---

## 🎯 **RECOMMENDED NEXT STEPS** (Priority Order)

### **Phase 1: Navigation & UX**
1. **Implement "View All" pages** - Create routes for featured/trending/new deals
2. **Add search to Buy/Sell tab** - Integrate search for deals/businesses
3. **Improve empty states** - Better messaging when no results

### **Phase 2: Data & Filtering**
4. **Complete city filtering** - Implement city joins for deals/businesses
5. **Add sorting options** - Sort by price, date, popularity
6. **Add price range filter** - For deals with fixed discounts

### **Phase 3: Social Features**
7. **Display business reviews** - Show reviews in BusinessDetailSheet
8. **Add review submission** - Allow users to review businesses
9. **Add favorites/saved** - Save deals and businesses

### **Phase 4: Admin & Management**
10. **Admin deal management** - CRUD for deals in admin panel
11. **Admin business management** - Enhanced business admin features
12. **Analytics** - Track deal views, clicks, conversions

---

## 🔑 **KEY CONCEPTS**

### **Category Filtering Flow**
```
User clicks category → setSelectedBuySellCategory(catId)
  ↓
All components receive category prop
  ↓
useDeals({ category }) / useBusinesses({ category })
  ↓
Supabase query filters by category field
  ↓
UI updates with filtered results
```

### **Detail Sheet Flow**
```
User clicks card → openDealDetail(deal) / openBusinessDetail(business)
  ↓
Set state: selectedDeal/business + sheetOpen = true
  ↓
Detail sheet renders with full data
  ↓
User clicks deal in business sheet → Closes business sheet, opens deal sheet
```

### **Data Structure**
```typescript
// Deal
{
  id, business_id, title, description, discount, category,
  discount_type: "percentage" | "fixed" | "free_item",
  expires_at, promo_code, terms_conditions, status,
  image_url, views_count, clicks_count, featured
}

// Business
{
  id, user_id, name, category, location, description,
  image_url, authorization_status, operational_status,
  featured, created_at, updated_at
}
```

---

## 🐛 **KNOWN ISSUES**

1. **Empty Cards** - If cards show nothing:
   - Check console for debug logs
   - Verify businesses/deals exist in DB with correct status
   - Check: `operational_status = 'active'`, `authorization_status = 'approved'`

2. **Category Filtering** - Categories are hardcoded in `BuySellCategories.tsx`
   - Consider making them dynamic from database

3. **City Filtering** - Not fully implemented (TODOs in hooks)

---

## 📝 **QUICK REFERENCE**

### **Add New Section to Buy/Sell Tab**
```typescript
<AnimatedSection direction="up" delay={700}>
  <HubSection 
    title={t("Title", "Title")} 
    icon={Icon}
    actionLabel={t("View All", "View All")}
    onAction={() => {/* TODO */}}
  >
    <YourComponent 
      cityId={cityId}
      category={selectedBuySellCategory}
      onDealClick={openDealDetail}
    />
  </HubSection>
</AnimatedSection>
```

### **Add Category Filter to Component**
```typescript
// In component props
interface Props {
  category?: string | null;
  // ... other props
}

// In hook call
const { data } = useDeals({ cityId, category, ... });
```

---

## 🚀 **READY TO CONTINUE**

All core infrastructure is in place. Focus on:
1. **Navigation** - "View All" pages
2. **Search** - Add search to Buy/Sell
3. **City filtering** - Complete implementation
4. **Reviews** - Display in BusinessDetailSheet

**Good luck! 🎉**
