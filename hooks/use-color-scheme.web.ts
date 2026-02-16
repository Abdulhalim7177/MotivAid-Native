import { useEffect, useState } from 'react';
import { useAppTheme } from '@/context/theme';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const { theme } = useAppTheme();
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  if (hasHydrated) {
    return theme;
  }

  return 'light';
}
