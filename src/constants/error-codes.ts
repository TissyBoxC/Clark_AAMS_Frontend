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

/**
 * 分类对应的提示文案。
 *
 * 每条都回答两件事：发生了什么、用户接下来能做什么。
 * 不写「请求内容有误」「操作失败」这类只描述状态、不指出方向的话。
 */
export function defaultMessageFor(kind: ErrorKind): string {
  switch (kind) {
    case 'auth':
      return '登录已过期，请重新登录后再试。';
    case 'forbidden':
      return '这个账号没有这项权限，请换用管理员账号，或联系管理员开通。';
    case 'quota':
      return '今天的次数已用完，明天会恢复。';
    case 'rateLimit':
      return '操作有点快，等一分钟再试。';
    case 'input':
      return '填写的内容还需要调整，请按提示修改后重试。';
    case 'server':
      return '服务暂时没有响应，请稍后再试一次。';
    default:
      return '这次没有成功，请稍后再试一次。';
  }
}

/**
 * 面向用户的错误文案。
 *
 * 为什么不能直接用后端的 message：那边给的是给开发者看的
 * （「currentVersion 和 currentBuild 至少传一个」「NoResourceFound」
 * 这类），直接摆到界面上等于让用户读源码。
 *
 * 这里的做法是——只有 `input` 类错误才采用后端文案，因为这一类
 * 后端确实知道是哪个字段填错了，说得比前端准；其余一律用我们
 * 自己写好的分类文案，绝不把内部信息漏出去。
 */
export function userMessageFor(error: unknown): string {
  const shaped = asHttpErrorLike(error);
  if (shaped && shaped.kind) {
    const fromServer = shaped.payloadMessage.trim();
    if (shaped.kind === 'input' && fromServer && looksLikeUserFacing(fromServer)) {
      return fromServer;
    }
    return defaultMessageFor(shaped.kind);
  }
  return defaultMessageFor('unknown');
}

/**
 * 只依赖 kind 与 payloadMessage 的最小形状，避免这里反向依赖 HttpError。
 *
 * 用结构判断而不是 `instanceof`：接口在运行时不存在，
 * `error instanceof 接口名` 会直接抛 TypeError。
 */
interface HttpErrorLike {
  kind?: ErrorKind;
  payloadMessage: string;
}

function asHttpErrorLike(value: unknown): HttpErrorLike | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const candidate = value as Partial<HttpErrorLike>;
  if (typeof candidate.payloadMessage !== 'string') {
    return null;
  }
  return { kind: candidate.kind, payloadMessage: candidate.payloadMessage };
}

/**
 * 后端文案是否像写给人看的。
 *
 * 拦的是这几种：夹带路径、夹带状态码、结构化残留（花括号）、
 * 异常类名。宁可退回通用文案，也不把疑似内部信息放出去。
 */
function looksLikeUserFacing(text: string): boolean {
  if (text.length > 80) {
    return false;
  }
  const suspicious = [
    /\/[\w-]+\//,
    /\b[45]\d{2}\b/,
    /undefined|null|NaN/,
    /[{}]/,
    /\b[A-Za-z]+\.[A-Za-z]+\b/,
    /Exception|Error\b/,
  ];
  return !suspicious.some((re) => re.test(text));
}

/** 该分类是否值得让用户原地重试（配额用尽重试也没用）。 */
export function isRetryable(kind: ErrorKind): boolean {
  return kind === 'rateLimit' || kind === 'server';
}
