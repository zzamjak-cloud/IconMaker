import { Star, Trash2 } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { useIconDetails } from '@/hooks/useIconDetails';
import { cn } from '@/lib/utils';

/**
 * 개별 즐겨찾기 아이템 컴포넌트
 */
function FavoriteItem({ iconName }: { iconName: string }) {
  const [prefix, name] = iconName.split(':');
  const { data: svg } = useIconDetails(prefix, name);
  const { removeFavorite } = useFavorites();

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-2 rounded-lg",
        "hover:bg-muted transition-colors cursor-pointer group"
      )}
    >
      {/* 아이콘 프리뷰 */}
      <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
        {svg ? (
          <div
            className="w-full h-full"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <div className="w-4 h-4 bg-muted rounded animate-pulse" />
        )}
      </div>

      {/* 아이콘 정보 */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" title={name}>
          {name}
        </p>
        <p className="text-xs text-muted-foreground">
          {prefix}
        </p>
      </div>

      {/* 삭제 버튼 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          removeFavorite(iconName);
        }}
        className={cn(
          "p-1 rounded opacity-0 group-hover:opacity-100",
          "hover:bg-destructive/10 hover:text-destructive",
          "transition-all"
        )}
        aria-label="즐겨찾기 제거"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

/**
 * 즐겨찾기 패널 컴포넌트
 * - 즐겨찾기한 아이콘 목록 표시
 * - 각 아이콘의 SVG 프리뷰 표시
 * - 즐겨찾기 제거 기능
 */
export function FavoritesPanel() {
  const { favorites, isLoading } = useFavorites();

  return (
    <aside className="w-64 border-r border-border p-4 overflow-y-auto bg-background">
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-4">
        <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
        <h2 className="text-lg font-semibold">즐겨찾기</h2>
      </div>

      {/* 로딩 상태 */}
      {isLoading && (
        <div className="text-center py-4">
          <div className="w-8 h-8 mx-auto border-2 border-muted border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground mt-2">
            로딩 중...
          </p>
        </div>
      )}

      {/* 즐겨찾기 목록 */}
      {!isLoading && favorites.length > 0 && (
        <div className="space-y-1">
          {favorites.map((iconName) => (
            <FavoriteItem key={iconName} iconName={iconName} />
          ))}
        </div>
      )}

      {/* 빈 상태 */}
      {!isLoading && favorites.length === 0 && (
        <div className="text-center py-8">
          <Star className="w-12 h-12 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">
            아직 즐겨찾기한 아이콘이 없습니다
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            아이콘의 별 아이콘을 클릭하여 추가하세요
          </p>
        </div>
      )}

      {/* 즐겨찾기 개수 */}
      {!isLoading && favorites.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            총 {favorites.length}개의 즐겨찾기
          </p>
        </div>
      )}
    </aside>
  );
}
