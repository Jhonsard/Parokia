/**
 * Thin ``fetch`` wrapper shared by every Parokia endpoint.
 *
 * Responsibilities: resolve the base URL, attach the bearer token, serialise
 * query parameters, enforce a timeout, and turn FastAPI error payloads into a
 * single typed :class:`ApiError` with a message that is safe to display.
 */

import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '../config';

export type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, QueryValue>;
  /** Set to ``false`` for endpoints that must run unauthenticated. */
  auth?: boolean;
  timeoutMs?: number;
}

/** Error raised for every non-2xx response and every transport failure. */
export class ApiError extends Error {
  readonly status: number;
  readonly retryAfterSeconds: number | null;

  constructor(message: string, status: number, retryAfterSeconds: number | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }

  /** True when the failure is a transport problem rather than a server verdict. */
  get isNetworkError(): boolean {
    return this.status === 0;
  }

  /** True when the session expired or the token is missing. */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** True when the signed-in role is not allowed to perform the request. */
  get isForbidden(): boolean {
    return this.status === 403;
  }
}

let accessToken: string | null = null;

/** Register (or clear) the JWT used by every subsequent request. */
export function setAccessToken(token: string | null): void {
  accessToken = token;
}

/** Currently registered JWT, exposed for the auth provider. */
export function getAccessToken(): string | null {
  return accessToken;
}

function buildQuery(query?: Record<string, QueryValue>): string {
  if (query === undefined) {
    return '';
  }
  const parts: string[] = [];
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

interface ErrorDetailEntry {
  field?: unknown;
  message?: unknown;
}

/**
 * Extract a displayable message from a Parokia error payload.
 *
 * The backend answers with ``{"error": {"code", "message", "details": [...]}}``
 * (see ``backend/parokia/errors.py``); plain FastAPI validation errors use
 * ``{"detail": "…"}`` or ``{"detail": [{loc, msg}]}``. Both shapes are handled.
 */
function readDetail(payload: unknown): string | null {
  if (payload === null || typeof payload !== 'object') {
    return null;
  }

  const envelope = (payload as { error?: unknown }).error;
  if (envelope !== null && typeof envelope === 'object') {
    const errorObject = envelope as { message?: unknown; details?: unknown };
    const details = Array.isArray(errorObject.details) ? (errorObject.details as ErrorDetailEntry[]) : [];
    if (details.length > 0) {
      const rendered = details
        .map((entry) => {
          const message = typeof entry.message === 'string' ? entry.message : null;
          if (message === null) {
            return null;
          }
          const field = typeof entry.field === 'string' && entry.field !== 'body' ? entry.field : '';
          return field.length > 0 ? `${field} : ${message}` : message;
        })
        .filter((entry): entry is string => entry !== null);
      if (rendered.length > 0) {
        return rendered.join(' · ');
      }
    }
    if (typeof errorObject.message === 'string' && errorObject.message.trim().length > 0) {
      return errorObject.message;
    }
  }

  const detail = (payload as { detail?: unknown }).detail;
  if (typeof detail === 'string' && detail.trim().length > 0) {
    return detail;
  }
  if (Array.isArray(detail)) {
    const messages = detail
      .map((entry) => {
        if (entry !== null && typeof entry === 'object' && typeof (entry as { msg?: unknown }).msg === 'string') {
          const msg = (entry as { msg: string }).msg;
          const loc = (entry as { loc?: unknown[] }).loc;
          const field = Array.isArray(loc) ? loc.filter((part) => part !== 'body').join('.') : '';
          return field.length > 0 ? `${field} : ${msg}` : msg;
        }
        return null;
      })
      .filter((message): message is string => message !== null);
    if (messages.length > 0) {
      return messages.join(' · ');
    }
  }
  return null;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

const STATUS_FALLBACK: Record<number, string> = {
  400: 'Requête refusée par le serveur paroissial.',
  401: 'Session expirée : reconnectez-vous.',
  403: 'Votre rôle ne permet pas cette action.',
  404: 'Ressource introuvable.',
  409: 'Conflit : cette donnée existe déjà.',
  422: 'Certaines informations sont invalides.',
  429: 'Trop de tentatives : patientez quelques minutes.',
  500: 'Erreur interne du serveur paroissial.',
  502: 'Le serveur paroissial est momentanément indisponible.',
  503: 'Le serveur paroissial est momentanément indisponible.',
};

function fallbackMessage(status: number): string {
  return STATUS_FALLBACK[status] ?? `Erreur ${status} du serveur paroissial.`;
}

/**
 * Perform an authenticated JSON request and return the decoded body.
 *
 * @throws {ApiError} on any non-2xx status, timeout, or transport failure.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}${buildQuery(options.query)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? REQUEST_TIMEOUT_MS);
  const useAuth = options.auth !== false;
  const headers: Record<string, string> = { Accept: 'application/json' };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (useAuth && accessToken !== null) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  try {
    const response = await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });

    if (response.status === 204) {
      return undefined as T;
    }

    const raw = await response.text();
    const payload = raw.length > 0 ? parseJson(raw) : null;

    if (!response.ok) {
      const retryAfter = Number.parseInt(response.headers.get('Retry-After') ?? '', 10);
      throw new ApiError(
        readDetail(payload) ?? fallbackMessage(response.status),
        response.status,
        Number.isNaN(retryAfter) ? null : retryAfter,
      );
    }

    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    const name = (error as { name?: string } | null)?.name;
    if (name === 'AbortError') {
      throw new ApiError('Le serveur paroissial ne répond pas (délai dépassé).', 0);
    }
    throw new ApiError(
      `Connexion impossible à l’API Parokia (${API_BASE_URL}). Vérifiez le réseau ou EXPO_PUBLIC_API_URL.`,
      0,
    );
  } finally {
    clearTimeout(timeout);
  }
}

/** Human-readable message for any thrown value. */
export function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return 'Une erreur inattendue est survenue.';
}
