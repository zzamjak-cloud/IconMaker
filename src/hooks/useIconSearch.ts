import { useQuery } from '@tanstack/react-query';
import { iconifyApi } from '@/services/iconifyApi';
import { useDebounce } from './useDebounce';
import { SearchOptions } from '@/types/icon';

/**
 * 아이콘 검색 훅
 * - 400ms debouncing 적용
 * - TanStack Query로 자동 캐싱 (7분)
 * - AbortController로 이전 요청 자동 취소
 *
 * @param query 검색어
 * @param options 추가 검색 옵션
 * @returns 검색 결과 및 상태
 */
export function useIconSearch(query: string, options?: Partial<SearchOptions>) {
  // 400ms 디바운싱 적용
  const debouncedQuery = useDebounce(query, 400);

  // 컬렉션이 선택되었지만 검색어가 없는 경우,
  // 일반적인 검색어를 사용하여 해당 컬렉션의 아이콘들을 가져옴
  const searchQuery = options?.prefix && !debouncedQuery ? 'icon' : debouncedQuery;

  return useQuery({
    queryKey: ['icons', 'search', debouncedQuery, options],
    queryFn: () => iconifyApi.searchIcons({
      query: searchQuery,
      limit: options?.limit || 999,
      start: options?.start || 0,
      prefix: options?.prefix,
    }),
    // 검색어가 2글자 이상이거나, 컬렉션이 선택된 경우 활성화
    enabled: debouncedQuery.length >= 2 || (!!options?.prefix && debouncedQuery.length === 0),
    // Iconify API는 7일 캐싱하므로 7분 동안 데이터를 신선한 것으로 간주
    staleTime: 1000 * 60 * 7,
    // 30분간 캐시 유지
    gcTime: 1000 * 60 * 30,
  });
}
