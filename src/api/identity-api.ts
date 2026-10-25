import type { IUserType } from '../types/app-types';

import { requestEnvelope } from './http';

/**
 * 角色，与后端 `security/Role` 一一对应。
 *
 * 后端以大写传输（GUEST/USER/ADMIN），前端统一小写处理，
 * 比较时用 `normalizeRole` 归一，避免大小写不一致导致误判。
 */
export type UserRoleType = 'guest' | 'user' | 'admin';

export interface IIdentityType {
  role: UserRoleType;
  authenticated: boolean;
  displayName: string;
  user: IUserType | null;
}

/** 归一大后端返回的角色值；未知值一律视为 guest（最小权限）。 */
export function normalizeRole(value: unknown): UserRoleType {
  if (typeof value !== 'string') {
    return 'guest';
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'admin' || normalized === 'user') {
    return normalized;
  }
  return 'guest';
}

/**
 * 查询当前身份。
 *
 * 这是「登录后按身份进入不同工作台」的唯一判据来源：
 * 前端不再分别猜测用户/管理员两套凭据的状态。
 *
 * 使用 `includeAuth: true`，让请求带上登录码头；
 * 管理员身份依赖同源 Cookie（`credentials: include`），二者都会发送。
 */
export async function fetchIdentity(): Promise<IIdentityType> {
  const data = await requestEnvelope<{
    role?: unknown;
    authenticated?: unknown;
    displayName?: unknown;
    user?: IUserType | null;
  }>('/api/v1/auth/me', { includeAuth: true });

  return {
    role: normalizeRole(data?.role),
    authenticated: data?.authenticated === true,
    displayName: typeof data?.displayName === 'string' ? data.displayName : '',
    user: data?.user ?? null,
  };
}

/** 该角色应进入的工作台首页。 */
export function workspacePathForRole(role: UserRoleType): string {
  if (role === 'admin') {
    return '/admin/dashboard';
  }
  if (role === 'user') {
    return '/user';
  }
  return '/login';
}
