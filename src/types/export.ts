// 내보내기 포맷
export type ExportFormat = 'svg' | 'png';

// 내보내기 설정
export interface ExportSettings {
  defaultFolder: string;
  format: ExportFormat;
  size: number;          // PNG 크기
  color: string;         // 색상 (hex)
  autoSave: boolean;     // 자동 저장 (대화상자 없이)
}

// 내보내기 옵션
export interface ExportOptions {
  format: ExportFormat;
  size?: number;
  color?: string;
  fileName?: string;
}
