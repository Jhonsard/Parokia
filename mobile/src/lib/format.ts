/**
 * Locale-aware formatters.
 *
 * Hermes ships without a guaranteed ``Intl`` implementation, so dates are
 * formatted with explicit French tables instead of ``toLocaleDateString``.
 */

const MONTHS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

const SHORT_WEEKDAYS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

/** Parse an ISO ``YYYY-MM-DD`` date without a timezone shift. */
export function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map((part) => Number.parseInt(part, 10));
  return new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1, 12, 0, 0));
}

/** Today's date as ``YYYY-MM-DD`` in the device timezone. */
export function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** ISO date shifted by ``days``, used for the 7/30-day agenda windows. */
export function isoDatePlusDays(days: number): string {
  const now = new Date();
  now.setDate(now.getDate() + days);
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** ``2026-10-04`` → ``dimanche 4 octobre 2026``. */
export function formatLongDate(isoDate: string): string {
  const date = parseIsoDate(isoDate);
  return `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** ``2026-10-04`` → ``dim. 4 oct.``. */
export function formatShortDate(isoDate: string): string {
  const date = parseIsoDate(isoDate);
  return `${SHORT_WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()].slice(0, 4)}.`;
}

/** ``08:00:00`` → ``08:00``. */
export function formatTime(value: string): string {
  return value.slice(0, 5);
}

/** ``2026-10-04`` → ``04/10/2026``. */
export function formatNumericDate(isoDate: string): string {
  const date = parseIsoDate(isoDate);
  return `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}`;
}

/** ISO timestamp → ``4 octobre 2026 à 17:45``. */
export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()} à ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Validation helper for the scheduling form: ``YYYY-MM-DD``. */
export function isValidIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (match === null) {
    return false;
  }
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return (
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day)
  );
}

/** Validation helper for the scheduling form: ``HH:MM``. */
export function isValidClockTime(value: string): boolean {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (match === null) {
    return false;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

/** Normalise ``HH:MM`` or ``HH:MM:SS`` to the ``HH:MM:SS`` the API expects. */
export function toApiTime(value: string): string {
  const trimmed = value.trim();
  return trimmed.length === 5 ? `${trimmed}:00` : trimmed;
}
