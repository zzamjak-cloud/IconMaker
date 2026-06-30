import { useState } from 'react';
import { Scale } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface LicenseDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

// 큐레이션 컬렉션별 라이선스 정보
const CURATED_LICENSES: Array<{ name: string; license: string; note: string; free: boolean }> = [
  { name: 'Lucide', license: 'ISC', note: '저작권 고지', free: true },
  { name: 'Tabler Icons', license: 'MIT', note: '저작권 고지', free: true },
  { name: 'Iconoir', license: 'MIT', note: '저작권 고지', free: true },
  { name: 'Pixelarticons', license: 'MIT', note: '저작권 고지', free: true },
  { name: 'Material Design Icons', license: 'Apache 2.0', note: '고지', free: true },
  { name: 'Material Symbols', license: 'Apache 2.0', note: '고지', free: true },
  { name: 'Noto Emoji', license: 'Apache 2.0', note: '고지', free: true },
  { name: 'Game-icons', license: 'CC BY 3.0', note: '출처(제작자) 표기 필수', free: false },
  { name: 'OpenMoji', license: 'CC BY-SA 4.0', note: '출처 표기 + 동일 라이선스 공유', free: false },
];

/**
 * 아이콘 라이선스 정책 안내 다이얼로그
 */
export function LicenseDialog({ isOpen, onClose }: LicenseDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-red-600" />
            아이콘 라이선스 정책
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 text-sm">
          <p className="text-muted-foreground">
            이 앱의 아이콘은 <strong>Iconify</strong> 오픈소스 컬렉션에서 제공됩니다. 라이선스는{' '}
            <strong>컬렉션마다 다르므로</strong>, 사용(특히 상업적 사용) 전 아래 내용을 확인하세요.
          </p>

          {/* 큐레이션 컬렉션 라이선스 표 */}
          <div>
            <h3 className="font-semibold mb-2">큐레이션 컬렉션</h3>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-semibold">컬렉션</th>
                    <th className="px-3 py-2 font-semibold">라이선스</th>
                    <th className="px-3 py-2 font-semibold">상업적 사용</th>
                    <th className="px-3 py-2 font-semibold">의무</th>
                  </tr>
                </thead>
                <tbody>
                  {CURATED_LICENSES.map((row) => (
                    <tr key={row.name} className="border-t border-border">
                      <td className="px-3 py-2 font-medium">{row.name}</td>
                      <td className="px-3 py-2">{row.license}</td>
                      <td className="px-3 py-2">{row.free ? '✅ 자유' : '✅ 조건부'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 라이선스 유형 설명 */}
          <div className="space-y-2">
            <h3 className="font-semibold">라이선스 유형</h3>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>
                <strong className="text-foreground">MIT / Apache 2.0 / ISC</strong> — 사실상 자유롭게
                상업적 사용 가능. 라이선스 텍스트·저작권 고지만 지키면 됩니다.
              </li>
              <li>
                <strong className="text-foreground">CC BY</strong>(Game-icons) — 자유롭게 사용하되{' '}
                <strong>제작자 출처 표기</strong>가 필요합니다.
              </li>
              <li>
                <strong className="text-foreground">CC BY-SA</strong>(OpenMoji) — 출처 표기 +{' '}
                <strong>파생물도 동일 라이선스로 공개</strong>해야 합니다(상업 제품 주의).
              </li>
            </ul>
          </div>

          {/* 통합 검색 경고 */}
          <div className="rounded-lg border border-red-300 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-900/20">
            <h3 className="font-semibold text-red-700 dark:text-red-400 mb-1">⚠️ "통합" 검색 주의</h3>
            <ul className="space-y-1 text-red-800 dark:text-red-300 text-xs">
              <li>
                기본값인 <strong>통합 검색</strong>은 Iconify의 모든 컬렉션(275,000+ / 150여 세트)을
                포함하므로, 위 9개 외 세트가 결과에 섞일 수 있습니다.
              </li>
              <li>이 경우 라이선스가 제각각이며 앱 화면에 표시되지 않을 수 있습니다.</li>
              <li>
                <strong>브랜드/로고 세트</strong>는 오픈 라이선스라도 <strong>상표권</strong>이 별도로
                적용되어 자유 사용이 아닐 수 있습니다.
              </li>
            </ul>
          </div>

          {/* 권장사항 */}
          <div className="space-y-1">
            <h3 className="font-semibold">권장사항</h3>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li>큐레이션 세트(특히 MIT/Apache 계열)는 대체로 안전합니다.</li>
              <li>Game-icons는 출처 표기, OpenMoji는 share-alike 조건을 지키세요.</li>
              <li>상업적 사용 시 각 아이콘 카드의 "원본 보기" 페이지에서 정확한 라이선스를 확인하세요.</li>
            </ul>
          </div>

          <p className="text-xs text-muted-foreground border-t border-border pt-3">
            본 안내는 법률 자문이 아니며, 정확한 조건은 각 컬렉션의 원문 라이선스를 확인하시기 바랍니다.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 라이선스 버튼 (헤더, 설정 버튼 왼쪽) — 눈에 띄는 빨강색
 */
export function LicenseButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
        title="아이콘 라이선스 정책"
      >
        <Scale className="w-4 h-4" />
        라이선스
      </button>
      <LicenseDialog isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
