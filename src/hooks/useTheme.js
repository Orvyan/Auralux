import { useState, useEffect, useCallback } from 'react';

export default function useTheme() {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('auralux_theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    localStorage.setItem('auralux_theme', theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, toggle };
}
