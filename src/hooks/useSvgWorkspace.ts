import { useCallback, useEffect, useRef, useState } from 'react';
import { storageService } from '@/services/storageService';
import { SvgWorkspaceData } from '@/types/svgIcon';
import { createDefaultSvgWorkspaceData } from '@/lib/svgIcon/svgIconDefaults';

// 디바운스 저장 지연(ms)
const SAVE_DEBOUNCE_MS = 500;

type WorkspaceUpdater = SvgWorkspaceData | ((prev: SvgWorkspaceData) => SvgWorkspaceData);

/**
 * SVG 워크스페이스 영속성 훅
 * - 마운트 시 Tauri Store에서 로드, 없으면 기본 데이터로 초기화
 * - updateWorkspace 호출 시 상태 갱신 + 디바운스(500ms) 저장, updatedAt 갱신
 */
export function useSvgWorkspace() {
  const [workspace, setWorkspace] = useState<SvgWorkspaceData>(() => createDefaultSvgWorkspaceData());
  const [isLoading, setIsLoading] = useState(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 초기 로드 완료 전 저장이 일어나지 않도록 보호한다.
  const loadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await storageService.getSvgWorkspace();
        if (cancelled) return;
        setWorkspace(stored ?? createDefaultSvgWorkspaceData());
      } catch {
        if (!cancelled) setWorkspace(createDefaultSvgWorkspaceData());
      } finally {
        if (!cancelled) {
          loadedRef.current = true;
          setIsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 언마운트 시 대기 중인 타이머 정리
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const updateWorkspace = useCallback((next: WorkspaceUpdater) => {
    setWorkspace((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next;
      const updated: SvgWorkspaceData = { ...resolved, updatedAt: new Date().toISOString() };

      if (!loadedRef.current) return updated;

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        void storageService.saveSvgWorkspace(updated);
      }, SAVE_DEBOUNCE_MS);

      return updated;
    });
  }, []);

  return { workspace, updateWorkspace, isLoading };
}
