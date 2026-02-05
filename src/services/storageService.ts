import { Store } from '@tauri-apps/plugin-store';
import { invoke } from '@tauri-apps/api/core';
import { ExportSettings } from '@/types/export';

/**
 * Tauri Store를 사용한 데이터 영속성 서비스
 */
export class StorageService {
  private store: Store | null = null;

  /**
   * Store 인스턴스 가져오기 (lazy initialization)
   */
  private async getStore(): Promise<Store> {
    if (!this.store) {
      this.store = await Store.load('iconmaker.json');
    }
    return this.store;
  }

  /**
   * 즐겨찾기 목록 가져오기
   */
  async getFavorites(): Promise<string[]> {
    const store = await this.getStore();
    return (await store.get<string[]>('favorites')) || [];
  }

  /**
   * 즐겨찾기 목록 저장
   */
  async saveFavorites(favorites: string[]): Promise<void> {
    const store = await this.getStore();
    await store.set('favorites', favorites);
    await store.save();
  }

  /**
   * 즐겨찾기 추가
   */
  async addFavorite(iconName: string): Promise<void> {
    console.log('Adding favorite:', iconName);
    const favorites = await this.getFavorites();
    if (!favorites.includes(iconName)) {
      const newFavorites = [...favorites, iconName];
      await this.saveFavorites(newFavorites);
      console.log('Favorite added successfully. Total favorites:', newFavorites.length);
    } else {
      console.log('Icon already in favorites');
    }
  }

  /**
   * 즐겨찾기 제거
   */
  async removeFavorite(iconName: string): Promise<void> {
    console.log('Removing favorite:', iconName);
    const favorites = await this.getFavorites();
    const newFavorites = favorites.filter(f => f !== iconName);
    await this.saveFavorites(newFavorites);
    console.log('Favorite removed successfully. Total favorites:', newFavorites.length);
  }

  /**
   * 최근 검색어 가져오기
   */
  async getRecentSearches(): Promise<string[]> {
    const store = await this.getStore();
    return (await store.get<string[]>('recentSearches')) || [];
  }

  /**
   * 최근 검색어 추가
   */
  async addRecentSearch(query: string): Promise<void> {
    const store = await this.getStore();
    const searches = await this.getRecentSearches();
    const filtered = searches.filter(s => s !== query);
    await store.set('recentSearches', [query, ...filtered].slice(0, 10));
    await store.save();
  }

  /**
   * 내보내기 설정 가져오기
   */
  async getExportSettings(): Promise<ExportSettings> {
    const store = await this.getStore();
    return (await store.get<ExportSettings>('exportSettings')) || {
      defaultFolder: '',
      format: 'png',
      size: 128,
      color: '#000000',
      autoSave: true, // 항상 자동 저장 모드
    };
  }

  /**
   * 내보내기 설정 저장
   */
  async saveExportSettings(settings: ExportSettings): Promise<void> {
    const store = await this.getStore();
    await store.set('exportSettings', settings);
    await store.save();
  }

  /**
   * 기본 저장 폴더 초기화
   * - 시스템 다운로드 폴더에 Download_Icon 폴더 생성
   * - 기본 폴더가 비어있을 때만 설정
   */
  async initializeDefaultFolder(): Promise<void> {
    try {
      const currentSettings = await this.getExportSettings();

      // 이미 기본 폴더가 설정되어 있으면 건너뛰기
      if (currentSettings.defaultFolder) {
        console.log('Default folder already set:', currentSettings.defaultFolder);
        return;
      }

      // Rust 명령어로 Download_Icon 폴더 생성 및 경로 가져오기
      const folderPath = await invoke<string>('setup_default_folder');
      console.log('Default folder initialized:', folderPath);

      // 설정에 저장
      await this.saveExportSettings({
        ...currentSettings,
        defaultFolder: folderPath,
      });

      console.log('Default folder saved to settings');
    } catch (error) {
      console.error('Failed to initialize default folder:', error);
      // 에러가 발생해도 앱 실행을 방해하지 않음
    }
  }
}

// 싱글톤 인스턴스 내보내기
export const storageService = new StorageService();
