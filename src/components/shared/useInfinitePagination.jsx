import { useInfiniteQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCallback } from 'react';

export function useInfinitePagination(entityName, filters = {}, options = {}) {
  const {
    pageSize = 20,
    sortBy = '-created_date',
    enableRefetch = true,
    refetchInterval = 60000
  } = options;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
    refetch
  } = useInfiniteQuery({
    queryKey: [entityName, filters, sortBy],
    queryFn: async ({ pageParam = 0 }) => {
      const skip = pageParam * pageSize;
      
      // Use cursor-based pagination with ID
      let query = { ...filters };
      if (pageParam > 0 && data?.pages?.length > 0) {
        const lastPage = data.pages[data.pages.length - 1];
        const lastItem = lastPage.items[lastPage.items.length - 1];
        if (lastItem?.id) {
          query.id = { $lt: lastItem.id };
        }
      }

      const results = await base44.entities[entityName].filter(
        query,
        sortBy,
        pageSize + 1 // Fetch one extra to check if more exists
      );

      const hasMore = results.length > pageSize;
      const items = hasMore ? results.slice(0, pageSize) : results;

      return {
        items,
        nextPage: hasMore ? pageParam + 1 : null,
        hasMore
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    refetchInterval: enableRefetch ? refetchInterval : false,
    staleTime: 30000,
    cacheTime: 300000
  });

  const allItems = data?.pages.flatMap(page => page.items) || [];

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return {
    items: allItems,
    loadMore,
    hasMore: hasNextPage,
    isLoadingMore: isFetchingNextPage,
    isLoading,
    error,
    refetch
  };
}