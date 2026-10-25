/**
 * 统一错误码与错误分类（P2-3）。
 *
 * 后端 `ErrorCode` 的镜像。三端共享同一套数字，避免
 * 「后端返回 42901、前端只认 429」这类静默不一致。
 *
 * 数字分段约定：
 * - `0`        成功
 * - `40xxx`    客户端错误（参数、登录、权限、资源不存在、冲突）
 * - `429xx`    限流与配额
 * - `50xxx`    服务端错误
 */
export const ErrorCodes = {
  OK: 0,

  BAD_REQUEST: 40001,
  LOGIN_INVALID: 40101,
  FORBIDDEN: 40301,

  SCHOOL_NOT_FOUND: 40401,
  IMPORTER_NOT_FOUND: 40402,
  USER_NOT_FOUND: 40403,

  USER_EMAIL_CONFLICT: 40901,

  /** 当日配额用尽，需等到重置（明天）。**不可重试**。 */
  QUOTA_EXCEEDED: 42901,
  /** 短时限流，稍后可重试。 */
  RATE_LIMITED: 42902,

  ACADEMIC_REQUEST_FAILED: 50001,
  COURSE_PARSE_FAILED: 50002,
  INTERNAL_ERROR: 50003,
  AI_REQUEST_FAILED: 50004,
} as const;

export type ErrorCodeValue = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * 错误分类，决定 UI 该怎么反应。
 *
 * - `auth`     需要重新登录（跳登录页）
 * - `forbidden` 身份不够（提示无权限，不跳登录）
 * - `quota`    配额用尽（提示明天再试，不提供重试按钮）
 * - `rateLimit` 太频繁（提示稍后再试，可重试）
 * - `input`    用户输入有问题（就地提示）
 * - `server`   服务端故障（提示稍后重试）
 * - `unknown`  未识别的错误
 */
export type ErrorKind =
  | 'auth'
  | 'forbidden'
  | 'quota'
  | 'rateLimit'
  | 'input'
  | 'server'
  | 'unknown';

/**
 * 把错误码归入分类。
 *
 * 优先看业务码；未知业务码再退回 HTTP 状态码判断，
 * 这样后端新增错误码时前端不会立刻显示成「未知错误」。
 */
export function classifyError(code: number | null | undefined, status?: number): ErrorKind {
  if (code === ErrorCodes.QUOTA_EXCEEDED) {
    return 'quota';
  }
  if (code === ErrorCodes.RATE_LIMITED) {
    return 'rateLimit';
  }
  if (code === ErrorCodes.LOGIN_INVALID) {
    return 'auth';
  }
  if (code === ErrorCodes.FORBIDDEN) {
    return 'forbidden';
  }
  if (code === ErrorCodes.BAD_REQUEST
    || code === ErrorCodes.USER_EMAIL_CONFLICT
    || code === ErrorCodes.SCHOOL_NOT_FOUND
    || code === ErrorCodes.IMPORTER_NOT_FOUND
    || code === ErrorCodes.USER_NOT_FOUND) {
    return 'input';
  }
  if (typeof code === 'number' && code >= 50000) {
    return 'server';
  }

  if (status === 401) {
    return 'auth';
  }
  if (status === 403) {
    return 'forbidden';
  }
  if (status === 429) {
    return 'rateLimit';
  }
  if (typeof status === 'number' && status >= 500) {
    return 'server';
  }
  if (typeof status === 'number' && status >= 400) {
    return 'input';
  }
  return 'unknown';
}

/** 分类对应的默认提示文案（后端有 message 时优先用后端的）。 */
export function defaultMessageFor(kind: ErrorKind): string {
  switch (kind) {
    case 'auth':
      return '登录状态已过期，请重新登录。';
    case 'forbidden':
      return '当前账号没有执行该操作的权限。';
    case 'quota':
      return '今日额度已用完，请明天再试。';
    case 'rateLimit':
      return '操作过于频繁，请稍后再试。';
    case 'input':
      return '请求内容有误，请检查后重试。';
    case 'server':
      return '服务暂时不可用，请稍后重试。';
    default:
      return '操作失败，请稍后重试。';
  }
}

/** 该分类是否值得让用户原地重试（配额用尽重试也没用）。 */
export function isRetryable(kind: ErrorKind): boolean {
  return kind === 'rateLimit' || kind === 'server';
}
