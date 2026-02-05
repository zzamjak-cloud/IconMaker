import { useState, useEffect } from 'react';
import { Download, Check, X as XIcon, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useBatchExport } from '@/hooks/useBatchExport';
import { useSettings } from '@/hooks/useSettings';

interface BatchExportDialogProps {
  iconNames: string[];
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 일괄 내보내기 다이얼로그
 * - 여러 아이콘을 한 번에 내보내기
 * - 진행 상황 표시
 * - 에러 목록 표시
 */
export function BatchExportDialog({ iconNames, isOpen, onClose }: BatchExportDialogProps) {
  const { batchExport, isExporting, progress, errors, reset } = useBatchExport();
  const { settings } = useSettings();
  const [hasStarted, setHasStarted] = useState(false);

  // 다이얼로그가 닫힐 때 상태 초기화
  useEffect(() => {
    if (!isOpen) {
      setHasStarted(false);
      reset();
    }
  }, [isOpen, reset]);

  // 완료 후 자동 닫기
  useEffect(() => {
    if (hasStarted && !isExporting && errors.length === 0) {
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  }, [hasStarted, isExporting, errors, onClose]);

  const handleStart = async () => {
    setHasStarted(true);
    try {
      await batchExport(iconNames);
    } catch (error) {
      alert(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다');
      onClose();
    }
  };

  const successCount = progress.current - errors.length;
  const isComplete = hasStarted && !isExporting;
  const hasErrors = errors.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>일괄 내보내기</span>
            {!isExporting && (
              <button
                onClick={onClose}
                className="p-1 hover:bg-muted rounded transition-colors"
              >
                <XIcon className="w-5 h-5" />
              </button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 내보내기 정보 */}
          {!hasStarted && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="text-sm font-medium">
                  {iconNames.length}개의 아이콘을 내보냅니다
                </p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• 포맷: {settings.format.toUpperCase()}</p>
                  {settings.format === 'png' && (
                    <p>• 크기: {settings.size}x{settings.size}</p>
                  )}
                  <p>• 색상: {settings.color}</p>
                  <p>• 저장 위치: {settings.defaultFolder || '설정되지 않음'}</p>
                </div>
              </div>

              {!settings.defaultFolder && (
                <div className="flex items-start gap-2 p-3 bg-yellow-500/10 text-yellow-600 rounded-lg">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">기본 저장 폴더가 설정되지 않았습니다</p>
                    <p className="mt-1">설정에서 기본 저장 폴더를 먼저 지정해주세요.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 진행 상황 */}
          {hasStarted && (
            <div className="space-y-4">
              {/* 진행률 바 */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {progress.current} / {progress.total}
                  </span>
                  <span className="font-medium">
                    {Math.round((progress.current / progress.total) * 100)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{
                      width: `${(progress.current / progress.total) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* 상태 메시지 */}
              {isExporting && (
                <div className="flex items-center gap-2 p-3 bg-blue-500/10 text-blue-600 rounded-lg">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">내보내는 중...</span>
                </div>
              )}

              {isComplete && !hasErrors && (
                <div className="flex items-center gap-2 p-3 bg-green-500/10 text-green-600 rounded-lg">
                  <Check className="w-5 h-5" />
                  <span className="text-sm">
                    {successCount}개 아이콘 내보내기 완료!
                  </span>
                </div>
              )}

              {isComplete && hasErrors && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-3 bg-yellow-500/10 text-yellow-600 rounded-lg">
                    <AlertCircle className="w-5 h-5" />
                    <span className="text-sm">
                      {successCount}개 완료, {errors.length}개 실패
                    </span>
                  </div>

                  {/* 에러 목록 */}
                  <div className="max-h-40 overflow-y-auto p-3 bg-muted rounded-lg space-y-1">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      실패한 아이콘:
                    </p>
                    {errors.map((error, idx) => (
                      <p key={idx} className="text-xs text-destructive">
                        • {error}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 버튼 */}
          {!hasStarted && (
            <Button
              onClick={handleStart}
              disabled={!settings.defaultFolder}
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              내보내기 시작
            </Button>
          )}

          {isComplete && (
            <Button onClick={onClose} className="w-full">
              닫기
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
