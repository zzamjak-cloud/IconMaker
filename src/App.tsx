import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SearchBar } from '@/components/SearchBar';
import { IconGrid } from '@/components/IconGrid';
import { ExportPanel } from '@/components/ExportPanel';
import { BatchExportDialog } from '@/components/BatchExportDialog';
import { SettingsButton } from '@/components/SettingsDialog';
import { CategoryDropdown } from '@/components/CategoryDropdown';
import { ToastProvider } from '@/components/ui/toast';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { Star, Download, Grid3x3 } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { storageService } from '@/services/storageService';
import { cn } from '@/lib/utils';
import { useAutoUpdater } from '@/hooks/useAutoUpdater';
import { UpdateDialog } from '@/components/UpdateDialog';

// QueryClient 인스턴스 생성
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 7, // 7분 (Iconify API 캐시 시간)
      gcTime: 1000 * 60 * 30,   // 30분간 캐시 유지
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// 메인 앱 내용 (QueryClientProvider 내부에 있어야 함)
function AppContent() {
  // 선택된 아이콘 (내보내기 패널용)
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);

  // 즐겨찾기 필터 상태
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  // 일괄 내보내기 다이얼로그 상태
  const [showBatchExport, setShowBatchExport] = useState(false);

  // Grid 컬럼 수 상태 (5~10)
  const [gridColumns, setGridColumns] = useState(10);

  // 즐겨찾기 데이터
  const { favorites } = useFavorites();

  // 자동 업데이트
  const updater = useAutoUpdater();

  // 키보드 단축키
  useKeyboardShortcuts();

  // 앱 시작 시 기본 폴더 초기화
  useEffect(() => {
    storageService.initializeDefaultFolder();
  }, []);

  return (
    <ToastProvider>
      <div className="flex flex-col h-screen bg-background text-foreground">
        {/* 헤더 */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">IconMaker</h1>
            <p className="text-sm text-muted-foreground">
              Iconify 아이콘 검색 및 내보내기 도구
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* 카테고리 드롭다운 */}
            <CategoryDropdown />

            {/* Grid 컬럼 수 조절 슬라이더 */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50">
              <Grid3x3 className="w-4 h-4 text-muted-foreground" />
              <input
                type="range"
                min="5"
                max="10"
                value={gridColumns}
                onChange={(e) => setGridColumns(Number(e.target.value))}
                className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                title={`Grid 컬럼: ${gridColumns}`}
              />
              <span className="text-sm font-medium text-muted-foreground min-w-[2ch]">
                {gridColumns}
              </span>
            </div>

            <div className="flex items-center gap-2">
            {/* 즐겨찾기 필터 버튼 */}
            <button
              onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md transition-all",
                "hover:bg-muted",
                showOnlyFavorites && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
              )}
              title={showOnlyFavorites ? "전체 아이콘 보기" : "즐겨찾기만 보기"}
            >
              <Star
                className={cn(
                  "w-5 h-5",
                  showOnlyFavorites && "fill-yellow-500"
                )}
              />
              <span className="text-sm font-medium">
                즐겨찾기 {showOnlyFavorites && `(${favorites.length})`}
              </span>
            </button>

            {/* 일괄 내보내기 버튼 (즐겨찾기 필터 활성화 시에만 표시) */}
            {showOnlyFavorites && favorites.length > 0 && (
              <button
                onClick={() => setShowBatchExport(true)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-md transition-all",
                  "hover:bg-muted",
                  "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
                title="즐겨찾기 일괄 내보내기"
              >
                <Download className="w-5 h-5" />
                <span className="text-sm font-medium">
                  일괄 내보내기
                </span>
              </button>
            )}

            <SettingsButton />
            </div>
          </div>
        </header>

        {/* 메인 컨텐츠 */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* 검색 바 */}
          <div className="px-6 py-4 border-b border-border">
            <SearchBar />
          </div>

          {/* 아이콘 그리드 영역 */}
          <div className="flex-1 overflow-hidden p-6">
            <IconGrid
              onIconClick={setSelectedIcon}
              showOnlyFavorites={showOnlyFavorites}
              favorites={favorites}
              columns={gridColumns}
            />
          </div>
        </main>

        {/* 내보내기 패널 */}
        <ExportPanel
          iconName={selectedIcon}
          onClose={() => setSelectedIcon(null)}
        />

        {/* 일괄 내보내기 다이얼로그 */}
        <BatchExportDialog
          iconNames={favorites}
          isOpen={showBatchExport}
          onClose={() => setShowBatchExport(false)}
        />

        {/* 업데이트 다이얼로그 */}
        <UpdateDialog
          available={updater.available}
          downloading={updater.downloading}
          installing={updater.installing}
          error={updater.error}
          currentVersion="0.1.1"
          newVersion={updater.update?.version ?? null}
          releaseNotes={updater.update?.body}
          progress={updater.progress}
          onDownload={updater.downloadAndInstall}
          onClose={() => {}}
        />
      </div>
    </ToastProvider>
  );
}

// App 컴포넌트 (QueryClientProvider로 감싸기)
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
