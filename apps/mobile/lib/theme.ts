import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';

export type ThemeMode = 'dark' | 'light' | 'system';

export const darkTokens = {
  bg: '#030305',
  card: '#0c0c18',
  border: '#222240',
  text: '#ffffff',
  muted: '#b0b0d0',
  purple: '#7c6df5',
  cyan: '#00d4d4',
  green: '#00e096',
  red: '#ff4d6d',
};

export const lightTokens = {
  bg: '#f4f4f8',
  card: '#ffffff',
  border: '#e0e0f0',
  text: '#0a0a1a',
  muted: '#6060a0',
  purple: '#7c6df5',
  cyan: '#0099aa',
  green: '#009966',
  red: '#cc2244',
};

export type Tokens = typeof darkTokens;

const THEME_KEY = 'mosaic_mobile_theme';

export function useTheme(): { tokens: Tokens; mode: ThemeMode; setMode: (m: ThemeMode) => void; isDark: boolean } {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((saved) => {
      if (saved === 'dark' || saved === 'light' || saved === 'system') {
        setModeState(saved);
      }
    });
  }, []);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(THEME_KEY, m);
  };

  const resolved = mode === 'system' ? (systemScheme ?? 'dark') : mode;
  const isDark = resolved === 'dark';
  const tokens = isDark ? darkTokens : lightTokens;

  return { tokens, mode, setMode, isDark };
}
