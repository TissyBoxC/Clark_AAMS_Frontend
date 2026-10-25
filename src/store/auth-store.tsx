/*
 * SPA 全局认证状态仓库。
 * 负责初始化当前会话、同步登录码，并向页面暴露用户刷新能力。
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { PropsWithChildren } from 'react';
import type { IUserType } from '../types/app-types';

import { ensureUserSession } from '../api/user-api';
import { AuthStoreContext } from './auth-context';
import { captureLoginCodeFromUrl, clearStoredLoginCode, setStoredLoginCode } from '../utils/auth-storage';
import { createGuestUser } from '../api/user-api';

export interface IAuthStoreValueType {
  isAuthResolved: boolean;
  user: IUserType;
  refreshUser: () => Promise<IUserType>;
  updateUser: (user: IUserType) => void;
  clearUser: () => void;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<IUserType>(createGuestUser());
  const [isAuthResolved, setIsAuthResolved] = useState<boolean>(false);
  const hasBootstrappedAuthRef = useRef(false);

  const refreshUser = useCallback(async (): Promise<IUserType> => {
    const nextUser = await ensureUserSession();
    setUser(nextUser);
    setIsAuthResolved(true);
    return nextUser;
  }, []);

  const updateUser = useCallback((nextUser: IUserType): void => {
    setStoredLoginCode(nextUser.loginCode);
    setUser(nextUser);
    setIsAuthResolved(true);
  }, []);

  const clearUser = useCallback((): void => {
    clearStoredLoginCode();
    setUser(createGuestUser());
    setIsAuthResolved(true);
  }, []);

  useEffect(() => {
    if (hasBootstrappedAuthRef.current) {
      return;
    }

    // React StrictMode 会在开发环境重放 effect，这里加守卫避免首次会话恢复重复请求。
    hasBootstrappedAuthRef.current = true;
    captureLoginCodeFromUrl();
    void refreshUser();
  }, [refreshUser]);

  const value = useMemo<IAuthStoreValueType>(
    () => ({
      isAuthResolved,
      user,
      refreshUser,
      updateUser,
      clearUser,
    }),
    [clearUser, isAuthResolved, refreshUser, updateUser, user],
  );

  return <AuthStoreContext.Provider value={value}>{children}</AuthStoreContext.Provider>;
}
