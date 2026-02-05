import { useQuery } from '@tanstack/react-query';
import { iconifyApi } from '@/services/iconifyApi';

/**
 * 특정 아이콘의 SVG를 가져오는 훅
 *
 * @param prefix 아이콘 세트 (예: "mdi", "lucide")
 * @param name 아이콘 이름 (예: "home", "user")
 * @returns SVG 문자열 및 로딩 상태
 */
export function useIconDetails(prefix: string, name: string) {
  return useQuery({
    queryKey: ['icon', 'details', prefix, name],
    queryFn: () => iconifyApi.getIconSvg(prefix, name),
    // 한 번 가져온 SVG는 계속 유효
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60, // 1시간
    // prefix와 name이 모두 있을 때만 실행
    enabled: !!prefix && !!name,
  });
}
