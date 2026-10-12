/**
 * TypeScript mirror of ``backend/parokia/schemas.py``.
 *
 * Every field keeps the snake_case name returned by FastAPI so payloads can be
 * compared one-to-one with the Pydantic models.
 */

export type Role = 'ADMIN' | 'CHOIR_LEADER' | 'PUBLIC';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface PageMeta {
  total: number;
  limit: number;
  offset: number;
}

/** Envelope returned by every paginated list endpoint. */
export interface Page<T> {
  items: T[];
  meta: PageMeta;
}

export interface Chapel {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  image_url?: string | null;
  created_at?: string | null;
}

export interface UserRecord {
  id: number;
  full_name: string;
  email: string;
  role: Role;
  choir_id?: number | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  role: Role;
}

export interface Choir {
  id: number;
  name: string;
  chapel_id: number;
  chapel_code?: string | null;
  leader_name: string;
  leader_email: string;
  status: RequestStatus;
  created_at: string;
}

export interface MassSchedule {
  id: number;
  chapel_id: number;
  chapel: string;
  chapel_code?: string | null;
  choir_id?: number | null;
  choir?: string | null;
  /** ISO calendar date, ``YYYY-MM-DD``. */
  mass_date: string;
  /** 24h clock time, ``HH:MM:SS``. */
  mass_time: string;
  title: string;
  liturgical_color: string;
  created_at?: string | null;
}

export interface MembershipRequest {
  id: number;
  full_name: string;
  choir_name: string;
  chapel_id: number;
  chapel_name?: string | null;
  status: RequestStatus;
  submitted_at: string;
  reviewed_by?: number | null;
  reviewed_at?: string | null;
}

export interface MembershipReview {
  action: 'approve' | 'reject';
  reason?: string;
}

export interface LiturgicalTheme {
  id: number;
  current_color: string;
  active_season: string;
  updated_at: string;
  updated_by?: number | null;
}

export interface LiturgicalPaletteEntry {
  id: string;
  label: string;
  color: string;
  hover: string;
  season: string;
  occasion: string;
}

export interface MassScheduleCreate {
  chapel_id: number;
  choir_id?: number | null;
  mass_date: string;
  mass_time: string;
  title: string;
  liturgical_color: string;
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administration',
  CHOIR_LEADER: 'Responsable de chorale',
  PUBLIC: 'Membre de la communauté',
};

export const STATUS_LABELS: Record<RequestStatus, string> = {
  PENDING: 'En attente',
  APPROVED: 'Approuvé',
  REJECTED: 'Rejeté',
};
