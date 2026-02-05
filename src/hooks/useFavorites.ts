import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storageService } from '@/services/storageService';

/**
 * 즐겨찾기 관리 훅
 * - Tauri Store를 통한 영구 저장
 * - TanStack Query로 자동 캐싱 및 상태 동기화
 * - 즐겨찾기 추가/제거/토글 기능
 */
export function useFavorites() {
  const queryClient = useQueryClient();

  // 즐겨찾기 목록 가져오기
  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => storageService.getFavorites(),
    staleTime: Infinity, // 즐겨찾기는 항상 최신 상태
  });

  // 즐겨찾기 추가 Mutation
  const addFavoriteMutation = useMutation({
    mutationFn: (iconName: string) => storageService.addFavorite(iconName),
    onSuccess: () => {
      // 즐겨찾기 목록 다시 가져오기
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  // 즐겨찾기 제거 Mutation
  const removeFavoriteMutation = useMutation({
    mutationFn: (iconName: string) => storageService.removeFavorite(iconName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  // 즐겨찾기 여부 확인
  const isFavorite = (iconName: string): boolean => {
    return favorites.includes(iconName);
  };

  // 즐겨찾기 토글 (추가/제거)
  const toggleFavorite = (iconName: string) => {
    if (isFavorite(iconName)) {
      removeFavoriteMutation.mutate(iconName);
    } else {
      addFavoriteMutation.mutate(iconName);
    }
  };

  return {
    favorites,
    isLoading,
    isFavorite,
    toggleFavorite,
    addFavorite: addFavoriteMutation.mutate,
    removeFavorite: removeFavoriteMutation.mutate,
    isToggling: addFavoriteMutation.isPending || removeFavoriteMutation.isPending,
  };
}
