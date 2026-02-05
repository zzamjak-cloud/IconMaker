import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { iconifyApi } from './iconifyApi';
import { storageService } from './storageService';
import { ExportOptions } from '@/types/export';

/**
 * 아이콘 내보내기 서비스
 * - SVG/PNG 내보내기
 * - 색상 변경
 * - 파일 저장
 */
export class ExportService {
  /**
   * 아이콘 내보내기 (메인 함수)
   * @param prefix 아이콘 세트 (예: "mdi")
   * @param name 아이콘 이름 (예: "home")
   * @param options 내보내기 옵션
   */
  async exportIcon(
    prefix: string,
    name: string,
    options?: Partial<ExportOptions>
  ): Promise<void> {
    try {
      // 설정 가져오기
      const settings = await storageService.getExportSettings();
      console.log('Export settings:', settings);

      // 최종 옵션 결정
      const exportOptions: Required<ExportOptions> = {
        format: options?.format || settings.format,
        size: options?.size || settings.size,
        color: options?.color || settings.color,
        fileName: options?.fileName || `${prefix}-${name}`,
      };
      console.log('Export options:', exportOptions);

      // SVG 다운로드
      let svgContent = await iconifyApi.getIconSvg(prefix, name);
      console.log('SVG content length:', svgContent?.length);
      if (!svgContent) {
        throw new Error('SVG 다운로드 실패');
      }

      // SVG 크기 속성 정리 (1em 같은 상대 단위 제거)
      // viewBox에서 실제 크기를 추출하여 사용
      svgContent = this.normalizeSvgSize(svgContent);
      console.log('Normalized SVG:', svgContent.substring(0, 200));

      // 색상 변경 (currentColor를 실제 색상으로 변경)
      if (exportOptions.color) {
        console.log('Changing color to:', exportOptions.color);
        svgContent = await invoke<string>('change_svg_color', {
          svgContent,
          newColor: exportOptions.color,
        });
        console.log('Color changed, new SVG length:', svgContent.length);
        console.log('SVG after color change:', svgContent.substring(0, 300));
      }

      // 파일 경로 결정 (모든 포맷)
      const filePath = await this.getFilePath(exportOptions, settings);
      console.log('File path:', filePath);
      if (!filePath) {
        throw new Error('파일 경로를 선택하지 않았습니다');
      }

      // 포맷에 따라 저장
      if (exportOptions.format === 'svg') {
        console.log('Saving as SVG');
        await this.saveSvg(filePath, svgContent);
      } else if (exportOptions.format === 'png') {
        console.log('Converting to PNG using canvas, size:', exportOptions.size);
        await this.savePngViaCanvas(filePath, svgContent, exportOptions.size, exportOptions.color);
      }
      console.log('Export completed successfully');
    } catch (error) {
      console.error('Export error:', error);
      throw error;
    }
  }

  /**
   * 파일 경로 결정 (대화상자 또는 자동 저장)
   */
  private async getFilePath(
    options: Required<ExportOptions>,
    settings: any
  ): Promise<string | null> {
    const extension = options.format;
    const fileName = `${options.fileName}.${extension}`;

    // 자동 저장 모드
    if (settings.autoSave && settings.defaultFolder) {
      return `${settings.defaultFolder}/${fileName}`;
    }

    // 대화상자 표시
    return await save({
      defaultPath: settings.defaultFolder
        ? `${settings.defaultFolder}/${fileName}`
        : fileName,
      filters: [{
        name: extension.toUpperCase(),
        extensions: [extension],
      }],
    });
  }

