import { useState, useCallback, useMemo } from "react";

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface UsePaginationOptions {
  initialPage?: number;
  pageSize?: number;
  total?: number;
}

export function useServicePagination(options: UsePaginationOptions = {}) {
  const { initialPage = 1, pageSize = 12, total = 0 } = options;
  const [page, setPage] = useState(initialPage);

  const totalPages = useMemo(() => {
    return Math.ceil(total / pageSize);
  }, [total, pageSize]);

  const hasNextPage = useMemo(() => {
    return page < totalPages;
  }, [page, totalPages]);

  const hasPreviousPage = useMemo(() => {
    return page > 1;
  }, [page]);

  const goToPage = useCallback((newPage: number) => {
    setPage(Math.max(1, Math.min(newPage, totalPages)));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setPage((prev) => prev + 1);
    }
  }, [hasNextPage]);

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      setPage((prev) => prev - 1);
    }
  }, [hasPreviousPage]);

  const reset = useCallback(() => {
    setPage(1);
  }, []);

  const startIndex = useMemo(() => {
    return (page - 1) * pageSize;
  }, [page, pageSize]);

  const endIndex = useMemo(() => {
    return Math.min(startIndex + pageSize, total);
  }, [startIndex, pageSize, total]);

  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    goToPage,
    nextPage,
    previousPage,
    reset,
    startIndex,
    endIndex,
  };
}
