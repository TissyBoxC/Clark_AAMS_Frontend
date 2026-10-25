/*
 * 角色与工作台的对应关系。
 *
 * 单独成文件的原因：这里全是纯函数、不依赖 http 客户端，
 * 因此可以直接用 node --test 跑，不需要浏览器环境或打包步骤。
 * （放在 identity-api.ts 里会因为其内部 import 而无法被 Node 直接加载。）
 */

/** 身份角色，与后端 `Role` 枚举的 wire 值一致。 */
export type UserRoleType = 'guest' | 'user' | 'admin';

/** 解析后端/存储传入的角色名，未知值返回 guest（失败即最小权限）。 */
export function normalizeRole(value: unknown): UserRoleType {
  if (typeof value !== 'string') {
    return 'guest';
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'admin' || normalized === 'user' || normalized === 'guest') {
    return normalized;
  }
  return 'guest';
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

/**
 * 登录成功后应当前往哪个页面（P1-1）。
 *
 * 账号表合并后，管理员与普通用户走同一条登录路径，所以不能再无条件
 * 跳 `/user`。登录响应里带了 `role`，可直接决定去向，
 * 不必多请求一次 `/auth/me`（那样中间会有一帧「已登录但不知去哪」）。
 *
 * @param role     登录响应里的角色；缺失/未知按普通用户处理
 * @param redirect 登录前想去的页面。仅普通用户采纳——管理员一律进后台，
 *                 否则会出现「管理员被 redirect 参数留在用户工作台」
 */
export function loginLandingPath(role: unknown, redirect: string): string {
  if (normalizeRole(role) === 'admin') {
    return '/admin/dashboard';
  }
  return redirect;
}
