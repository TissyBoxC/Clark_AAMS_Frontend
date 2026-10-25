import type { IUserType } from '../types/app-types';
import { normalizeRole as normalizeRoleShared } from '../utils/role-routing';
import type { UserRoleType } from '../utils/role-routing';

import { requestEnvelope } from './http';

/**
 * 角色，与后端 `security/Role` 一一对应。
 *
 * 后端以大写传输（GUEST/USER/ADMIN），前端统一小写处理，
 * 比较时用 `normalizeRole` 归一，避免大小写不一致导致误判。
 *
 * 类型定义与工作台路由函数移至 `utils/role-routing`（纯函数、无 http 依赖），
 * 这里重新导出以保持既有引用不变。
 */
export type { UserRoleType } from '../utils/role-routing';
export { workspacePathForRole } from '../utils/role-routing';

export interface IIdentityType {
  role: UserRoleType;
  authenticated: boolean;
  displayName: string;
  user: IUserType | null;
}

/** 归一后端返回的角色值；未知值一律视为 guest（最小权限）。 */
export function normalizeRole(value: unknown): UserRoleType {
  return normalizeRoleShared(value);
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


