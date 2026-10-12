/**
 * Typography provider.
 *
 * The web front uses Manrope for interface text and Fraunces for editorial
 * titles. Both families are bundled so the app renders without relying on
 * Google Fonts, but the screens keep the system font whenever the assets fail
 * to load — a missing font must never block the parish app.
 */

import {
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import { useFonts } from 'expo-font';
import React, { createContext, useContext } from 'react';

export interface FontFamilies {
  display: string;
  displayStrong: string;
  body: string;
  bodyMedium: string;
  bodySemibold: string;
  bodyBold: string;
}

const BUNDLED_FAMILIES: FontFamilies = {
  display: 'Fraunces_600SemiBold',
  displayStrong: 'Fraunces_700Bold',
  body: 'Manrope_400Regular',
  bodyMedium: 'Manrope_500Medium',
  bodySemibold: 'Manrope_600SemiBold',
  bodyBold: 'Manrope_700Bold',
};

const FontsContext = createContext<FontFamilies | null>(null);

export function FontsProvider({ children }: { children: React.ReactNode }) {
  const [loaded, error] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
  });

  const value = loaded && error === null ? BUNDLED_FAMILIES : null;

  return <FontsContext.Provider value={value}>{children}</FontsContext.Provider>;
}

/**
 * Bundled font families, or ``null`` while they load (or when loading failed),
 * in which case the platform font is used.
 */
export function useFontFamilies(): FontFamilies | null {
  return useContext(FontsContext);
}
