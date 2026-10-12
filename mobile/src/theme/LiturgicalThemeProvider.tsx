/**
 * Liturgical accent provider.
 *
 * The parish administration controls the accent colour from the web console;
 * the mobile app reads ``GET /api/liturgical-theme`` plus the palette endpoint
 * and falls back to the shipped Marian blue when the API cannot be reached, so
 * the app always renders.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { api } from '../api/endpoints';
import type { LiturgicalPaletteEntry } from '../api/types';
import {
  DEFAULT_ACCENT_COLOR,
  DEFAULT_ACCENT_HOVER,
  DEFAULT_SEASON,
  FALLBACK_PALETTE,
  darken,
} from './tokens';

export interface LiturgicalThemeContextValue {
  /** Accent colour currently applied to buttons, chips and highlights. */
  accent: string;
  /** Pressed/active shade of the accent colour. */
  accentHover: string;
  /** Liturgical season label in force. */
  season: string;
  /** Configurable palette, newest value from the API. */
  palette: LiturgicalPaletteEntry[];
  /** True while the palette comes from the bundled fallback. */
  usingFallback: boolean;
  /** Locally previewed colour, cleared when the screen is left. */
  previewColor: string | null;
  setPreviewColor: (color: string | null) => void;
  reload: () => Promise<void>;
}

const LiturgicalThemeContext = createContext<LiturgicalThemeContextValue | null>(null);

export function LiturgicalThemeProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccent] = useState<string>(DEFAULT_ACCENT_COLOR);
  const [season, setSeason] = useState<string>(DEFAULT_SEASON);
  const [palette, setPalette] = useState<LiturgicalPaletteEntry[]>([...FALLBACK_PALETTE]);
  const [usingFallback, setUsingFallback] = useState<boolean>(true);
  const [previewColor, setPreviewColor] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [theme, remotePalette] = await Promise.all([
        api.liturgicalTheme(),
        api.liturgicalPalette(),
      ]);
      setAccent(theme.current_color);
      setSeason(theme.active_season);
      if (Array.isArray(remotePalette) && remotePalette.length > 0) {
        setPalette(remotePalette);
      }
      setUsingFallback(false);
    } catch {
      setAccent(DEFAULT_ACCENT_COLOR);
      setSeason(DEFAULT_SEASON);
      setPalette([...FALLBACK_PALETTE]);
      setUsingFallback(true);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const activeAccent = previewColor ?? accent;

  const accentHover = useMemo(() => {
    const entry = palette.find(
      (item) => item.color.toUpperCase() === activeAccent.toUpperCase(),
    );
    return entry?.hover ?? darken(activeAccent);
  }, [palette, activeAccent]);

  const value = useMemo<LiturgicalThemeContextValue>(
    () => ({
      accent: activeAccent,
      accentHover,
      season,
      palette,
      usingFallback,
      previewColor,
      setPreviewColor,
      reload,
    }),
    [activeAccent, accentHover, season, palette, usingFallback, previewColor, reload],
  );

  return (
    <LiturgicalThemeContext.Provider value={value}>{children}</LiturgicalThemeContext.Provider>
  );
}

/** Access the liturgical theme; throws when used outside the provider. */
export function useLiturgicalTheme(): LiturgicalThemeContextValue {
  const context = useContext(LiturgicalThemeContext);
  if (context === null) {
    throw new Error('useLiturgicalTheme must be used inside <LiturgicalThemeProvider>');
  }
  return context;
}

/** Re-exported for screens that only need the neutral defaults. */
export { DEFAULT_ACCENT_COLOR, DEFAULT_ACCENT_HOVER };
