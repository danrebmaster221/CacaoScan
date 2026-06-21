import { useState, useCallback, useRef } from 'react';

export interface LocationResult {
  place_id: number;
  display_name: string;
}

export function useLocationSearch() {
  const [results, setResults] = useState<LocationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const searchLocation = useCallback((query: string) => {
    // Clear the previous timer if user keeps typing
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (!query || query.length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Debounce the fetch by 600ms to avoid Nominatim 429 Rate Limits
    debounceTimer.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
            query
          )}&format=json&countrycodes=ph&limit=5`,
          {
            headers: {
              'User-Agent': 'CacaoScanApp/1.0',
            },
          }
        );
        
        if (!response.ok) {
           throw new Error('Nominatim returned error ' + response.status);
        }
        
        const data = await response.json();
        setResults(data);
      } catch (e) {
        console.warn('Location search failed:', e);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 600);
  }, []);

  const clearResults = () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setResults([]);
  };

  return {
    results,
    loading,
    searchLocation,
    clearResults,
  };
}
