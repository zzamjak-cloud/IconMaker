import { useState, useEffect } from 'react';
import { Settings, Folder } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem } from '@/components/ui/select';
import { useSettings } from '@/hooks/useSettings';
import { ExportFormat } from '@/types/export';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 설정 다이얼로그 컴포넌트
 * - 기본 저장 폴더 선택
 * - 자동 저장 옵션
 * - 기본 내보내기 설정
 */
export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const { settings, updateSettings, isUpdating } = useSettings();

  // 로컬 상태
  const [defaultFolder, setDefaultFolder] = useState(settings.defaultFolder);
  const [defaultFormat, setDefaultFormat] = useState(settings.format);
  const [defaultSize, setDefaultSize] = useState(settings.size);
  const [defaultColor, setDefaultColor] = useState(settings.color);

  // settings가 변경되면 로컬 상태 업데이트
  useEffect(() => {
    setDefaultFolder(settings.defaultFolder);
    setDefaultFormat(settings.format);
    setDefaultSize(settings.size);
    setDefaultColor(settings.color);
  }, [settings]);

  // 폴더 선택 대화상자
  const handleSelectFolder = async () => {
    const selected = await open({
      directory: true,
      defaultPath: defaultFolder,
      title: '기본 저장 폴더 선택',
    });

    if (selected && typeof selected === 'string') {
      setDefaultFolder(selected);
    }
  };

  // 설정 저장 (autoSave는 항상 true)
  const handleSave = () => {
    updateSettings({
      defaultFolder,
      autoSave: true, // 항상 자동 저장 모드
      format: defaultFormat,
      size: defaultSize,
      color: defaultColor,
    });
    onClose();
  };

  // 설정 초기화
  const handleReset = () => {
    setDefaultFolder('');
    setDefaultFormat('png');
    setDefaultSize(128);
    setDefaultColor('#000000');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            설정
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 기본 저장 폴더 */}
          <div className="space-y-2">
            <Label>기본 저장 폴더</Label>
            <div className="flex gap-2">
              <Input
                value={defaultFolder}
                readOnly
                placeholder="선택되지 않음"
                className="flex-1"
              />
              <Button onClick={handleSelectFolder} variant="outline">
                <Folder className="w-4 h-4 mr-2" />
                선택
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              아이콘을 저장할 기본 폴더를 지정합니다. 기본 폴더가 설정되면 내보내기 시 자동으로 저장됩니다.
            </p>
          </div>

          {/* 구분선 */}
          <div className="border-t border-border" />

          {/* 기본 내보내기 설정 */}
          <div className="space-y-4">
            <h3 className="font-semibold">기본 내보내기 설정</h3>

            {/* 기본 포맷 */}
            <div className="space-y-2">
              <Label>기본 포맷</Label>
              <Select
                value={defaultFormat}
                onValueChange={(v) => setDefaultFormat(v as ExportFormat)}
              >
                <SelectContent>
                  <SelectItem value="svg">SVG (벡터)</SelectItem>
                  <SelectItem value="png">PNG (래스터)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 기본 PNG 크기 */}
            <div className="space-y-2">
              <Label>기본 PNG 크기</Label>
              <Select
                value={String(defaultSize)}
                onValueChange={(v) => setDefaultSize(Number(v))}
              >
                <SelectContent>
                  <SelectItem value="64">64x64</SelectItem>
                  <SelectItem value="128">128x128</SelectItem>
                  <SelectItem value="256">256x256</SelectItem>
                  <SelectItem value="512">512x512</SelectItem>
                  <SelectItem value="1024">1024x1024</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 기본 색상 */}
            <div className="space-y-2">
              <Label>기본 색상</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={defaultColor}
                  onChange={(e) => setDefaultColor(e.target.value)}
                  className="w-20 h-10 cursor-pointer"
                />
                <Input
                  type="text"
                  value={defaultColor}
                  onChange={(e) => setDefaultColor(e.target.value)}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex gap-2 justify-end pt-4 border-t border-border">
            <Button onClick={handleReset} variant="outline">
              초기화
            </Button>
            <Button onClick={handleSave} disabled={isUpdating}>
              {isUpdating ? '저장 중...' : '저장'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 설정 버튼 컴포넌트 (헤더에 표시)
 */
export function SettingsButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        aria-label="설정"
      >
        <Settings className="w-5 h-5" />
      </Button>
      <SettingsDialog isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
