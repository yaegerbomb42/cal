import { useCallback, useLayoutEffect, useState } from 'react';

/**
 * @param {{
 *  containerRef: import('react').RefObject<HTMLElement>,
 *  minPixels?: number,
 *  maxPixels?: number,
 *  offset?: number
 * }} options
 */
export const useHourScale = ({ containerRef, minPixels = 24, maxPixels = 64, offset = 0, fitToViewport = false }) => {
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

    const rawValue = availableHeight / 24;
    const next = fitToViewport
      ? rawValue
      : Math.max(minPixels, Math.min(maxPixels, rawValue));
    setPixelsPerHour(next);
  }, [containerRef, minPixels, maxPixels, offset, fitToViewport]);

  useLayoutEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale]);

  return pixelsPerHour;
};
