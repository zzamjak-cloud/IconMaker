import {
  SvgIconCategory,
  SvgWorkspaceData,
  SvgIconStylePreset,
  SvgIconViewBox,
} from '../../types/svgIcon';

export interface SvgIconStylePresetInfo {
  id: SvgIconStylePreset;
  label: string;
  description: string;
}

export const SVG_ICON_STYLE_PRESETS: SvgIconStylePresetInfo[] = [
  {
    id: 'casual-bold',
    label: '캐주얼 볼드',
    description: '굵은 외곽선, 밝은 색, 약한 그림자',
  },
  {
    id: 'flat-ui',
    label: '플랫 UI',
    description: '작은 파일 크기와 명확한 실루엣',
  },
  {
    id: 'neon-arcade',
    label: '네온 아케이드',
    description: '어두운 게임 UI에 맞는 제한적 glow',
  },
  {
    id: 'pixel-ish',
    label: '픽셀 느낌',
    description: '격자감 있는 단순 도형 기반 SVG',
  },
  {
    id: 'minimal-line',
    label: '미니멀 라인',
    description: '설정, 메뉴, HUD에 맞는 선형 아이콘',
  },
];

// 캐주얼 게임에 자주 쓰이는 기본 카테고리. recommendedQuery는 영어(검색 정확도가 더 높음).
const DEFAULT_CATEGORY_TEMPLATES = [
  { name: '전투', description: '공격, 방어, 치명타, 회피, 타겟', color: '#ef4444', recommendedQuery: 'sword' },
  { name: '스킬 속성', description: '불, 물, 얼음, 번개, 독, 빛, 어둠', color: '#f59e0b', recommendedQuery: 'fire' },
  { name: '아이템', description: '검, 방패, 물약, 열쇠, 상자, 보석', color: '#10b981', recommendedQuery: 'potion' },
  { name: '상태 효과', description: '버프, 디버프, 기절, 회복, 보호막', color: '#8b5cf6', recommendedQuery: 'shield' },
  { name: 'UI', description: '시작, 설정, 상점, 인벤토리, 지도', color: '#0ea5e9', recommendedQuery: 'settings' },
  { name: '자원', description: '에너지, 하트, 마나, 경험치, 스태미나', color: '#eab308', recommendedQuery: 'energy' },
  { name: '재화', description: '코인, 골드, 보석, 다이아, 토큰', color: '#facc15', recommendedQuery: 'coin' },
  { name: '캐릭터', description: '아바타, 영웅, 적, NPC, 직업', color: '#f472b6', recommendedQuery: 'character' },
  { name: '펫/탈것', description: '펫, 동물, 탈것, 드래곤', color: '#22c55e', recommendedQuery: 'pet' },
  { name: '건물/시설', description: '집, 성, 상점, 공장, 농장', color: '#a855f7', recommendedQuery: 'castle' },
  { name: '음식', description: '과일, 채소, 디저트, 음료', color: '#fb923c', recommendedQuery: 'food' },
  { name: '자연/환경', description: '나무, 꽃, 물, 바위, 날씨', color: '#34d399', recommendedQuery: 'tree' },
  { name: '보상/상자', description: '상자, 선물, 보물, 가챠', color: '#e879f9', recommendedQuery: 'chest' },
  { name: '업적/랭킹', description: '트로피, 메달, 별, 왕관, 리더보드', color: '#fbbf24', recommendedQuery: 'trophy' },
  { name: '소셜', description: '채팅, 친구, 길드, 좋아요, 공유', color: '#38bdf8', recommendedQuery: 'chat' },
  { name: '방향/조작', description: '화살표, 이동, 메뉴, 닫기, 재생', color: '#94a3b8', recommendedQuery: 'arrow' },
  { name: '사운드/설정', description: '소리, 음악, 음량, 알림, 진동', color: '#60a5fa', recommendedQuery: 'sound' },
  { name: '감정/이모지', description: '표정, 이모지, 하트, 반응', color: '#fda4af', recommendedQuery: 'emoji' },
  { name: '도구', description: '망치, 곡괭이, 렌치, 제작', color: '#cbd5e1', recommendedQuery: 'hammer' },
  { name: '탐험/지도', description: '지도, 나침반, 깃발, 위치', color: '#2dd4bf', recommendedQuery: 'map' },
];

// 카테고리 이름 → 추천 검색어(영어) 조회표. 저장된 카테고리에 recommendedQuery가 없을 때의 폴백.
export const RECOMMENDED_QUERY_BY_CATEGORY_NAME: Record<string, string> = DEFAULT_CATEGORY_TEMPLATES.reduce(
  (acc, template) => {
    acc[template.name] = template.recommendedQuery;
    return acc;
  },
  {} as Record<string, string>
);

// 카테고리의 추천 검색어를 구한다(저장값 우선, 이름 매칭 폴백).
export function getRecommendedQueryForCategory(category: SvgIconCategory | null | undefined): string {
  if (!category) return '';
  return category.recommendedQuery ?? RECOMMENDED_QUERY_BY_CATEGORY_NAME[category.name] ?? '';
}

// 워크스페이스 첫 진입 시 검색 입력 기본값(영어)
export const DEFAULT_SVG_ICON_SEARCH_QUERY = DEFAULT_CATEGORY_TEMPLATES[0]?.recommendedQuery ?? 'sword';

export const SVG_ICON_VIEW_BOXES: SvgIconViewBox[] = [
  '0 0 64 64',
  '0 0 100 100',
  '0 0 128 128',
  '0 0 256 256',
  '0 0 512 512',
];

export function getSvgIconViewBoxLabel(viewBox: string): string {
  const [, , width, height] = viewBox.trim().split(/\s+/);
  return width && height ? `${width}x${height}` : viewBox;
}

export function createSvgIconId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// 기본 SVG 워크스페이스 데이터 생성 (StyleStudio의 createDefaultSvgIconSessionData를 개명)
export function createDefaultSvgWorkspaceData(): SvgWorkspaceData {
  const now = new Date().toISOString();
  const categories: SvgIconCategory[] = DEFAULT_CATEGORY_TEMPLATES.map((template) => ({
    id: createSvgIconId('svg-cat'),
    name: template.name,
    description: template.description,
    color: template.color,
    recommendedQuery: template.recommendedQuery,
    iconIds: [],
    createdAt: now,
    updatedAt: now,
  }));

  return {
    categories,
    icons: [],
    selectedCategoryId: categories[0]?.id,
    stylePreset: 'casual-bold',
    defaultViewBox: '0 0 64 64',
    customColorPresets: [],
    updatedAt: now,
  };
}

export function getSvgIconStylePresetInfo(stylePreset: SvgIconStylePreset): SvgIconStylePresetInfo {
  return SVG_ICON_STYLE_PRESETS.find((preset) => preset.id === stylePreset) ?? SVG_ICON_STYLE_PRESETS[0];
}
