import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storageService } from '@/services/storageService';
import { ExportSettings } from '@/types/export';

/**
 * 설정 관리 훅
 * - 내보내기 설정 로드/저장
 * - TanStack Query로 자동 캐싱
 */
export function useSettings() {
  const queryClient = useQueryClient();

  // 설정 가져오기
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => storageService.getExportSettings(),
    staleTime: Infinity, // 설정은 항상 최신 상태
  });

  // 설정 업데이트 Mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<ExportSettings>) => {
      const current = settings || {
        defaultFolder: '',
        format: 'png' as const,
        size: 128,
        color: '#000000',
        autoSave: false,
      };
      const merged = { ...current, ...newSettings };
      await storageService.saveExportSettings(merged);
      return merged;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  // 기본 설정값
  const defaultSettings: ExportSettings = {
    defaultFolder: '',
    format: 'png',
    size: 128,
    color: '#000000',
    autoSave: false,
  };

  return {
    settings: settings || defaultSettings,
    isLoading,
    updateSettings: updateSettingsMutation.mutate,
    isUpdating: updateSettingsMutation.isPending,
  };
}
