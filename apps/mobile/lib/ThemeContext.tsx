import React, { createContext, useContext, ReactNode } from 'react';
import { useTheme, ThemeMode, Tokens } from './theme';

interface ThemeContextValue {
  tokens: Tokens;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  tokens: require('./theme').darkTokens,
  mode: 'system',
  setMode: () => {},
  isDark: true,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
