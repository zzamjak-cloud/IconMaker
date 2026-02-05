// 아이콘 기본 정보
export interface Icon {
  provider: string;
  prefix: string;      // 예: "mdi"
  name: string;        // 예: "home"
  fullName: string;    // 예: "mdi:home"
}

// 검색 결과
export interface IconSearchResult {
  icons: string[];     // ["mdi:home", "lucide:home"]
  total: number;
  limit: number;
  start: number;
}

// 아이콘 상세 정보
export interface IconDetails extends Icon {
  svg: string;         // SVG 문자열
  width: number;
  height: number;
  categories?: string[];
  tags?: string[];
}

// 검색 옵션
export interface SearchOptions {
  query: string;
  limit?: number;      // 기본값: 64
  start?: number;
  prefix?: string;     // 특정 컬렉션으로 제한
}
