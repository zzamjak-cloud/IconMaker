import { useState, useEffect } from 'react';
import { Settings, Folder, Download, Upload, AlertTriangle } from 'lucide-react';
import { open, save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem } from '@/components/ui/select';
import { useSettings } from '@/hooks/useSettings';
import { ExportFormat } from '@/types/export';
import { storageService, SettingsBackup } from '@/services/storageService';

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

  // 백업/복원 상태
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [pendingRestore, setPendingRestore] = useState<SettingsBackup | null>(null);
  const [restoreFileName, setRestoreFileName] = useState('');

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

  // 전체 설정 백업 파일로 내보내기
  const handleBackupExport = async () => {
    setBackupStatus(null);
    try {
      const backup = await storageService.exportAllSettings();
      const dateTag = new Date().toISOString().slice(0, 10);
      const path = await save({
        defaultPath: `iconmaker-backup-${dateTag}.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }],
        title: '설정 백업 저장',
      });
      if (!path) return; // 사용자가 취소
      // 임의 경로 쓰기는 검증된 Rust 커맨드 재사용 (plugin-fs 스코프 제약 회피)
      const bytes = Array.from(new TextEncoder().encode(JSON.stringify(backup, null, 2)));
      await invoke('save_icon_file', { filePath: path, content: bytes });
      const count = backup.data.svgWorkspace?.icons.length ?? 0;
      setBackupStatus(`백업을 저장했습니다. (저장 아이콘 ${count}개 포함)`);
    } catch (error) {
      setBackupStatus(`백업 실패: ${error}`);
    }
  };

  // 복원할 백업 파일 선택 (적용 전 확인 단계)
  const handlePickRestoreFile = async () => {
    setBackupStatus(null);
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'JSON', extensions: ['json'] }],
        title: '복원할 백업 파일 선택',
      });
      if (!selected || typeof selected !== 'string') return;
      const text = await invoke<string>('read_text_file', { filePath: selected });
      const parsed = JSON.parse(text) as SettingsBackup;
      if (!parsed || typeof parsed !== 'object' || !parsed.data) {
        throw new Error('형식이 올바르지 않습니다.');
      }
      setPendingRestore(parsed);
      setRestoreFileName(selected.split(/[\\/]/).pop() || selected);
    } catch (error) {
      setBackupStatus(`복원 파일 읽기 실패: ${error}`);
    }
  };

  // 복원 적용 → 모든 상태 재로딩을 위해 앱 새로고침
  const handleConfirmRestore = async () => {
    if (!pendingRestore) return;
    try {
      await storageService.importAllSettings(pendingRestore);
      window.location.reload();
    } catch (error) {
      setBackupStatus(`복원 실패: ${error}`);
      setPendingRestore(null);
    }
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

          {/* 구분선 */}
          <div className="border-t border-border" />

          {/* 백업 및 복원 */}
          <div className="space-y-3">
            <h3 className="font-semibold">백업 및 복원</h3>
            <p className="text-xs text-muted-foreground">
              즐겨찾기, 내보내기 설정, SVG 워크스페이스(카테고리·저장 아이콘)를 하나의 파일로 백업합니다.
              설정은 앱 업데이트 후에도 자동 보관되며, 백업 파일로 다른 기기로 옮기거나 복구할 수 있습니다.
            </p>
            <div className="flex gap-2">
              <Button onClick={handleBackupExport} variant="outline" className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                백업 내보내기
              </Button>
              <Button onClick={handlePickRestoreFile} variant="outline" className="flex-1">
                <Upload className="w-4 h-4 mr-2" />
                백업 복원
              </Button>
            </div>

            {/* 복원 확인 (적용 시 현재 설정 덮어쓰기) */}
            {pendingRestore && (
              <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 dark:border-yellow-900/50 dark:bg-yellow-900/20">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 text-yellow-600 shrink-0" />
                  <div className="space-y-2 text-sm">
                    <p className="text-yellow-800 dark:text-yellow-300">
                      <span className="font-semibold">{restoreFileName}</span> 으로 복원하면 현재 설정이 모두 덮어쓰여집니다.
                      복원 후 앱이 새로고침됩니다.
                    </p>
                    <div className="flex gap-2">
                      <Button onClick={handleConfirmRestore} size="sm">
                        복원 적용
                      </Button>
                      <Button
                        onClick={() => {
                          setPendingRestore(null);
                          setRestoreFileName('');
                        }}
                        variant="outline"
                        size="sm"
                      >
                        취소
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {backupStatus && (
              <p className="text-xs text-muted-foreground">{backupStatus}</p>
            )}
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
