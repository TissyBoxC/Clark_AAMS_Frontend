import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { fetchIdentity, logoutAccount } from '../api/account';
import { setLoginCode } from '../lib/storage';
import { AuthContext } from './auth-context';
import type { IAuthContextType } from './auth-context';
import type { IUserType, UserRoleType } from '../types';

const EMPTY_USER: IUserType = {
  id: 0,
  username: '',
  email: '',
  loginCode: '',
  emailBound: false,
  emailVerified: false,
  questionAnalysisCount: 0,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<IUserType | null>(null);
  const [role, setRole] = useState<UserRoleType>('guest');
  const [displayName, setDisplayName] = useState('');
  const [isResolved, setIsResolved] = useState(false);

  const applyUser = useCallback((next: IUserType | null) => {
    setUser(next && next.id > 0 ? next : null);
    if (next?.role) {
      setRole(next.role);
    }
    if (next?.loginCode) {
      setLoginCode(next.loginCode);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const identity = await fetchIdentity();
      setRole(identity.role);
      setDisplayName(identity.displayName);
      setUser(identity.authenticated && identity.user && identity.user.id > 0 ? identity.user : null);
      if (identity.user?.loginCode) {
        setLoginCode(identity.user.loginCode);
      }
    } catch {
      setRole('guest');
      setUser(null);
    } finally {
      setIsResolved(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap(): Promise<void> {
      try {
        const identity = await fetchIdentity();
        if (cancelled) {
          return;
        }
        setRole(identity.role);
        setDisplayName(identity.displayName);
        setUser(identity.authenticated && identity.user && identity.user.id > 0 ? identity.user : null);
        if (identity.user?.loginCode) {
          setLoginCode(identity.user.loginCode);
        }
      } catch {
        if (!cancelled) {
          setRole('guest');
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsResolved(true);
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logoutAccount();
    } catch {
      // 即使这次没能通知服务端，本地凭据也要清掉，否则界面会停在「已登录」的假象里。
    }
    setLoginCode('');
    setUser(null);
    setRole('guest');
    setDisplayName('');
  }, []);

  const value = useMemo<IAuthContextType>(() => {
    const currentUser = user ?? EMPTY_USER;
    return {
      user,
      role,
      displayName: displayName || currentUser.username,
      isResolved,
      isVerified: Boolean(currentUser.emailVerified),
      refresh,
      applyUser,
      signOut,
    };
  }, [applyUser, displayName, isResolved, refresh, role, signOut, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
