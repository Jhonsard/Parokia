/**
 * Typed bindings for the Parokia REST API consumed by the mobile app.
 *
 * Every path mirrors a router in ``backend/parokia/routers``.
 */

import { apiRequest } from './client';
import type {
  Chapel,
  Choir,
  LiturgicalPaletteEntry,
  LiturgicalTheme,
  MassSchedule,
  MassScheduleCreate,
  MembershipRequest,
  MembershipReview,
  Page,
  RequestStatus,
  TokenResponse,
  UserRecord,
} from './types';

export const api = {
  /** ``POST /api/auth/login`` — JSON login used by the mobile client. */
  login(email: string, password: string): Promise<TokenResponse> {
    return apiRequest<TokenResponse>('/api/auth/login', {
      method: 'POST',
      auth: false,
      body: { email, password },
    });
  },

  /** ``GET /api/auth/me`` — profile of the authenticated account. */
  me(): Promise<UserRecord> {
    return apiRequest<UserRecord>('/api/auth/me');
  },

  /** ``GET /api/auth/me/choir`` — choir attached to a CHOIR_LEADER account. */
  async myChoir(): Promise<Choir | null> {
    const payload = await apiRequest<{ choir: Choir }>('/api/auth/me/choir');
    return payload.choir;
  },

  /** ``GET /api/chapels`` — the eight chapel communities. */
  chapels(): Promise<Chapel[]> {
    return apiRequest<Chapel[]>('/api/chapels');
  },

  /** ``GET /api/choirs`` — paginated choir directory. */
  choirs(params: {
    chapelId?: number;
    status?: RequestStatus;
    limit?: number;
    offset?: number;
  } = {}): Promise<Page<Choir>> {
    return apiRequest<Page<Choir>>('/api/choirs', {
      auth: false,
      query: {
        chapel_id: params.chapelId,
        status: params.status,
        limit: params.limit,
        offset: params.offset,
      },
    });
  },

  /** ``GET /api/masses`` — the parish agenda, ordered by date then time. */
  masses(params: {
    chapelId?: number;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<Page<MassSchedule>> {
    return apiRequest<Page<MassSchedule>>('/api/masses', {
      auth: false,
      query: {
        chapel_id: params.chapelId,
        start_date: params.startDate,
        end_date: params.endDate,
        limit: params.limit,
        offset: params.offset,
      },
    });
  },

  /** ``POST /api/masses`` — ADMIN or CHOIR_LEADER schedules a mass. */
  createMass(payload: MassScheduleCreate): Promise<MassSchedule> {
    return apiRequest<MassSchedule>('/api/masses', { method: 'POST', body: payload });
  },

  /** ``GET /api/membership-requests`` — review queue (ADMIN or CHOIR_LEADER). */
  membershipRequests(params: {
    status?: RequestStatus;
    limit?: number;
    offset?: number;
  } = {}): Promise<Page<MembershipRequest>> {
    return apiRequest<Page<MembershipRequest>>('/api/membership-requests', {
      query: { status: params.status, limit: params.limit, offset: params.offset },
    });
  },

  /** ``PATCH /api/membership-requests/{id}`` — ADMIN decision on a request. */
  reviewMembership(id: number, payload: MembershipReview): Promise<MembershipRequest> {
    return apiRequest<MembershipRequest>(`/api/membership-requests/${id}`, {
      method: 'PATCH',
      body: payload,
    });
  },

  /** ``GET /api/liturgical-theme`` — accent colour currently in force. */
  liturgicalTheme(): Promise<LiturgicalTheme> {
    return apiRequest<LiturgicalTheme>('/api/liturgical-theme', { auth: false });
  },

  /** ``GET /api/liturgical-theme/palette`` — the five configurable accents. */
  liturgicalPalette(): Promise<LiturgicalPaletteEntry[]> {
    return apiRequest<LiturgicalPaletteEntry[]>('/api/liturgical-theme/palette', { auth: false });
  },
};

export type ParokiaApi = typeof api;
