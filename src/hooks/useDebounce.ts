import { useEffect, useState } from 'react';

/**
 * 값을 디바운싱하는 훅
 * @param value 디바운싱할 값
 * @param delay 지연 시간 (밀리초, 기본값: 400ms)
 * @returns 디바운싱된 값
 */
export function useDebounce<T>(value: T, delay: number = 400): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // delay 후에 값을 업데이트하는 타이머 설정
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // value나 delay가 변경되면 이전 타이머를 정리
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
