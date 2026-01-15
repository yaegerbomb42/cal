import { useCallback, useLayoutEffect, useState } from 'react';

/**
 * @param {{
 *  containerRef: import('react').RefObject<HTMLElement>,
 *  minPixels?: number,
 *  maxPixels?: number,
 *  offset?: number
 * }} options
 */
export const useHourScale = ({ containerRef, minPixels = 24, maxPixels = 64, offset = 16 }) => {
  const [pixelsPerHour, setPixelsPerHour] = useState(36);

  const updateScale = useCallback(() => {
    if (!containerRef.current) {
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const availableHeight = window.innerHeight - rect.top - offset;

    if (availableHeight <= 0) {
      return;
    }

    const next = Math.max(minPixels, Math.min(maxPixels, availableHeight / 24));
    setPixelsPerHour(next);
  }, [containerRef, minPixels, maxPixels, offset]);

  useLayoutEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale]);

  return pixelsPerHour;
};
