/*
 * 面向用户的话术。
 *
 * 界面上出现的每一句失败提示都从这里取：
 * 说清发生了什么、下一步能做什么，不复述服务端的原始信息。
 */

import { ApiError } from './http';

const FALLBACK = '这次没有成功，请稍后再试一次。';

export function userMessageFor(error: unknown): string {
  if (!(error instanceof ApiError)) {
    if (error instanceof Error && error.message === 'not-allowed') {
      return '这个操作现在不能进行。';
    }
    return FALLBACK;
  }

  switch (error.kind) {
    case 'offline':
      return '暂时连不上服务，请过一会儿再试。';
    case 'auth':
      return '登录状态已失效，请重新登录。';
    case 'forbidden':
      return '当前账号没有这项权限，如有需要请联系管理员。';
    case 'quota':
      return '今天的次数已经用完，明天会自动恢复。';
    case 'rate-limit':
      return '操作得有点快，稍等一会儿再试。';
    case 'server':
      return '服务这边出了点状况，请稍后再试。';
    default:
      return error.message || FALLBACK;
  }
}

/** 是否需要引导用户重新登录。 */
export function needsLogin(error: unknown): boolean {
  return error instanceof ApiError && error.kind === 'auth';
}

export function isEmptyCourseName(name: string): boolean {
  return name.trim().length === 0;
}
