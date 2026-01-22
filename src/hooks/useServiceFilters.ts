import { useState, useCallback } from "react";

export type SortOption = "relevance" | "price_low" | "price_high" | "rating" | "newest" | "popular";

export interface ServiceFilters {
  priceRange: [number, number];
  categories: string[];
  subcategories: string[];
  city: string | null;
  subCity: string | null;
  minRating: number;
  verifiedOnly: boolean;
  featuredOnly: boolean;
  trendingOnly: boolean;
  sortBy: SortOption;
}

const DEFAULT_FILTERS: ServiceFilters = {
  priceRange: [0, 10000],
  categories: [],
  subcategories: [],
  city: null,
  subCity: null,
  minRating: 0,
  verifiedOnly: false,
  featuredOnly: false,
  trendingOnly: false,
  sortBy: "relevance",
};

export function useServiceFilters(initialFilters?: Partial<ServiceFilters>) {
  const [filters, setFilters] = useState<ServiceFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });

  const updateFilters = useCallback((updates: Partial<ServiceFilters>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const hasActiveFilters = useCallback(() => {
    return (
      filters.priceRange[0] !== DEFAULT_FILTERS.priceRange[0] ||
      filters.priceRange[1] !== DEFAULT_FILTERS.priceRange[1] ||
      filters.categories.length > 0 ||
      filters.subcategories.length > 0 ||
      filters.city !== null ||
      filters.subCity !== null ||
      filters.minRating > 0 ||
      filters.verifiedOnly ||
      filters.featuredOnly ||
      filters.trendingOnly ||
      filters.sortBy !== "relevance"
    );
  }, [filters]);

  const getActiveFilterCount = useCallback(() => {
    let count = 0;
    if (filters.priceRange[0] !== DEFAULT_FILTERS.priceRange[0] || filters.priceRange[1] !== DEFAULT_FILTERS.priceRange[1]) count++;
    if (filters.categories.length > 0) count += filters.categories.length;
    if (filters.subcategories.length > 0) count += filters.subcategories.length;
    if (filters.city) count++;
    if (filters.subCity) count++;
    if (filters.minRating > 0) count++;
    if (filters.verifiedOnly) count++;
    if (filters.featuredOnly) count++;
    if (filters.trendingOnly) count++;
    if (filters.sortBy !== "relevance") count++;
    return count;
  }, [filters]);

  return {
    filters,
    updateFilters,
    clearFilters,
    hasActiveFilters: hasActiveFilters(),
    activeFilterCount: getActiveFilterCount(),
  };
}
