import { storageService } from '@/services/storageService';
import { SvgWorkspaceData } from '@/types/svgIcon';

// SVG 워크스페이스 저장을 모듈 레벨에서 관리한다.
// 디바운스 저장이 디스크에 반영되기 전에 앱이 재시작(자동 업데이트)되면 데이터가 유실되므로,
// 재시작/종료 직전 flushSvgWorkspaceSave()로 즉시 저장을 강제할 수 있어야 한다.
let timer: ReturnType<typeof setTimeout> | null = null;
let pending: SvgWorkspaceData | null = null;

export function scheduleSvgWorkspaceSave(data: SvgWorkspaceData, debounceMs: number): void {
  pending = data;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    void flushSvgWorkspaceSave();
  }, debounceMs);
}

// 대기 중인 저장을 즉시 디스크에 반영하고 완료까지 대기한다.
export async function flushSvgWorkspaceSave(): Promise<void> {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (pending) {
    const data = pending;
    pending = null;
    await storageService.saveSvgWorkspace(data);
  }
}
