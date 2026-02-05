import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import { useIconSearch } from '@/hooks/useIconSearch';
import { useSearchStore } from '@/stores/searchStore';
import { IconCard } from './IconCard';

interface IconGridProps {
  onIconClick?: (iconName: string) => void;
  showOnlyFavorites?: boolean;
  favorites?: string[];
}

/**
 * 가상화된 아이콘 그리드 컴포넌트
 * - TanStack Virtual을 사용하여 대량의 아이콘을 효율적으로 렌더링
 * - 뷰포트에 보이는 항목만 렌더링하여 성능 최적화
 * - 5열 그리드 레이아웃
 * - 즐겨찾기 필터 지원
 */
export function IconGrid({ onIconClick, showOnlyFavorites = false, favorites = [] }: IconGridProps) {
  const { query, selectedPrefix } = useSearchStore();

  // 아이콘 검색
  const { data, isLoading, error } = useIconSearch(query, {
    prefix: selectedPrefix || undefined,
  });

  const parentRef = useRef<HTMLDivElement>(null);

  // 표시할 아이콘 목록 결정 (즐겨찾기 필터 적용)
  const displayIcons = showOnlyFavorites ? favorites : (data?.icons || []);

  // 그리드 설정
  const columnCount = 5; // 5열 그리드
  const rowCount = Math.ceil(displayIcons.length / columnCount);

  // 가상화 설정
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 280, // 각 행의 예상 높이 (픽셀)
    overscan: 5, // 뷰포트 외부에 미리 렌더링할 행 수
  });

  // 로딩 상태
  if (query.length >= 2 && isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-muted border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground">아이콘 검색 중...</p>
        </div>
      </div>
    );
  }

  // 오류 상태
  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-destructive mb-2">검색 중 오류가 발생했습니다</p>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : '알 수 없는 오류'}
          </p>
        </div>
      </div>
    );
  }

  // 검색어가 너무 짧음
  if (query.length > 0 && query.length < 2) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">
          최소 2글자 이상 입력해주세요
        </p>
      </div>
    );
  }

  // 검색 결과 없음
  if (data && data.icons.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">
            "{query}"에 대한 검색 결과가 없습니다
          </p>
          <p className="text-sm text-muted-foreground">
            다른 검색어로 시도해보세요
          </p>
        </div>
      </div>
    );
  }

  // 즐겨찾기 모드
  if (showOnlyFavorites) {
    if (favorites.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center max-w-md">
            <h3 className="text-lg font-semibold mb-2">
              즐겨찾기가 비어있습니다
            </h3>
            <p className="text-muted-foreground">
              아이콘 카드의 별 아이콘을 클릭하여 즐겨찾기에 추가하세요
            </p>
          </div>
        </div>
      );
    }
    // 즐겨찾기 목록을 표시 (아래 가상화된 그리드 렌더링 섹션에서 처리)
  }
  // 초기 상태 (검색 전)
  else if (!query) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <h3 className="text-lg font-semibold mb-2">
            아이콘 검색을 시작하세요
          </h3>
          <p className="text-muted-foreground mb-4">
            275,000개 이상의 오픈소스 아이콘을 검색할 수 있습니다
          </p>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>예시: home, user, settings, arrow, check</p>
          </div>
        </div>
      </div>
    );
  }

  // 가상화된 그리드 렌더링
  return (
    <div
      ref={parentRef}
      className="h-full overflow-auto"
    >
      {/* 검색 결과 정보 */}
      <div className="mb-4 text-sm text-muted-foreground">
        {showOnlyFavorites ? (
          `즐겨찾기 ${displayIcons.length}개`
        ) : (
          `${data?.total}개 결과 중 ${displayIcons.length}개 표시`
        )}
      </div>

      {/* 가상화된 그리드 */}
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const startIdx = virtualRow.index * columnCount;
          const rowIcons = displayIcons.slice(startIdx, startIdx + columnCount);

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="grid grid-cols-5 gap-4"
            >
              {rowIcons.map((iconName) => (
                <IconCard
                  key={iconName}
                  iconName={iconName}
                  onClick={() => onIconClick?.(iconName)}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
