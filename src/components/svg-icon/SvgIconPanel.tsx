import { type MouseEvent as ReactMouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Code2,
  Copy,
  Download,
  ExternalLink,
  FolderPlus,
  Grid3x3,
  Loader2,
  Palette,
  Plus,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import {
  SvgGameIcon,
  SvgIconCategory,
  SvgIconColorMode,
  SvgIconColorPreset,
  SvgIconEffects,
  SvgIconFinishMode,
  SvgIconSearchResult,
  SvgIconStyleSnapshot,
  SvgIconViewBox,
} from '@/types/svgIcon';
import {
  DEFAULT_SVG_ICON_SEARCH_QUERY,
  SVG_ICON_VIEW_BOXES,
  createSvgIconId,
  getRecommendedQueryForCategory,
  getSvgIconViewBoxLabel,
} from '@/lib/svgIcon/svgIconDefaults';
import {
  DEFAULT_SVG_ICON_EFFECTS,
  SVG_ICON_COLOR_PRESETS,
  applySvgIconStyle,
  normalizeSvgIconEffects,
} from '@/lib/svgIcon/svgIconStyle';
import {
  SVG_ICON_SOURCE_PACKS,
  SvgIconSourcePackId,
  expandSvgIconSearchQuery,
  searchSvgIcons,
} from '@/lib/svgIcon/svgIconSearch';
import {
  buildHtmlIconSnippet,
  buildStandaloneSvg,
  buildSvgDataUri,
  buildSvgSprite,
} from '@/lib/svgIcon/svgIconExport';
import { useSvgWorkspace } from '@/hooks/useSvgWorkspace';
import { exportService } from '@/services/exportService';
import { ColorSwatchPicker } from './ColorSwatchPicker';

const CATEGORY_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#0ea5e9', '#8b5cf6', '#eab308', '#ec4899'];
const SEARCH_LIMIT_OPTIONS = [24, 48, 72];
const OUTLINE_WIDTH_MAX = 64;
const OUTLINE_WIDTH_PERCEIVED_RATIO = 4;
// 색상 모드(원본/단색/투톤)와 마감(그레디언트/입체)을 하나로 통합한 스타일 종류.
// 그레디언트/입체는 색상 모드를 무시하므로 별도 컨트롤로 둘 필요가 없다.
type SvgIconStyleKind = 'original' | 'monochrome' | 'duotone' | 'gradient' | 'raised';
const STYLE_OPTIONS: Array<{ id: SvgIconStyleKind; label: string }> = [
  { id: 'original', label: '원본' },
  { id: 'monochrome', label: '단색' },
  { id: 'duotone', label: '투톤' },
  { id: 'gradient', label: '그레디언트' },
  { id: 'raised', label: '입체' },
];

// 스타일 종류 → (colorMode, finishMode). 그레디언트/입체는 colorMode를 무시하므로 단색으로 둔다.
function styleKindToModes(kind: SvgIconStyleKind): { colorMode: SvgIconColorMode; finishMode: SvgIconFinishMode } {
  switch (kind) {
    case 'monochrome':
      return { colorMode: 'monochrome', finishMode: 'flat' };
    case 'duotone':
      return { colorMode: 'duotone', finishMode: 'flat' };
    case 'gradient':
      return { colorMode: 'monochrome', finishMode: 'gradient' };
    case 'raised':
      return { colorMode: 'monochrome', finishMode: 'raised' };
    case 'original':
    default:
      return { colorMode: 'original', finishMode: 'flat' };
  }
}

// (colorMode, finishMode) → 스타일 종류. 마감(그레디언트/입체) 우선.
function modesToStyleKind(colorMode: SvgIconColorMode, finishMode: SvgIconFinishMode): SvgIconStyleKind {
  if (finishMode === 'gradient') return 'gradient';
  if (finishMode === 'raised') return 'raised';
  if (colorMode === 'monochrome') return 'monochrome';
  if (colorMode === 'duotone') return 'duotone';
  return 'original';
}

function formatPerceivedOutlineWidth(width: number): string {
  const perceivedWidth = width / OUTLINE_WIDTH_PERCEIVED_RATIO;
  return Number.isInteger(perceivedWidth) ? String(perceivedWidth) : perceivedWidth.toFixed(1);
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

export function SvgIconPanel() {
  // SVG 워크스페이스 영속성 훅 (자기완결형: App.tsx 결합 최소화)
  const { workspace, updateWorkspace } = useSvgWorkspace();

  const [newCategoryName, setNewCategoryName] = useState('');
  const [searchQuery, setSearchQuery] = useState(DEFAULT_SVG_ICON_SEARCH_QUERY);
  const [searchLimit, setSearchLimit] = useState(48);
  const [searchResults, setSearchResults] = useState<SvgIconSearchResult[]>([]);
  const [selectedResultIds, setSelectedResultIds] = useState<Set<string>>(new Set());
  // 그리드 컬럼 수 — IconMaker 검색 뷰와 독립적으로 동작하는 패널 전용 상태
  const [gridColumns, setGridColumns] = useState(5);
  const [selectedSourcePackIds, setSelectedSourcePackIds] = useState<Set<SvgIconSourcePackId>>(
    new Set(['game', 'ui', 'pixel'])
  );
  const [savedSearchQuery, setSavedSearchQuery] = useState('');
  const [savedIconQuery, setSavedIconQuery] = useState('');
  const [selectedIconId, setSelectedIconId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [pendingDeleteCategoryId, setPendingDeleteCategoryId] = useState<string | null>(null);
  const [deletedIcon, setDeletedIcon] = useState<SvgGameIcon | null>(null);
  const [colorMode, setColorMode] = useState<SvgIconColorMode>('original');
  const [finishMode, setFinishMode] = useState<SvgIconFinishMode>('flat');
  const [primaryColor, setPrimaryColor] = useState(SVG_ICON_COLOR_PRESETS[0].primary);
  const [accentColor, setAccentColor] = useState(SVG_ICON_COLOR_PRESETS[0].accent);
  const [outlineColor, setOutlineColor] = useState('#0f172a');
  const [outlineWidth, setOutlineWidth] = useState(3);
  const [outlineEnabled, setOutlineEnabled] = useState(false);
  const [effects, setEffects] = useState<SvgIconEffects>(DEFAULT_SVG_ICON_EFFECTS);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [iconSelection, setIconSelection] = useState<Set<string>>(new Set());
  const [draggingIconIds, setDraggingIconIds] = useState<string[]>([]);
  const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const selectionAnchorRef = useRef<string | null>(null);
  // 마우스 기반 드래그 상태(WKWebView에서 HTML5 DnD가 불안정해 기존 사이드바와 동일한 방식 사용).
  const iconDragRef = useRef<{
    ids: string[];
    startX: number;
    startY: number;
    active: boolean;
    targetCategoryId: string | null;
  }>({ ids: [], startX: 0, startY: 0, active: false, targetCategoryId: null });
  const moveIconsToCategoryRef = useRef<(iconIds: string[], targetCategoryId: string) => void>(() => {});
  const suppressIconClickRef = useRef(false);

  const selectedCategoryId = workspace.selectedCategoryId ?? workspace.categories[0]?.id;
  const selectedCategory = workspace.categories.find((category) => category.id === selectedCategoryId) ?? null;
  const selectedIcon = workspace.icons.find((icon) => icon.id === selectedIconId) ?? null;

  // 통합 스타일 셀렉터: 현재 (colorMode, finishMode)로부터 종류를 파생하고, 선택 시 둘을 함께 설정.
  const currentStyleKind = modesToStyleKind(colorMode, finishMode);
  const handleSelectStyle = (kind: SvgIconStyleKind) => {
    const modes = styleKindToModes(kind);
    setColorMode(modes.colorMode);
    setFinishMode(modes.finishMode);
  };

  const selectedCategoryIcons = useMemo(() => {
    const query = savedIconQuery.trim().toLowerCase();
    return workspace.icons
      .filter((icon) => icon.categoryId === selectedCategoryId)
      .filter((icon) => {
        if (!query) return true;
        return (
          icon.name.toLowerCase().includes(query) ||
          icon.prompt.toLowerCase().includes(query) ||
          icon.tags.some((tag) => tag.toLowerCase().includes(query)) ||
          icon.sourceName?.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => Number(Boolean(b.favorite)) - Number(Boolean(a.favorite)));
  }, [savedIconQuery, selectedCategoryId, workspace.icons]);

  const selectedResults = useMemo(
    () => searchResults.filter((result) => selectedResultIds.has(result.id)),
    [searchResults, selectedResultIds]
  );

  const expandedSearchTerms = useMemo(() => expandSvgIconSearchQuery(searchQuery), [searchQuery]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const styleSvg = useCallback(
    (svg: string) =>
      applySvgIconStyle(svg, {
        colorMode,
        finishMode,
        primaryColor,
        accentColor,
        outlineColor,
        outlineWidth,
        outlineEnabled,
        stylePreset: workspace.stylePreset,
        viewBox: workspace.defaultViewBox,
        effects,
      }),
    [accentColor, colorMode, effects, finishMode, outlineColor, outlineEnabled, outlineWidth, primaryColor, workspace.defaultViewBox, workspace.stylePreset]
  );

  const getCurrentStyleSnapshot = useCallback(
    (): SvgIconStyleSnapshot => ({
      colorMode,
      finishMode,
      primaryColor,
      accentColor,
      outlineColor,
      outlineWidth,
      outlineEnabled,
      stylePreset: workspace.stylePreset,
      viewBox: workspace.defaultViewBox,
      effects,
    }),
    [accentColor, colorMode, effects, finishMode, outlineColor, outlineEnabled, outlineWidth, primaryColor, workspace.defaultViewBox, workspace.stylePreset]
  );

  const selectedIconPreviewSvg = useMemo(
    () => (selectedIcon ? styleSvg(selectedIcon.originalSvg ?? selectedIcon.svg) : ''),
    [selectedIcon, styleSvg]
  );

  const selectedIconForExport = useMemo(
    () =>
      selectedIcon
        ? {
            ...selectedIcon,
            svg: selectedIconPreviewSvg,
            stylePreset: workspace.stylePreset,
            viewBox: workspace.defaultViewBox,
            styleSnapshot: getCurrentStyleSnapshot(),
          }
        : null,
    [getCurrentStyleSnapshot, selectedIcon, selectedIconPreviewSvg, workspace.defaultViewBox, workspace.stylePreset]
  );

  const selectedIconExportSvg = useMemo(
    () => (selectedIconForExport ? buildStandaloneSvg(selectedIconForExport) : ''),
    [selectedIconForExport]
  );

  const buildIconForExport = useCallback(
    (icon: SvgGameIcon): SvgGameIcon => {
      if (selectedIconForExport && icon.id === selectedIconForExport.id) {
        return selectedIconForExport;
      }
      if (icon.originalSvg && icon.styleSnapshot) {
        return {
          ...icon,
          svg: applySvgIconStyle(icon.originalSvg, icon.styleSnapshot),
          stylePreset: icon.styleSnapshot.stylePreset,
          viewBox: icon.styleSnapshot.viewBox,
        };
      }
      return icon;
    },
    [selectedIconForExport]
  );

  const buildIconPreviewSvg = useCallback(
    (icon: SvgGameIcon) => buildStandaloneSvg(buildIconForExport(icon)),
    [buildIconForExport]
  );

  const buildSearchResultPreviewSvg = useCallback(
    (result: SvgIconSearchResult) =>
      buildStandaloneSvg({
        id: result.id,
        categoryId: selectedCategoryId ?? 'preview',
        name: result.name,
        prompt: '',
        svg: styleSvg(result.svg),
        originalSvg: result.svg,
        tags: result.tags,
        stylePreset: workspace.stylePreset,
        viewBox: workspace.defaultViewBox,
        source: result.source,
        sourceId: result.id,
        sourceName: result.sourceName,
        sourceUrl: result.sourceUrl,
        license: result.license,
        createdAt: '',
        updatedAt: '',
      }),
    [selectedCategoryId, workspace.defaultViewBox, workspace.stylePreset, styleSvg]
  );

  const applyStyleSnapshotToControls = (snapshot?: SvgIconStyleSnapshot) => {
    if (!snapshot) return;
    setColorMode(snapshot.colorMode);
    // 구버전 'outlined' finishMode는 외곽선 토글로 마이그레이션하고 finishMode는 기본으로 정리
    setFinishMode(snapshot.finishMode === 'outlined' ? 'flat' : snapshot.finishMode);
    setOutlineEnabled(snapshot.outlineEnabled ?? snapshot.finishMode === 'outlined');
    setPrimaryColor(snapshot.primaryColor);
    setAccentColor(snapshot.accentColor);
    setOutlineColor(snapshot.outlineColor);
    setOutlineWidth(Math.min(Math.max(snapshot.outlineWidth, 1), OUTLINE_WIDTH_MAX));
    setEffects(normalizeSvgIconEffects(snapshot.effects));
    handleSettingChange(snapshot.viewBox);
  };

  const handleSelectSavedIcon = (icon: SvgGameIcon) => {
    setSelectedIconId(icon.id);
    applyStyleSnapshotToControls(icon.styleSnapshot);
  };

  const toggleIconSelection = (iconId: string) => {
    setIconSelection((prev) => {
      const next = new Set(prev);
      if (next.has(iconId)) next.delete(iconId);
      else next.add(iconId);
      return next;
    });
  };

  // Shift+클릭: 직전 클릭(앵커)부터 클릭한 아이콘까지 범위를 선택에 추가한다.
  const handleShiftSelectIcon = (icon: SvgGameIcon) => {
    const list = selectedCategoryIcons;
    const clickedIndex = list.findIndex((item) => item.id === icon.id);
    if (clickedIndex === -1) return;
    const anchorId = selectionAnchorRef.current;
    const anchorIndex = anchorId ? list.findIndex((item) => item.id === anchorId) : -1;
    setIconSelection((prev) => {
      const next = new Set(prev);
      if (anchorIndex === -1) {
        next.add(icon.id);
      } else {
        const [start, end] = anchorIndex <= clickedIndex ? [anchorIndex, clickedIndex] : [clickedIndex, anchorIndex];
        for (let i = start; i <= end; i += 1) next.add(list[i].id);
      }
      return next;
    });
  };

  // 마우스 누름: 옮길 대상을 기록한다(선택 포함 시 선택 전체, 아니면 해당 아이콘). 임계값을 넘어야 드래그 시작.
  const handleIconMouseDown = (event: ReactMouseEvent, icon: SvgGameIcon) => {
    if (event.button !== 0) return;
    suppressIconClickRef.current = false;
    const ids = iconSelection.has(icon.id) && iconSelection.size > 0 ? Array.from(iconSelection) : [icon.id];
    iconDragRef.current = { ids, startX: event.clientX, startY: event.clientY, active: false, targetCategoryId: null };
  };

  const moveIconsToCategory = (iconIds: string[], targetCategoryId: string) => {
    const idSet = new Set(iconIds);
    const movedIcons = workspace.icons.filter((icon) => idSet.has(icon.id) && icon.categoryId !== targetCategoryId);
    if (movedIcons.length === 0) {
      setIconSelection(new Set());
      return;
    }

    const movedIds = movedIcons.map((icon) => icon.id);
    const movedIdSet = new Set(movedIds);
    const now = new Date().toISOString();
    const targetName = workspace.categories.find((category) => category.id === targetCategoryId)?.name ?? '';

    updateWorkspace({
      ...workspace,
      icons: workspace.icons.map((icon) =>
        movedIdSet.has(icon.id) ? { ...icon, categoryId: targetCategoryId, updatedAt: now } : icon
      ),
      categories: workspace.categories.map((category) => {
        if (category.id === targetCategoryId) {
          const remaining = category.iconIds.filter((id) => !movedIdSet.has(id));
          return { ...category, iconIds: [...movedIds, ...remaining], updatedAt: now };
        }
        if (category.iconIds.some((id) => movedIdSet.has(id))) {
          return { ...category, iconIds: category.iconIds.filter((id) => !movedIdSet.has(id)), updatedAt: now };
        }
        return category;
      }),
    });

    setIconSelection(new Set());
    setToast(`${movedIcons.length}개 아이콘을 ${targetName}(으)로 이동`);
  };

  moveIconsToCategoryRef.current = moveIconsToCategory;

  // 전역 마우스 이동/해제로 드래그를 처리한다(사이드바와 동일한 패턴).
  useEffect(() => {
    const handleMove = (event: MouseEvent) => {
      const drag = iconDragRef.current;
      if (drag.ids.length === 0) return;

      if (!drag.active) {
        const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
        if (distance <= 6) return;
        drag.active = true;
        setDraggingIconIds(drag.ids);
      }

      setDragPosition({ x: event.clientX, y: event.clientY });
      const element = document.elementFromPoint(event.clientX, event.clientY) as Element | null;
      const target = element?.closest('[data-category-drop-id]') ?? null;
      const targetId = target ? target.getAttribute('data-category-drop-id') : null;
      drag.targetCategoryId = targetId;
      setDragOverCategoryId((prev) => (prev === targetId ? prev : targetId));
    };

    const handleUp = () => {
      const drag = iconDragRef.current;
      const wasActive = drag.active;
      const ids = drag.ids;
      const targetId = drag.targetCategoryId;
      iconDragRef.current = { ids: [], startX: 0, startY: 0, active: false, targetCategoryId: null };
      if (!wasActive) return; // 단순 클릭은 무시

      suppressIconClickRef.current = true; // 드래그 직후의 click 이벤트 무시
      setDraggingIconIds([]);
      setDragOverCategoryId(null);
      setDragPosition(null);
      if (ids.length > 0 && targetId) moveIconsToCategoryRef.current(ids, targetId);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, []);

  const handleCategorySelect = (categoryId: string) => {
    updateWorkspace({ ...workspace, selectedCategoryId: categoryId });
    setSelectedIconId(null);
    setPendingDeleteCategoryId(null);
    // 카테고리 추천 검색어(영어)를 검색 입력에 자동 채움
    const nextCategory = workspace.categories.find((category) => category.id === categoryId) ?? null;
    const recommended = getRecommendedQueryForCategory(nextCategory);
    if (recommended) setSearchQuery(recommended);
  };

  const handleCreateCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;

    const now = new Date().toISOString();
    const category: SvgIconCategory = {
      id: createSvgIconId('svg-cat'),
      name,
      color: CATEGORY_COLORS[workspace.categories.length % CATEGORY_COLORS.length],
      iconIds: [],
      createdAt: now,
      updatedAt: now,
    };

    updateWorkspace({
      ...workspace,
      categories: [...workspace.categories, category],
      selectedCategoryId: category.id,
    });
    setNewCategoryName('');
    setSelectedIconId(null);
  };

  const handleDeleteCategory = (category: SvgIconCategory) => {
    if (workspace.categories.length <= 1) {
      setError('카테고리는 최소 1개가 필요합니다.');
      return;
    }

    if (pendingDeleteCategoryId !== category.id) {
      setPendingDeleteCategoryId(category.id);
      return;
    }

    const nextCategories = workspace.categories.filter((item) => item.id !== category.id);
    const deletedIconIds = new Set(category.iconIds);
    updateWorkspace({
      ...workspace,
      categories: nextCategories,
      icons: workspace.icons.filter((icon) => !deletedIconIds.has(icon.id)),
      selectedCategoryId: nextCategories[0]?.id,
    });
    setPendingDeleteCategoryId(null);
    setSelectedIconId(null);
    setToast(`${category.name} 삭제됨`);
  };

  const handleSettingChange = (defaultViewBox: SvgIconViewBox) => {
    updateWorkspace({ ...workspace, stylePreset: 'casual-bold', defaultViewBox });
  };

  // 현재 메인/보조 색상을 커스텀 프리셋으로 저장
  const handleSaveColorPreset = () => {
    const existing = workspace.customColorPresets ?? [];
    const isDuplicate = existing.some(
      (preset) =>
        preset.primary.toLowerCase() === primaryColor.toLowerCase() &&
        preset.accent.toLowerCase() === accentColor.toLowerCase()
    );
    if (isDuplicate) {
      setToast('이미 저장된 색상입니다.');
      return;
    }
    const preset: SvgIconColorPreset = {
      id: createSvgIconId('svg-color'),
      label: `${primaryColor} / ${accentColor}`,
      primary: primaryColor,
      accent: accentColor,
    };
    updateWorkspace({ ...workspace, customColorPresets: [...existing, preset] });
    setToast('색상 프리셋 저장됨');
  };

  // 커스텀 프리셋 삭제
  const handleDeleteColorPreset = (presetId: string) => {
    updateWorkspace({
      ...workspace,
      customColorPresets: (workspace.customColorPresets ?? []).filter((preset) => preset.id !== presetId),
    });
  };

  const handleSearchIcons = async () => {
    const query = searchQuery.trim();
    if (!query) {
      setError('검색어를 입력하세요.');
      return;
    }

    setError(null);
    setIsSearching(true);
    try {
      const results = await searchSvgIcons(query, {
        limit: searchLimit,
        stylePreset: workspace.stylePreset,
        sourcePackIds: Array.from(selectedSourcePackIds),
      });
      setSearchResults(results);
      setSelectedResultIds(new Set());
      setSavedSearchQuery(query);
      setToast(`${results.length}개 아이콘 검색됨`);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : '아이콘 검색에 실패했습니다.');
    } finally {
      setIsSearching(false);
    }
  };

  const toggleResultSelection = (resultId: string) => {
    setSelectedResultIds((prev) => {
      const next = new Set(prev);
      if (next.has(resultId)) next.delete(resultId);
      else next.add(resultId);
      return next;
    });
  };

  const toggleSourcePack = (sourcePackId: SvgIconSourcePackId) => {
    setSelectedSourcePackIds((prev) => {
      const next = new Set(prev);
      if (next.has(sourcePackId)) {
        next.delete(sourcePackId);
      } else {
        next.add(sourcePackId);
      }
      return next.size > 0 ? next : prev;
    });
  };

  const handleSaveResults = (targetResults: SvgIconSearchResult[]) => {
    if (!selectedCategory || targetResults.length === 0) return;

    const now = new Date().toISOString();
    const styleSnapshot = getCurrentStyleSnapshot();
    const newIcons: SvgGameIcon[] = targetResults.map((result) => ({
      id: createSvgIconId('svg-icon'),
      categoryId: selectedCategory.id,
      name: result.name,
      prompt: `Iconify 검색: ${savedSearchQuery || searchQuery}`,
      svg: result.svg,
      originalSvg: result.svg,
      tags: result.tags,
      stylePreset: workspace.stylePreset,
      viewBox: workspace.defaultViewBox,
      source: result.source,
      sourceId: result.id,
      sourceName: result.sourceName,
      sourceUrl: result.sourceUrl,
      license: result.license,
      styleSnapshot,
      createdAt: now,
      updatedAt: now,
    }));
    const newIconIds = newIcons.map((icon) => icon.id);

    updateWorkspace({
      ...workspace,
      icons: [...newIcons, ...workspace.icons],
      categories: workspace.categories.map((category) =>
        category.id === selectedCategory.id
          ? {
              ...category,
              iconIds: [...newIconIds, ...category.iconIds],
              updatedAt: now,
            }
          : category
      ),
    });
    setSelectedResultIds(new Set());
    setToast(`${newIcons.length}개 SVG 저장됨`);
  };

  const handleDeleteIcon = (icon: SvgGameIcon) => {
    updateWorkspace({
      ...workspace,
      icons: workspace.icons.filter((item) => item.id !== icon.id),
      categories: workspace.categories.map((category) =>
        category.id === icon.categoryId
          ? { ...category, iconIds: category.iconIds.filter((iconId) => iconId !== icon.id) }
          : category
      ),
    });
    setDeletedIcon(icon);
    setSelectedIconId(null);
    setToast(`${icon.name} 삭제됨`);
  };

  const handleUndoDeleteIcon = () => {
    if (!deletedIcon) return;
    updateWorkspace({
      ...workspace,
      icons: [deletedIcon, ...workspace.icons],
      categories: workspace.categories.map((category) =>
        category.id === deletedIcon.categoryId
          ? { ...category, iconIds: [deletedIcon.id, ...category.iconIds] }
          : category
      ),
    });
    setDeletedIcon(null);
    setToast(`${deletedIcon.name} 복구됨`);
  };

  const handleToggleFavorite = (icon: SvgGameIcon) => {
    const nextFavorite = !icon.favorite;
    updateWorkspace({
      ...workspace,
      icons: workspace.icons.map((item) =>
        item.id === icon.id ? { ...item, favorite: nextFavorite, updatedAt: new Date().toISOString() } : item
      ),
    });
    setToast(nextFavorite ? `${icon.name} 즐겨찾기 추가됨` : `${icon.name} 즐겨찾기 해제됨`);
  };

  const handleApplyStyleToIcon = (icon: SvgGameIcon) => {
    const now = new Date().toISOString();
    const styleSnapshot = getCurrentStyleSnapshot();
    updateWorkspace({
      ...workspace,
      icons: workspace.icons.map((item) =>
        item.id === icon.id
          ? {
              ...item,
              svg: item.originalSvg ?? item.svg,
              originalSvg: item.originalSvg ?? item.svg,
              stylePreset: workspace.stylePreset,
              viewBox: workspace.defaultViewBox,
              styleSnapshot,
              updatedAt: now,
            }
          : item
      ),
    });
    setToast(`${icon.name} 스타일 적용됨`);
  };

  const handleCopy = async (label: string, text: string) => {
    await copyText(text);
    setToast(`${label} 복사됨`);
  };

  // 텍스트 파일 저장(IconMaker 저장 정책: 자동저장 폴더 또는 저장 대화상자). 취소 시 토스트 없음.
  const handleSaveTextFile = async (label: string, fileName: string, text: string, extension: string) => {
    try {
      const savedPath = await exportService.saveTextFile(fileName, text, extension);
      if (savedPath) {
        setToast(`${label} 저장됨`);
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : `${label} 저장에 실패했습니다.`);
    }
  };

  // PNG 저장: Canvas 래스터화로 효과(필터) 포함. 취소 시 토스트 없음.
  const handleSavePng = async (label: string, fileName: string, svgContent: string, size = 512) => {
    try {
      const savedPath = await exportService.saveSvgAsPng(fileName, svgContent, size);
      if (savedPath) setToast(`${label} 저장됨`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : `${label} 저장에 실패했습니다.`);
    }
  };

  const draggingPreviewIcon =
    draggingIconIds.length > 0 ? workspace.icons.find((icon) => icon.id === draggingIconIds[0]) ?? null : null;

  return (
    <div className="flex h-full min-h-0 bg-slate-50 text-slate-900">
      {draggingPreviewIcon && dragPosition && (
        <div
          className="pointer-events-none fixed z-50"
          style={{ left: dragPosition.x + 14, top: dragPosition.y - 14 }}
        >
          <div className="flex items-center gap-2 rounded-lg border border-lime-400 bg-white px-2 py-1.5 shadow-xl">
            <div
              className="h-8 w-8 [&>svg]:h-full [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: buildIconPreviewSvg(draggingPreviewIcon) }}
            />
            <span className="text-xs font-bold text-slate-700">
              {draggingIconIds.length > 1 ? `${draggingIconIds.length}개 이동` : draggingPreviewIcon.name}
            </span>
          </div>
        </div>
      )}
      <aside className="w-72 shrink-0 border-r border-slate-200 bg-white flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <FolderPlus size={18} className="text-lime-600" />
            <h2 className="font-bold">SVG 아이콘 금고</h2>
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={newCategoryName}
              onChange={(event) => setNewCategoryName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleCreateCategory();
              }}
              placeholder="새 카테고리"
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-lime-500"
            />
            <button
              onClick={handleCreateCategory}
              className="rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              추가
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-3 space-y-2">
          {workspace.categories.map((category) => {
            const isActive = category.id === selectedCategoryId;
            const iconCount = workspace.icons.filter((icon) => icon.categoryId === category.id).length;
            const isDropTarget = dragOverCategoryId === category.id;
            return (
              <div
                key={category.id}
                data-category-drop-id={category.id}
                className={`flex items-center gap-2 rounded-lg ${
                  isDropTarget ? 'ring-2 ring-lime-400 ring-offset-1' : ''
                }`}
              >
                <button
                  onClick={() => handleCategorySelect(category.id)}
                  className={`min-w-0 flex-1 rounded-lg px-3 py-2 text-left text-sm ${
                    isDropTarget ? 'bg-lime-50' : isActive ? 'bg-lime-100 text-lime-950' : 'hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: category.color }} />
                    <span className="truncate font-semibold">{category.name}</span>
                    <span className="ml-auto text-xs text-slate-500">{iconCount}</span>
                  </span>
                </button>
                <button
                  onClick={() => handleDeleteCategory(category)}
                  className={`rounded-md p-2 text-xs ${
                    pendingDeleteCategoryId === category.id
                      ? 'bg-red-100 text-red-700'
                      : 'text-slate-400 hover:bg-slate-100 hover:text-red-600'
                  }`}
                  title={pendingDeleteCategoryId === category.id ? '한 번 더 누르면 삭제' : '카테고리 삭제'}
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>

        <div className="border-t border-slate-200 p-3 space-y-2">
          <button
            onClick={() =>
              void handleSaveTextFile(
                '전체 Sprite',
                'svg-icon-sprite.svg',
                buildSvgSprite(workspace.icons.map(buildIconForExport)),
                'svg'
              )
            }
            disabled={workspace.icons.length === 0}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            전체 Sprite 저장
          </button>
          {deletedIcon && (
            <button
              onClick={handleUndoDeleteIcon}
              className="w-full rounded-lg bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900"
            >
              방금 삭제한 아이콘 복구
            </button>
          )}
        </div>
      </aside>

      <section className="flex-1 min-w-0 flex flex-col">
        <div className="border-b border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-72 flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void handleSearchIcons();
                }}
                placeholder="sword, potion, shield, heart..."
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-lime-500"
              />
            </div>
            <select
              value={searchLimit}
              onChange={(event) => setSearchLimit(Number(event.target.value))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-lime-500"
            >
              {SEARCH_LIMIT_OPTIONS.map((limit) => (
                <option key={limit} value={limit}>
                  {limit}개
                </option>
              ))}
            </select>
            <button
              onClick={handleSearchIcons}
              disabled={isSearching}
              className="rounded-lg bg-lime-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-lime-400 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              {isSearching ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  검색 중
                </span>
              ) : (
                '아이콘 검색'
              )}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {SVG_ICON_SOURCE_PACKS.map((pack) => {
              const isSelected = selectedSourcePackIds.has(pack.id);
              return (
                <button
                  key={pack.id}
                  type="button"
                  onClick={() => toggleSourcePack(pack.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    isSelected
                      ? 'border-lime-500 bg-lime-100 text-lime-900'
                      : 'border-slate-200 bg-white text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {pack.label}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <ShieldCheck size={14} className="text-lime-600" />
            <span>Game-icons, Lucide, Tabler, MDI, Pixelarticons, OpenMoji 통합 검색</span>
            {expandedSearchTerms.map((term) => (
              <span key={term} className="rounded-full bg-slate-100 px-2 py-1">
                {term}
              </span>
            ))}
          </div>
        </div>

        {error && (
          <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 whitespace-pre-line">
            {error}
          </div>
        )}
        {toast && (
          <div className="border-b border-lime-200 bg-lime-50 px-4 py-3 text-sm font-semibold text-lime-800">
            {toast}
          </div>
        )}

        <div className="flex-1 overflow-auto p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold">{selectedCategory?.name ?? '카테고리 없음'}</h3>
              <p className="text-sm text-slate-500">
                저장 {selectedCategoryIcons.length}개 · 검색 결과 {searchResults.length}개
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* 그리드 컬럼 수 조절 슬라이더 (패널 전용) */}
              <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-2 py-1">
                <Grid3x3 className="h-4 w-4 text-slate-500" />
                <input
                  type="range"
                  min="2"
                  max="10"
                  value={gridColumns}
                  onChange={(event) => setGridColumns(Number(event.target.value))}
                  className="h-2 w-20 cursor-pointer appearance-none rounded-lg bg-slate-200"
                  title={`Grid 컬럼: ${gridColumns}`}
                />
                <span className="min-w-[2ch] text-xs font-semibold text-slate-500">{gridColumns}</span>
              </div>
              <button
                onClick={() => handleSaveResults(selectedResults)}
                disabled={!selectedCategory || selectedResults.length === 0}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
              >
                선택 {selectedResults.length}개 저장
              </button>
              <input
                value={savedIconQuery}
                onChange={(event) => setSavedIconQuery(event.target.value)}
                placeholder="저장 아이콘 필터"
                className="w-44 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-lime-500"
              />
            </div>
          </div>

          {searchResults.length > 0 && (
            <div className="mb-6">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-700">검색 결과</h4>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setSelectedResultIds(new Set());
                      setToast('검색 결과 선택 해제됨');
                    }}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                  >
                    선택 해제
                  </button>
                  <button
                    onClick={() => {
                      setSelectedResultIds(new Set(searchResults.map((result) => result.id)));
                      setToast(`${searchResults.length}개 검색 결과 선택됨`);
                    }}
                    className="text-xs font-semibold text-lime-700 hover:text-lime-900"
                  >
                    전체 선택
                  </button>
                </div>
              </div>
              <div
                className="grid gap-3"
                style={{ gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` }}
              >
                {searchResults.map((result) => {
                  const isSelected = selectedResultIds.has(result.id);
                  const previewSvg = buildSearchResultPreviewSvg(result);
                  return (
                    <div
                      key={result.id}
                      className={`rounded-lg border bg-white p-3 ${
                        isSelected ? 'border-lime-500 ring-2 ring-lime-100' : 'border-slate-200'
                      }`}
                    >
                      <button
                        onClick={() => toggleResultSelection(result.id)}
                        className="mb-2 flex w-full items-center justify-between gap-2 text-left"
                      >
                        <span className="min-w-0 truncate text-xs font-semibold text-slate-600">{result.sourceName}</span>
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded border ${
                            isSelected ? 'border-lime-500 bg-lime-500 text-white' : 'border-slate-300'
                          }`}
                        >
                          {isSelected && <Check size={13} />}
                        </span>
                      </button>
                      <div className="flex aspect-square w-full items-center justify-center rounded-md bg-slate-50">
                        <div className="h-3/4 w-3/4 [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: previewSvg }} />
                      </div>
                      <div className="mt-2 min-h-10">
                        <p className="truncate text-sm font-semibold">{result.name}</p>
                        <p className="truncate text-xs text-slate-500">{result.collection}</p>
                      </div>
                      <div className="mt-2 flex gap-1">
                        <button
                          onClick={() => handleSaveResults([result])}
                          disabled={!selectedCategory}
                          className="flex-1 rounded-md bg-slate-900 px-2 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:bg-slate-200"
                        >
                          저장
                        </button>
                        <a
                          href={result.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
                          title="원본 보기"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-slate-700">저장된 아이콘</h4>
              {iconSelection.size > 0 ? (
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-lime-700">{iconSelection.size}개 선택 · 카테고리로 드래그</span>
                  <button
                    onClick={() => setIconSelection(new Set())}
                    className="font-semibold text-slate-500 hover:text-slate-800"
                  >
                    선택 해제
                  </button>
                </div>
              ) : (
                <span className="text-xs text-slate-400">아이콘을 카테고리로 드래그해 이동</span>
              )}
            </div>
            {selectedCategoryIcons.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                검색 결과에서 필요한 SVG를 저장하세요.
              </div>
            ) : (
              <div
                className="grid gap-3"
                style={{ gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` }}
              >
                {selectedCategoryIcons.map((icon) => {
                  const isChecked = iconSelection.has(icon.id);
                  const isDragging = draggingIconIds.includes(icon.id);
                  return (
                    <div
                      key={icon.id}
                      onMouseDown={(event) => handleIconMouseDown(event, icon)}
                      className={`group relative cursor-grab select-none rounded-lg border bg-white p-3 active:cursor-grabbing ${
                        isChecked
                          ? 'border-lime-500 ring-2 ring-lime-100'
                          : selectedIconId === icon.id
                          ? 'border-lime-500 ring-2 ring-lime-100'
                          : 'border-slate-200 hover:border-lime-400'
                      } ${isDragging ? 'opacity-40' : ''}`}
                    >
                      <button
                        type="button"
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleIconSelection(icon.id);
                        }}
                        className={`absolute right-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded border ${
                          isChecked
                            ? 'border-lime-500 bg-lime-500 text-white'
                            : 'border-slate-300 bg-white/80 text-transparent group-hover:border-slate-400'
                        }`}
                        title={isChecked ? '선택 해제' : '선택'}
                      >
                        <Check size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          if (suppressIconClickRef.current) {
                            suppressIconClickRef.current = false;
                            return;
                          }
                          if (event.shiftKey) {
                            handleShiftSelectIcon(icon);
                            return;
                          }
                          if (event.metaKey || event.ctrlKey) {
                            toggleIconSelection(icon.id);
                            selectionAnchorRef.current = icon.id;
                            return;
                          }
                          selectionAnchorRef.current = icon.id;
                          handleSelectSavedIcon(icon);
                        }}
                        className="block w-full text-left"
                      >
                        <div className="flex aspect-square w-full items-center justify-center rounded-md bg-slate-50">
                          <div
                            className="h-3/4 w-3/4 [&>svg]:h-full [&>svg]:w-full"
                            dangerouslySetInnerHTML={{ __html: buildIconPreviewSvg(icon) }}
                          />
                        </div>
                        <div className="mt-2 flex items-center gap-1">
                          <p className="min-w-0 flex-1 truncate text-sm font-semibold">{icon.name}</p>
                          {icon.favorite && <Star size={14} className="fill-amber-400 text-amber-400" />}
                        </div>
                        <p className="truncate text-xs text-slate-500">{icon.sourceName ?? 'SVG'}</p>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      <aside className="w-[380px] shrink-0 border-l border-slate-200 bg-white flex flex-col min-h-0">
        {/* 사이드바 전체를 하나의 스크롤 영역으로 — 스타일 컨트롤 + 미리보기/내보내기가 함께 스크롤되어 잘리지 않음 */}
        <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="border-b border-slate-200 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold">
            <Palette size={16} className="text-lime-600" />
            스타일 변형
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">내보내기 사이즈</label>
            <select
              value={workspace.defaultViewBox}
              onChange={(event) => handleSettingChange(event.target.value as SvgIconViewBox)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-lime-500"
            >
              {SVG_ICON_VIEW_BOXES.map((viewBox) => (
                <option key={viewBox} value={viewBox}>
                  {getSvgIconViewBoxLabel(viewBox)}
                </option>
              ))}
            </select>
          </div>
          {/* 색상 모드 + 마감을 통합한 단일 스타일 셀렉터 */}
          <div>
            <div className="mb-1 text-xs font-bold text-slate-500">스타일</div>
            <div className="flex flex-wrap gap-1.5">
              {STYLE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectStyle(opt.id)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
                    currentStyleKind === opt.id
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {SVG_ICON_COLOR_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setPrimaryColor(preset.primary);
                  setAccentColor(preset.accent);
                }}
                className="h-8 rounded-md border border-slate-200"
                title={preset.label}
                style={{ background: `linear-gradient(135deg, ${preset.primary} 0 50%, ${preset.accent} 50% 100%)` }}
              />
            ))}
            {(workspace.customColorPresets ?? []).map((preset) => (
              <div key={preset.id} className="group relative">
                <button
                  type="button"
                  onClick={() => {
                    setPrimaryColor(preset.primary);
                    setAccentColor(preset.accent);
                  }}
                  className="h-8 w-full rounded-md border border-slate-200"
                  title={`사용자 색상 ${preset.label}`}
                  style={{ background: `linear-gradient(135deg, ${preset.primary} 0 50%, ${preset.accent} 50% 100%)` }}
                />
                <button
                  type="button"
                  onClick={() => handleDeleteColorPreset(preset.id)}
                  className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-slate-900 text-white shadow group-hover:flex"
                  title="색상 삭제"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
          {/* 메인 · 보조 색상 + 프리셋 저장 버튼을 한 라인에 */}
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1 text-xs font-semibold text-slate-500">
              메인
              <ColorSwatchPicker value={primaryColor} onChange={setPrimaryColor} label="메인 색상" />
            </div>
            <div className="flex-1 space-y-1 text-xs font-semibold text-slate-500">
              보조
              <ColorSwatchPicker value={accentColor} onChange={setAccentColor} label="보조 색상" />
            </div>
            <button
              type="button"
              onClick={handleSaveColorPreset}
              title="현재 메인·보조 색상을 프리셋으로 저장"
              className="flex h-12 shrink-0 items-center gap-1 rounded-md border border-dashed border-slate-300 px-3 text-xs font-semibold text-slate-500 hover:border-lime-400 hover:text-lime-700"
            >
              <Plus size={12} /> 저장
            </button>
          </div>

          {/* 합성 가능한 스타일 효과 — 항목별 1행(토글/색상/강도) */}
          <div className="space-y-2 border-t border-slate-200 pt-3">
            <div className="text-xs font-bold text-slate-500">효과</div>
            {/* 외곽선: 토글 + 색상 + 굵기 슬라이더 (다른 효과와 동일한 1행 UX) */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOutlineEnabled((v) => !v)}
                className={`w-20 shrink-0 rounded-md px-2 py-1.5 text-xs font-semibold ${
                  outlineEnabled ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                외곽선
              </button>
              <ColorSwatchPicker
                value={outlineColor}
                onChange={setOutlineColor}
                disabled={!outlineEnabled}
                label="외곽선 색상"
                className="h-8 w-9 shrink-0"
              />
              <input
                type="range"
                min={1}
                max={OUTLINE_WIDTH_MAX}
                value={outlineWidth}
                disabled={!outlineEnabled}
                title={`외곽선 굵기 ${formatPerceivedOutlineWidth(outlineWidth)}px`}
                onChange={(event) => setOutlineWidth(Number(event.target.value))}
                className={`h-8 flex-1 accent-lime-500 ${outlineEnabled ? '' : 'opacity-50'}`}
              />
            </div>
            {([
              { key: 'dropShadow', label: '그림자' },
              { key: 'outerGlow', label: '외부 발광' },
              { key: 'innerGlow', label: '내부 발광' },
            ] as Array<{ key: 'dropShadow' | 'outerGlow' | 'innerGlow'; label: string }>).map((item) => {
              const effect = effects[item.key];
              return (
                <div key={item.key} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setEffects((p) => ({ ...p, [item.key]: { ...p[item.key], enabled: !p[item.key].enabled } }))
                    }
                    className={`w-20 shrink-0 rounded-md px-2 py-1.5 text-xs font-semibold ${
                      effect.enabled ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.label}
                  </button>
                  <ColorSwatchPicker
                    value={effect.color}
                    onChange={(color) =>
                      setEffects((p) => ({ ...p, [item.key]: { ...p[item.key], color } }))
                    }
                    disabled={!effect.enabled}
                    label={`${item.label} 색상`}
                    className="h-8 w-9 shrink-0"
                  />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={effect.intensity}
                    disabled={!effect.enabled}
                    onChange={(event) =>
                      setEffects((p) => ({ ...p, [item.key]: { ...p[item.key], intensity: Number(event.target.value) } }))
                    }
                    className={`h-8 flex-1 accent-lime-500 ${effect.enabled ? '' : 'opacity-50'}`}
                  />
                </div>
              );
            })}
            {/* 베벨: 모드 3분할 + 강도 */}
            <div className="flex items-center gap-2">
              <div className="grid w-44 shrink-0 grid-cols-3 rounded-lg border border-slate-200 bg-slate-50 p-1">
                {([
                  { value: 'none', label: '없음' },
                  { value: 'raised', label: '양각' },
                  { value: 'engraved', label: '음각' },
                ] as const).map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setEffects((p) => ({ ...p, bevel: { ...p.bevel, mode: item.value } }))}
                    className={`rounded-md px-1 py-1 text-xs font-semibold ${
                      effects.bevel.mode === item.value
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={effects.bevel.intensity}
                disabled={effects.bevel.mode === 'none'}
                onChange={(event) =>
                  setEffects((p) => ({ ...p, bevel: { ...p.bevel, intensity: Number(event.target.value) } }))
                }
                className={`h-8 flex-1 accent-lime-500 ${effects.bevel.mode === 'none' ? 'opacity-50' : ''}`}
              />
            </div>
          </div>
        </div>

        {selectedIcon ? (
          <div className="p-4 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-bold">{selectedIcon.name}</h3>
                <p className="text-xs text-slate-500">
                  {[selectedIcon.sourceName, getSvgIconViewBoxLabel(selectedIconForExport?.viewBox ?? selectedIcon.viewBox)]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <button
                onClick={() => setSelectedIconId(null)}
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
                title="선택 해제"
              >
                <X size={16} />
              </button>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 flex items-center justify-center">
              <div className="h-28 w-28 [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: selectedIconExportSvg }} />
            </div>

            <button
              onClick={() => handleApplyStyleToIcon(selectedIcon)}
              className="w-full rounded-lg bg-lime-100 px-3 py-2 text-sm font-semibold text-lime-900 hover:bg-lime-200"
            >
              현재 스타일 다시 적용
            </button>

            {/* 복사: SVG · HTML · CSS 한 라인 */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleCopy('SVG', selectedIconExportSvg || selectedIcon.svg)}
                className="rounded-lg bg-slate-900 px-2 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                <span className="inline-flex items-center justify-center gap-1">
                  <Copy size={12} />
                  SVG 복사
                </span>
              </button>
              <button
                onClick={() => handleCopy('HTML', buildHtmlIconSnippet(selectedIconForExport ?? selectedIcon))}
                className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-semibold hover:bg-slate-50"
              >
                HTML 복사
              </button>
              <button
                onClick={() => handleCopy('CSS', buildSvgDataUri(selectedIconForExport ?? selectedIcon))}
                className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-semibold hover:bg-slate-50"
              >
                CSS 복사
              </button>
            </div>
            {/* 저장: SVG · PNG 한 라인 */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() =>
                  void handleSaveTextFile(
                    'SVG 파일',
                    `${selectedIcon.name}.svg`,
                    selectedIconExportSvg || selectedIcon.svg,
                    'svg'
                  )
                }
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <Download size={14} />
                  SVG 저장
                </span>
              </button>
              <button
                onClick={() =>
                  void handleSavePng(
                    'PNG 파일',
                    `${selectedIcon.name}.png`,
                    selectedIconExportSvg || selectedIcon.svg,
                    512
                  )
                }
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <Download size={14} />
                  PNG 저장
                </span>
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleToggleFavorite(selectedIcon)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${
                  selectedIcon.favorite ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                즐겨찾기
              </button>
              <button
                onClick={() => handleDeleteIcon(selectedIcon)}
                className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
              >
                <span className="inline-flex items-center gap-2">
                  <Trash2 size={14} />
                  삭제
                </span>
              </button>
            </div>

            {(selectedIcon.sourceUrl || selectedIcon.license) && (
              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                <p className="font-semibold">{selectedIcon.sourceName}</p>
                {selectedIcon.license && <p>라이선스: {selectedIcon.license}</p>}
                {selectedIcon.sourceUrl && (
                  <a
                    href={selectedIcon.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 font-semibold text-lime-700"
                  >
                    원본 보기
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            )}

            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Code2 size={14} />
                SVG 코드
              </div>
              <pre className="max-h-72 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-lime-100">
                {selectedIconExportSvg || selectedIcon.svg}
              </pre>
            </div>
          </div>
        ) : (
          <div className="p-4 text-sm text-slate-500">
            검색 결과나 저장된 아이콘을 선택하면 미리보기와 내보내기 도구가 표시됩니다.
          </div>
        )}
        </div>
      </aside>
    </div>
  );
}
