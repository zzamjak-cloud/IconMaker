import { Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UpdateDialogProps {
  available: boolean;
  downloading: boolean;
  installing: boolean;
  error: string | null;
  currentVersion: string;
  newVersion: string | null;
  releaseNotes?: string;
  progress: {
    downloaded: number;
    total: number;
    percentage: number;
  } | null;
  onDownload: () => void;
  onClose: () => void;
}

export function UpdateDialog({
  available,
  downloading,
  installing,
  error,
  currentVersion,
  newVersion,
  releaseNotes,
  progress,
  onDownload,
  onClose,
}: UpdateDialogProps) {
  if (!available && !error) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg shadow-xl max-w-md w-full p-6">
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-4">
          {error ? (
            <AlertCircle className="w-6 h-6 text-destructive" />
          ) : installing ? (
            <CheckCircle2 className="w-6 h-6 text-green-500" />
          ) : (
            <Download className="w-6 h-6 text-primary" />
          )}
          <h3 className="text-lg font-semibold">
            {error
              ? '업데이트 실패'
              : installing
              ? '설치 중...'
              : downloading
              ? '다운로드 중...'
              : '업데이트 사용 가능'}
          </h3>
        </div>

        {/* 본문 */}
        <div className="mb-6 text-sm text-muted-foreground">
          {error ? (
            <p className="text-destructive">{error}</p>
          ) : installing ? (
            <p>업데이트를 설치하고 있습니다. 잠시만 기다려주세요...</p>
          ) : downloading ? (
            <>
              <p className="mb-2">업데이트를 다운로드하고 있습니다...</p>
              {progress && (
                <div className="space-y-2">
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all duration-300"
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>{progress.percentage}%</span>
                    <span>
                      {formatBytes(progress.downloaded)} / {formatBytes(progress.total)}
                    </span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="mb-2">새로운 버전이 출시되었습니다!</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium">현재 버전:</span>
                <span className="font-mono">{currentVersion}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium">새 버전:</span>
                <span className="font-mono text-primary">{newVersion}</span>
              </div>
              {releaseNotes && (
                <div className="mt-3 p-3 bg-muted rounded text-xs">
                  <p className="font-medium mb-1">변경 사항:</p>
                  <p className="whitespace-pre-line">{releaseNotes}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 justify-end">
          {!downloading && !installing && (
            <>
              <button
                onClick={onClose}
                className={cn(
                  "px-4 py-2 rounded-md transition-colors",
                  "hover:bg-muted"
                )}
              >
                {error ? '닫기' : '나중에'}
              </button>
              {!error && (
                <button
                  onClick={onDownload}
                  className={cn(
                    "px-4 py-2 rounded-md transition-colors",
                    "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  지금 업데이트
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
