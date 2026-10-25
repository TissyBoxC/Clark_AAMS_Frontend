/*
 * 浏览器环境下的登录码持久化工具。
 * 所有存储访问都收口到这里，避免隐私模式或受限环境直接抛错。
 */

import { LOGIN_CODE_KEY } from '../constants/site-config';

function withStorage<T>(operation: (storage: Storage) => T, fallback: T): T {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    return operation(window.localStorage);
  } catch {
    return fallback;
  }
}

export function getStoredLoginCode(): string {
  return withStorage((storage) => storage.getItem(LOGIN_CODE_KEY)?.trim() ?? '', '');
}

export function setStoredLoginCode(loginCode: string): void {
  const normalizedLoginCode = loginCode.trim();

  if (!normalizedLoginCode) {
    return;
  }

  withStorage((storage) => {
    storage.setItem(LOGIN_CODE_KEY, normalizedLoginCode);
  }, undefined);
}

export function clearStoredLoginCode(): void {
  withStorage((storage) => {
    storage.removeItem(LOGIN_CODE_KEY);
  }, undefined);
}

export function captureLoginCodeFromUrl(): void {
  const params = new URLSearchParams(window.location.search);
  const loginCode = params.get('loginCode');

  if (!loginCode) {
    return;
  }

  setStoredLoginCode(loginCode);
  params.delete('loginCode');

  const cleanSearch = params.toString();
  const cleanUrl = `${window.location.pathname}${cleanSearch ? `?${cleanSearch}` : ''}${window.location.hash}`;
  window.history.replaceState(null, '', cleanUrl);
}
