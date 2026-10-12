/**
 * Authentication state for the choir-leader app.
 *
 * The provider restores the JWT from secure storage on launch, hydrates the
 * profile (and the attached choir for CHOIR_LEADER accounts), and exposes
 * ``signIn`` / ``signOut`` to the screens.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { api } from '../api/endpoints';
import { ApiError, setAccessToken } from '../api/client';
import type { Choir, UserRecord } from '../api/types';
import { clearStoredToken, readStoredToken, storeToken } from './tokenStorage';

export type AuthStatus = 'restoring' | 'anonymous' | 'authenticated';

export interface AuthContextValue {
  status: AuthStatus;
  user: UserRecord | null;
  choir: Choir | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  reloadProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('restoring');
  const [user, setUser] = useState<UserRecord | null>(null);
  const [choir, setChoir] = useState<Choir | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const hydrate = useCallback(async (): Promise<UserRecord> => {
    const profile = await api.me();
    let attached: Choir | null = null;
    if (profile.choir_id !== null && profile.choir_id !== undefined) {
      try {
        attached = await api.myChoir();
      } catch (error) {
        if (!(error instanceof ApiError) || !error.isForbidden) {
          attached = null;
        }
      }
    }
    if (mounted.current) {
      setUser(profile);
      setChoir(attached);
      setStatus('authenticated');
    }
    return profile;
  }, []);

  // Restore the previous session exactly once, on first mount.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const token = await readStoredToken();
      if (cancelled) {
        return;
      }
      if (token === null) {
        setStatus('anonymous');
        return;
      }
      setAccessToken(token);
      try {
        await hydrate();
      } catch {
        setAccessToken(null);
        await clearStoredToken();
        if (!cancelled) {
          setUser(null);
          setChoir(null);
          setStatus('anonymous');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrate]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const session = await api.login(email.trim().toLowerCase(), password);
      await storeToken(session.access_token);
      setAccessToken(session.access_token);
      await hydrate();
    },
    [hydrate],
  );

  const signOut = useCallback(async () => {
    setAccessToken(null);
    await clearStoredToken();
    if (mounted.current) {
      setUser(null);
      setChoir(null);
      setStatus('anonymous');
    }
  }, []);

  const reloadProfile = useCallback(async () => {
    await hydrate();
  }, [hydrate]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, choir, signIn, signOut, reloadProfile }),
    [status, user, choir, signIn, signOut, reloadProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Access the authentication context; throws when used outside the provider. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return context;
}
