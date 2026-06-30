import { useEffect, useRef, useState } from 'react';

// 큰 컬러칩 팝업을 제공하는 커스텀 색상 선택기.
// (네이티브 <input type="color">의 OS 팝업은 칩 크기를 제어할 수 없어 별도 구현)

// HSL → HEX 변환
function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100;
  const ln = l / 100;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = ln - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// OS 색상 선택기와 유사하게: 회색조 1행 + 색상(12) × 명암(8) 그리드 = 총 108색
const HUES = Array.from({ length: 12 }, (_, i) => i * 30); // 0~330°
const SHADES = [
  { s: 70, l: 92 },
  { s: 75, l: 82 },
  { s: 82, l: 70 },
  { s: 85, l: 58 },
  { s: 85, l: 48 },
  { s: 80, l: 38 },
  { s: 70, l: 28 },
  { s: 60, l: 18 },
];
const GRAYS = Array.from({ length: 12 }, (_, i) => hslToHex(0, 0, Math.round((i / 11) * 100)));
const PALETTE = [...GRAYS, ...SHADES.flatMap((shade) => HUES.map((h) => hslToHex(h, shade.s, shade.l)))];

interface ColorSwatchPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  className?: string; // 트리거 스와치 크기/모양 (기본: h-12 w-full)
  disabled?: boolean;
}

export function ColorSwatchPicker({ value, onChange, label, className, disabled }: ColorSwatchPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 비활성화되면 팝업을 닫는다
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  // 바깥 클릭 / ESC 닫기
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        title={label}
        className={`rounded-md border border-slate-200 ${className ?? 'h-12 w-full'} ${
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
        }`}
        style={{ backgroundColor: value }}
      />
      {open && (
        <div className="absolute left-0 z-50 mt-1 w-[336px] max-w-[80vw] rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
          <div className="grid grid-cols-12 gap-1">
            {PALETTE.map((color, index) => (
              <button
                key={`${color}-${index}`}
                type="button"
                onClick={() => {
                  onChange(color);
                  setOpen(false);
                }}
                title={color}
                className={`aspect-square w-full rounded-[3px] border ${
                  value.toLowerCase() === color.toLowerCase()
                    ? 'border-slate-900 ring-2 ring-slate-400'
                    : 'border-black/10 hover:border-slate-400'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          {/* 직접 선택(네이티브) + HEX 입력 */}
          <div className="mt-2 flex items-center gap-2">
            <input
              type="color"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              className="h-8 w-10 shrink-0 cursor-pointer rounded-md border border-slate-200"
            />
            <input
              type="text"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              className="h-8 w-full rounded-md border border-slate-200 px-2 text-xs"
            />
          </div>
        </div>
      )}
    </div>
  );
}
