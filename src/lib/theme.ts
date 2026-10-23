import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';
const STORAGE_KEY = 'kitchone-theme';

function readTheme(): Theme {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

/** Tema claro/oscuro con clase `dark` en <html>, persistido en localStorage. */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(readTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* almacenamiento no disponible */
    }
    window.dispatchEvent(new CustomEvent('kitchone:theme', { detail: theme }));
  }, [theme]);

  useEffect(() => {
    const onChange = (e: Event) => {
      const next = (e as CustomEvent<Theme>).detail;
      setThemeState((cur) => (cur === next ? cur : next));
    };
    window.addEventListener('kitchone:theme', onChange);
    return () => window.removeEventListener('kitchone:theme', onChange);
  }, []);

  const toggle = useCallback(() => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')), []);

  return { theme, setTheme: setThemeState, toggle };
}

/** Lee un token CSS como color utilizable en SVG/Recharts. */
export function tokenColor(name: string, alpha = 1): string {
  if (typeof window === 'undefined') return '#000';
  const raw = getComputedStyle(document.documentElement).getPropertyValue(`--c-${name}`).trim();
  if (!raw) return '#000';
  return alpha === 1 ? `rgb(${raw})` : `rgb(${raw} / ${alpha})`;
}
