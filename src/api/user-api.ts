import type { IUserType } from '../types/app-types';

import { clearStoredLoginCode, getStoredLoginCode, setStoredLoginCode } from '../utils/auth-storage';

import { requestEnvelope } from './http';

export interface IEmailLoginPayloadType {
  qqEmail: string;
  password: string;
}

export interface ILoginCodePayloadType {
  loginCode: string;
}

export interface IRegisterPayloadType {
  username: string;
  qqEmail: string;
  password: string;
}

export function createGuestUser(): IUserType {
  return {
    id: 0,
    username: '',
    email: '',
    loginCode: '',
    emailBound: false,
    emailVerified: false,
    questionAnalysisCount: 0,
  };
}

export async function fetchCurrentUser(): Promise<IUserType> {
  return requestEnvelope<IUserType>('/api/v1/user/me');
}

export async function loginUser(
  payload: IEmailLoginPayloadType | ILoginCodePayloadType,
): Promise<IUserType> {
  const user = await requestEnvelope<IUserType>('/api/v1/user/login', {
    method: 'POST',
    body: payload,
  });

  setStoredLoginCode(user.loginCode);
  return user;
}

export async function registerUser(payload: IRegisterPayloadType): Promise<IUserType> {
  const user = await requestEnvelope<IUserType>('/api/v1/user/register', {
    method: 'POST',
    body: payload,
  });

  setStoredLoginCode(user.loginCode);
  return user;
}

export async function logoutUser(): Promise<void> {
  await requestEnvelope<Record<string, never>>('/api/v1/user/logout', {
    method: 'POST',
    body: {},
  });

  clearStoredLoginCode();
}

export async function sendEmailVerifyCode(qqEmail: string, loginCode = ''): Promise<IUserType> {
  const normalizedEmail = qqEmail.trim();

  return requestEnvelope<IUserType>('/api/v1/user/email/code', {
    method: 'POST',
    headers: loginCode
      ? {
        'X-Clark-Aams-Login-Code': loginCode,
      }
      : undefined,
    body: {
      qqEmail: normalizedEmail,
    },
  });
}

export async function verifyEmailCode(code: string): Promise<IUserType> {
  return requestEnvelope<IUserType>('/api/v1/user/email/verify', {
    method: 'POST',
    body: {
      code,
    },
  });
}

export async function restoreSessionWithLoginCode(): Promise<IUserType | null> {
  const loginCode = getStoredLoginCode();

  if (!loginCode) {
    return null;
  }

  try {
    const user = await requestEnvelope<IUserType>('/api/v1/user/login', {
      method: 'POST',
      body: {
        loginCode,
      },
    });

    setStoredLoginCode(user.loginCode);
    return user;
  } catch {
    clearStoredLoginCode();
    return null;
  }
}

export async function ensureUserSession(): Promise<IUserType> {
  try {
    const user = await fetchCurrentUser();

    if (user.id > 0) {
      setStoredLoginCode(user.loginCode);
      return user;
    }
  } catch {
    // Ignore and continue with loginCode recovery.
  }

  const restoredUser = await restoreSessionWithLoginCode();

  if (restoredUser && restoredUser.id > 0) {
    return restoredUser;
  }

  return createGuestUser();
}
