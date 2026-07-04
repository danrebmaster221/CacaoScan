import { useThemeContext } from '@/context/ThemeContext';

export function useColorScheme() {
  const context = useThemeContext();
  return context?.activeTheme || 'light';
}
