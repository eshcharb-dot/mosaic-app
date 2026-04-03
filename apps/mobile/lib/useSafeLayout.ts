import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLayout } from './useLayout';

export function useSafeLayout() {
  const insets = useSafeAreaInsets();
  const layout = useLayout();

  const contentPadding = {
    paddingTop: insets.top + (layout.mode === 'tablet' ? 24 : 16),
    paddingBottom: insets.bottom + 16,
    paddingHorizontal: layout.mode === 'tablet' ? 40 : 16,
  };

  return { ...layout, insets, contentPadding };
}
