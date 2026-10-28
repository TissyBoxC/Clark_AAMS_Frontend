/* 身份与账号相关的接口。管理员与普通用户共用 /user/login，响应里带 role。 */

import type { IIdentityType, IUserType, UserRoleType } from '../types';
import { requestEnvelope } from '../lib/http';

export function normalizeRole(value: unknown): UserRoleType {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw === 'admin') {
    return 'admin';
  }
  if (raw === 'user') {
    return 'user';
  }
  return 'guest';
}

export async function fetchIdentity(): Promise<IIdentityType> {
  const data = await requestEnvelope<{
    role?: unknown;
    authenticated?: unknown;
    displayName?: unknown;
    user?: IUserType | null;
  }>('/api/v1/auth/me');

  return {
    role: normalizeRole(data?.role),
    authenticated: data?.authenticated === true,
    displayName: typeof data?.displayName === 'string' ? data.displayName : '',
    user: data?.user ?? null,
  };
}

export interface ILoginPayloadType {
  username?: string;
  qqEmail?: string;
  password?: string;
  loginCode?: string;
}

export async function loginWithPassword(username: string, password: string): Promise<IUserType> {
  // 一个输入框同时接受邮箱和用户名：带 @ 的按邮箱提交，否则按用户名。
  const isEmail = username.includes('@');
  return requestEnvelope<IUserType>('/api/v1/user/login', {
    method: 'POST',
    body: isEmail ? { qqEmail: username.trim(), password } : { username: username.trim(), password },
  });
}

export async function loginWithCode(loginCode: string): Promise<IUserType> {
  return requestEnvelope<IUserType>('/api/v1/user/login', {
    method: 'POST',
    body: { loginCode: loginCode.trim() },
  });
}

export async function registerAccount(
  username: string,
  email: string,
  password: string,
): Promise<IUserType> {
  return requestEnvelope<IUserType>('/api/v1/user/register', {
    method: 'POST',
    body: { username: username.trim(), qqEmail: email.trim(), password },
  });
}

export async function logoutAccount(): Promise<void> {
  await requestEnvelope<{ authenticated: boolean }>('/api/v1/user/logout', {
    method: 'POST',
    body: {},
  });
}

export async function fetchProfile(): Promise<IUserType> {
  return requestEnvelope<IUserType>('/api/v1/user/me');
}

export async function rotateLoginCode(): Promise<IUserType> {
  return requestEnvelope<IUserType>('/api/v1/user/login-code/rotate', {
    method: 'POST',
    body: {},
  });
}

export async function sendEmailCode(email: string): Promise<IUserType> {
  return requestEnvelope<IUserType>('/api/v1/user/email/code', {
    method: 'POST',
    body: { qqEmail: email.trim() },
  });
}

export async function verifyEmailCode(code: string): Promise<IUserType> {
  return requestEnvelope<IUserType>('/api/v1/user/email/verify', {
    method: 'POST',
    body: { code: code.trim() },
  });
}

export function workspaceForRole(role: UserRoleType): string {
  return role === 'admin' ? '/admin' : '/user';
}
