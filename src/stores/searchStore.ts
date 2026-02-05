import { create } from 'zustand';

/**
 * 검색 상태를 관리하는 Zustand 스토어
 */
interface SearchState {
  query: string;                                    // 검색어
  selectedPrefix: string | null;                    // 선택된 아이콘 세트 필터
  setQuery: (query: string) => void;                // 검색어 설정
  setSelectedPrefix: (prefix: string | null) => void; // 필터 설정
  clearSearch: () => void;                          // 검색 초기화
}

export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  selectedPrefix: null,

  setQuery: (query) => set({ query }),

  setSelectedPrefix: (prefix) => set({ selectedPrefix: prefix }),

  clearSearch: () => set({ query: '', selectedPrefix: null }),
}));
