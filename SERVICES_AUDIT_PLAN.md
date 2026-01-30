# Services Visibility Audit – Plan & Fixes

## Goal
Ensure all **new** and **existing** services that are approved and visible show consistently across the app (Hub, provider list per subcategory, trending, activity feed, recommendations, most demanded).

---

## 1. Where services are shown

| Place | Source | How it’s filtered |
|-------|--------|--------------------|
| **Hub – Featured carousel** | Hub inline query | `is_featured`, `is_active`, `is_visible`, `is_paused`, `approval_status`, `deleted_at` ✅ |
| **Hub – Provider list (per subcategory)** | **ServiceDetailSheet** | category (and optional city); visibility filters in query |
| **useServices (global list)** | useServices.fetchAllServices | `deleted_at`, `is_active` in query; then client-side `is_visible`, `!is_paused`, `approval_status === 'approved'` ✅ |
| **Activity feed** | useActivityFeed | `is_active`, `is_visible`, `approval_status`; missing `is_paused`, `deleted_at` ❌ |
| **Trending** | useTrendingServices | `is_active`, `is_visible` only; missing `approval_status`, `is_paused`, `deleted_at` ❌ |
| **Recommendations** | useRecommendations | `is_active`, `is_visible` only; missing `approval_status`, `is_paused`, `deleted_at` ❌ |
| **Most demanded** | useMostDemandedServices | RPC ✅; fallback uses `exclude_from_demand` (column may be missing) ⚠️ |

---

## 2. Root causes for “new services not showing”

### 2.1 Category mismatch (provider list when opening a subcategory)
- **ServiceDetailSheet** filters by `service.category` only (single value).
- Hub passes `selectedSubcategory.name` (optionally trimmed) and **not** `normalizeCategory(...)`.
- **ServiceCreator** stores `normalizeCategory(subcategory.name)` (trim + collapse spaces).
- **Mismatch:** Hub uses `(name || "").trim()`; creator uses `normalizeCategory(name)`. Different spacing can make the same logical category not match.
- **Also:** Services saved with **Arabic** subcategory name (`name_ar`) never match when the sheet filters by **English** `name` only.

**Fixes:**
- Hub: set `category: normalizeCategory(selectedSubcategory.name)` when building `selectedSheetService`.
- ServiceDetailSheet: when `categoryNameAr` is present, filter by `(category eq name OR category eq name_ar)` so both languages match.

### 2.2 Incomplete visibility filters
- **useTrendingServices:** Missing `approval_status`, `is_paused`, `deleted_at` → can show or hide rows inconsistently with RLS/rest of app.
- **useRecommendations:** Same missing filters.
- **useActivityFeed:** Missing `is_paused`, `deleted_at`.
- **ServiceDetailSheet:** Does not add `.is("deleted_at", null)` (RLS may hide them, but the query should be explicit for consistency and clarity).

**Fixes:** Add the same visibility rules everywhere:  
`deleted_at IS NULL`, `is_active = true`, `is_visible = true`, `is_paused = false`, `approval_status = 'approved'`.

### 2.3 “Trending” and “Recommendations” bias against new services
- Both sort by `views_count DESC` and take top N. New services have 0 views, so they appear at the end and are cut off.
- This is **intentional** for “trending/popular” but can feel like “new services don’t show” in those sections. No change required for logic; only ensure filters above are correct so any new services that do qualify (e.g. in other sections) are not excluded by missing filters.

### 2.4 useMostDemandedServices fallback
- Fallback uses `.eq("exclude_from_demand", false)`. The column may not exist in all environments (only referenced inside the RPC in migrations).
- If the column is missing, the fallback fails and “Most demanded” shows nothing.

**Fix:** Make fallback robust: try without `exclude_from_demand`, or catch and retry without that filter so “Most demanded” still shows when the RPC fails.

---

## 3. Implementation checklist

- [x] **ServiceDetailSheet**
  - Add `.is("deleted_at", null)` to the visibility filters.
  - Use `categoryName` and `categoryNameAr` to build `(category eq name OR category eq name_ar)` when both are available.
- [x] **Hub**
  - Use `normalizeCategory(selectedSubcategory.name)` for `selectedSheetService.category` (and keep passing `categoryName` / `categoryNameAr` for the sheet).
- [x] **useTrendingServices**
  - Add `.eq("approval_status", "approved").eq("is_paused", false).is("deleted_at", null)`.
- [x] **useRecommendations**
  - Same visibility filters as above.
- [x] **useActivityFeed**
  - Add `.eq("is_paused", false).is("deleted_at", null)` to both “new” and “popular” queries.
- [x] **useMostDemandedServices**
  - In the fallback, on "column does not exist" error, retry without `exclude_from_demand` so the fallback works when the column is missing.
- [x] **useSimilarServices** (follow-up)
  - Add `.is("deleted_at", null)` so "Similar services" never shows soft-deleted rows.

---

## 4. Behaviour after fixes

- **Provider list (subcategory):** Matches both English and Arabic subcategory names when provided; category string is normalized the same way as in ServiceCreator; only non-deleted, approved, visible, active, non-paused services are shown.
- **Activity / Trending / Recommendations:** Same visibility rules everywhere; new services that meet those rules can appear (especially in activity’s “new” part and in provider list); trending/recommendations remain biased toward high views by design.
- **Most demanded:** Fallback continues to work even when `exclude_from_demand` is not in the schema, so the section does not disappear when the RPC fails.
