/**
 * Design tokens shared by every mobile screen.
 *
 * The palette mirrors the web charter: white surfaces, anthracite text, and a
 * single liturgical accent colour (``--accent-color`` on the web).
 */

export const colors = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F5F9',
  ink: '#0F172A',
  inkSoft: '#1E293B',
  inkMuted: '#64748B',
  inkFaint: '#94A3B8',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  accentWash: '#F0F9FF',
  gold: '#EAB308',
  danger: '#DC2626',
  success: '#16A34A',
  warning: '#D97706',
  onAccent: '#FFFFFF',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 36,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 18,
  pill: 999,
} as const;

export const shadows = {
  card: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 2,
  },
} as const;

/** Accent used before the liturgical theme has been read from the API. */
export const DEFAULT_ACCENT_COLOR = '#0284C7';
export const DEFAULT_ACCENT_HOVER = '#0369A1';
export const DEFAULT_SEASON = 'Fêtes mariales';

/**
 * Liturgical palette shipped with the app.
 *
 * It is only a fallback: ``GET /api/liturgical-theme/palette`` is authoritative
 * so the parish can change the colours without shipping a new build.
 */
export const FALLBACK_PALETTE = [
  { id: 'marian', label: 'Bleu ciel', color: '#0284C7', hover: '#0369A1', season: 'Fêtes mariales', occasion: 'Couleur paroissiale par défaut' },
  { id: 'ordinary', label: 'Vert', color: '#16A34A', hover: '#15803D', season: 'Temps ordinaire', occasion: 'Temps Ordinaire' },
  { id: 'advent', label: 'Violet', color: '#7C3AED', hover: '#6D28D9', season: 'Avent et Carême', occasion: 'Temps de pénitence et d\u2019attente' },
  { id: 'martyrs', label: 'Rouge', color: '#DC2626', hover: '#B91C1C', season: 'Fêtes des martyrs', occasion: 'Rameaux, Vendredi Saint, Pentecôte' },
  { id: 'paschal', label: 'Jaune doré', color: '#EAB308', hover: '#CA8A04', season: 'Noël et Temps Pascal', occasion: 'Solennités du Seigneur' },
] as const;

/** Darken a ``#RRGGBB`` colour by ``amount`` (0-1), used when no hover is known. */
export function darken(hex: string, amount = 0.15): string {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (match === null) {
    return hex;
  }
  const value = parseInt(match[1], 16);
  const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((channel) =>
    Math.max(0, Math.round(channel * (1 - amount))),
  );
  return `#${channels.map((channel) => channel.toString(16).padStart(2, '0').toUpperCase()).join('')}`;
}

/** Blend a colour into a light surface, used for chips and accent washes. */
export function tint(hex: string, amount = 0.9): string {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (match === null) {
    return colors.accentWash;
  }
  const value = parseInt(match[1], 16);
  const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((channel) =>
    Math.round(channel + (255 - channel) * amount),
  );
  return `#${channels.map((channel) => channel.toString(16).padStart(2, '0').toUpperCase()).join('')}`;
}
