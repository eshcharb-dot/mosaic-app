import { useWindowDimensions } from 'react-native';

export type LayoutMode = 'phone' | 'tablet';

export function useLayout(): { mode: LayoutMode; width: number; height: number; columns: number } {
  const { width, height } = useWindowDimensions();
  const mode: LayoutMode = width >= 768 ? 'tablet' : 'phone';
  const columns = mode === 'tablet' ? 2 : 1;
  return { mode, width, height, columns };
}
