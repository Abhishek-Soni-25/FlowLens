import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';
const THEME_KEY = 'flowlens:theme';

function initialTheme(): Theme {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
    window.postMessage(
      { source: 'flowlens-web', type: 'FLOWLENS_SYNC_THEME', theme },
      window.location.origin,
    );
  }, [theme]);
  return { theme, toggleTheme: () => setTheme((value) => (value === 'light' ? 'dark' : 'light')) };
}
