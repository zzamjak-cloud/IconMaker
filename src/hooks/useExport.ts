import { useMutation } from '@tanstack/react-query';
import { exportService } from '@/services/exportService';
import { ExportOptions } from '@/types/export';
import { useToast } from '@/components/ui/toast';

/**
 * 아이콘 내보내기 훅
 * - TanStack Query Mutation으로 내보내기 처리
 * - 성공/실패 토스트 알림
 */
export function useExport() {
  const { toast } = useToast();

  const exportMutation = useMutation({
    mutationFn: ({
      prefix,
      name,
      options,
    }: {
      prefix: string;
      name: string;
      options?: Partial<ExportOptions>;
    }) => exportService.exportIcon(prefix, name, options),
    onSuccess: () => {
      toast({
        title: '내보내기 완료',
        description: '아이콘이 성공적으로 저장되었습니다.',
        type: 'success',
      });
    },
    onError: (error) => {
      console.error('Export hook error:', error);
      toast({
        title: '내보내기 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류',
        type: 'error',
      });
    },
  });

  return {
    exportIcon: exportMutation.mutate,
    isExporting: exportMutation.isPending,
    isSuccess: exportMutation.isSuccess,
    isError: exportMutation.isError,
    error: exportMutation.error,
    reset: exportMutation.reset,
  };
}