  /**
   * SVG 저장
   */
  private async saveSvg(filePath: string, content: string): Promise<void> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);

    await invoke('save_icon_file', {
      filePath,
      content: Array.from(data),
    });
  }

  /**
   * PNG 저장 (Canvas를 사용하여 브라우저에서 변환)
   */
  private async savePngViaCanvas(
    filePath: string,
    svgContent: string,
    size: number,
    _color: string
  ): Promise<void> {
    console.log('Canvas PNG conversion started, size:', size);
    console.log('SVG content preview:', svgContent.substring(0, 200));

    // SVG를 이미지로 로드
    const img = new Image();
    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    console.log('Created blob URL for SVG');

    await new Promise((resolve, reject) => {
      img.onload = () => {
        console.log('Image loaded successfully, dimensions:', img.width, 'x', img.height);
        resolve(null);
      };
      img.onerror = (e) => {
        console.error('Image load error:', e);
        reject(new Error('Failed to load SVG as image'));
      };
      img.src = url;
    });

    // Canvas에 그리기
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    console.log('Canvas created:', size, 'x', size);

    // 투명 배경
    ctx.clearRect(0, 0, size, size);

    // SVG 그리기
    ctx.drawImage(img, 0, 0, size, size);
    console.log('Image drawn to canvas');

    URL.revokeObjectURL(url);

    // 픽셀 데이터 확인
    const imageData = ctx.getImageData(0, 0, size, size);
    const pixelCount = imageData.data.filter((_, i) => i % 4 === 3 && imageData.data[i] > 0).length;
    console.log('Non-transparent pixels in canvas:', pixelCount);

    if (pixelCount === 0) {
      console.error('WARNING: Canvas has no visible pixels!');
    }

    // PNG로 변환
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), 'image/png');
    });

    console.log('PNG blob created, size:', blob.size, 'bytes');

    const arrayBuffer = await blob.arrayBuffer();
    const pngData = Array.from(new Uint8Array(arrayBuffer));

    console.log('Sending PNG data to Rust for file save, size:', pngData.length, 'bytes');
    await invoke('save_icon_file', {
      filePath,
      content: pngData,
    });
    console.log('File saved successfully via Canvas method');
  }

  /**
   * PNG 저장 (Rust 백엔드에서 변환) - 사용 안 함
   *
   * 참고: Canvas 방식으로 대체했으나, 향후 Rust 백엔드 방식이 필요할 경우를 위해 주석 처리
   */
  // private async _savePng(
  //   filePath: string,
  //   svgContent: string,
  //   size: number
  // ): Promise<void> {
  //   // Rust 백엔드에서 PNG 변환
  //   const pngData = await invoke<number[]>('svg_to_png', {
  //     svgContent,
  //     size,
  //   });

  //   await invoke('save_icon_file', {
  //     filePath,
  //     content: pngData,
  //   });
  // }

  /**
   * SVG 크기 속성 정규화
   * - "1em" 같은 상대 단위를 제거
   * - viewBox에서 실제 크기를 추출하여 width/height로 설정
   */
  private normalizeSvgSize(svg: string): string {
    // viewBox 추출
    const viewBoxMatch = svg.match(/viewBox=["']([^"']+)["']/);
    if (!viewBoxMatch) {
      console.warn('No viewBox found, using default size 24x24');
      // viewBox가 없으면 기본 크기 설정
      return svg.replace(/<svg([^>]*)>/, '<svg$1 width="24" height="24">');
    }

    // viewBox 형식: "x y width height" (예: "0 0 24 24")
    const viewBoxParts = viewBoxMatch[1].split(/\s+/);
    const width = viewBoxParts[2];
    const height = viewBoxParts[3];

    console.log(`Extracted viewBox dimensions: ${width}x${height}`);

    // 기존 width/height 속성 제거하고 viewBox 기반 픽셀 크기로 교체
    let normalized = svg.replace(/\s*width=["'][^"']*["']/g, '');
    normalized = normalized.replace(/\s*height=["'][^"']*["']/g, '');
    normalized = normalized.replace(
      /<svg/,
      `<svg width="${width}" height="${height}"`
    );

    return normalized;
  }

  /**
   * 일괄 내보내기
   */
  async exportMultiple(
    icons: Array<{ prefix: string; name: string }>,
    options?: Partial<ExportOptions>
  ): Promise<void> {
    for (const icon of icons) {
      await this.exportIcon(icon.prefix, icon.name, options);
    }
  }
}

// 싱글톤 인스턴스 내보내기
export const exportService = new ExportService();
