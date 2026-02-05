import { ExportSettings } from './export';

// 저장되는 전체 데이터 구조
export interface StoredData {
  favorites: string[];           // 즐겨찾기 아이콘 목록
  recentSearches: string[];      // 최근 검색어
  exportSettings: ExportSettings; // 내보내기 설정
}
