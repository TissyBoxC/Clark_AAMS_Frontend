/*
 * 与服务端通信的最小封装。
 *
 * 只做三件事：带上登录凭据、解析统一信封、把失败变成可分类的错误。
 * 界面永远不直接显示原始错误，一律走 `userMessageFor()`。
 */

import type { IApiEnvelopeType } from '../types';
import { getLoginCode, clearLoginCode } from './storage';

const CONFIGURED_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').trim();

export type ErrorKind =
  | 'auth'
  /** 账号或密码不正确：用户要改输入，不是要重新登录。 */
  | 'credentials'
  | 'forbidden'
  | 'quota'
  | 'rate-limit'
  | 'input'
  | 'server'
  | 'offline'
  | 'unknown';

export class ApiError extends Error {
  readonly status: number;
  readonly code: number;
  readonly kind: ErrorKind;
  readonly retryable: boolean;

  constructor(message: string, status: number, code: number, kind: ErrorKind) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.kind = kind;
    this.retryable = kind === 'rate-limit' || kind === 'server';
  }
}

export interface IRequestOptionsType extends Omit<RequestInit, 'body'> {
  body?: BodyInit | FormData | object | null;
  withAuth?: boolean;
}

export function apiUrl(path: string): string {
  const base = CONFIGURED_BASE.replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${normalized}` : normalized;
}

export function absoluteApiUrl(path: string): string {
  const resolved = apiUrl(path);
  if (/^https?:\/\//i.test(resolved) || typeof window === 'undefined') {
    return resolved;
  }
  return new URL(resolved, window.location.origin).toString();
}

function isEnvelope(value: unknown): value is IApiEnvelopeType<unknown> {
  return Boolean(
    value
    && typeof value === 'object'
    && 'code' in value
    && typeof (value as { code?: unknown }).code === 'number',
  );
}

function classify(status: number, code: number): ErrorKind {
  // 账号或密码不对，和「会话过期」是两回事：
  // 前者用户正在登录页上、要改的是输入；后者用户已经登录过、要重新登录。
  // 两者都是 401，但告诉用户的话完全不同——混在一起就会出现
  // 「刚在登录页输错账号，却被告知登录状态已失效」这种莫名其妙的提示。
  if (code === 40103) {
    return 'credentials';
  }
  if (code === 40101 || code === 40102 || status === 401) {
    return 'auth';
  }
  if (code === 40301 || status === 403) {
    return 'forbidden';
  }
  if (code === 42901) {
    return 'quota';
  }
  if (code === 42902 || status === 429) {
    return 'rate-limit';
  }
  if (status >= 500) {
    return 'server';
  }
  return 'input';
}

function buildHeaders(headers: HeadersInit | undefined, withAuth: boolean, body: IRequestOptionsType['body']): Headers {
  const next = new Headers(headers ?? {});

  if (withAuth) {
    const loginCode = getLoginCode();
    if (loginCode && !next.has('X-Clark-Aams-Login-Code')) {
      next.set('X-Clark-Aams-Login-Code', loginCode);
    }
  }

  const isForm = body instanceof FormData;
  if (body && !isForm && typeof body !== 'string' && !next.has('Content-Type')) {
    next.set('Content-Type', 'application/json');
  }

  return next;
}

function buildBody(body: IRequestOptionsType['body']): BodyInit | null | undefined {
  if (!body) {
    return undefined;
  }
  if (body instanceof FormData || typeof body === 'string') {
    return body;
  }
  return JSON.stringify(body);
}

export async function requestEnvelope<T>(path: string, options: IRequestOptionsType = {}): Promise<T> {
  const { withAuth = true, headers, body, ...rest } = options;

  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      credentials: 'include',
      cache: 'no-store',
      ...rest,
      headers: buildHeaders(headers, withAuth, body),
      body: buildBody(body),
    });
  } catch {
    throw new ApiError('连不上服务', 0, 0, 'offline');
  }

  const text = await response.text();
  let payload: unknown;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new ApiError('服务返回了无法识别的内容', response.status, 0, 'server');
    }
  }

  if (isEnvelope(payload)) {
    if (response.ok && payload.code === 0) {
      return payload.data as T;
    }

    const kind = classify(response.status, payload.code);
    if (kind === 'auth') {
      clearLoginCode();
    }

    throw new ApiError(
      typeof payload.message === 'string' ? payload.message : '这次操作没有成功',
      response.status,
      payload.code,
      kind,
    );
  }

  if (!response.ok) {
    throw new ApiError('这次操作没有成功', response.status, 0, classify(response.status, 0));
  }

  return payload as T;
}

/** 上传需要真实进度，因此单独用 XHR。 */
export function uploadWithProgress<T>(
  path: string,
  files: File[],
  fieldName: string,
  onProgress: (value: number) => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const formData = new FormData();
    files.forEach((file) => formData.append(fieldName, file));

    const xhr = new XMLHttpRequest();
    xhr.open('POST', apiUrl(path));
    xhr.withCredentials = true;
    xhr.timeout = 180000;

    const loginCode = getLoginCode();
    if (loginCode) {
      xhr.setRequestHeader('X-Clark-Aams-Login-Code', loginCode);
    }

    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable) {
        return;
      }
      // 上传只占前半程，后半程留给服务端处理。
      onProgress(Math.max(8, Math.round((event.loaded / event.total) * 46)));
    });

    xhr.addEventListener('load', () => {
      let payload: unknown;
      try {
        payload = JSON.parse(xhr.responseText || 'null');
      } catch {
        reject(new ApiError('服务返回了无法识别的内容', xhr.status, 0, 'server'));
        return;
      }

      if (xhr.status >= 200 && xhr.status < 300 && isEnvelope(payload) && payload.code === 0) {
        onProgress(92);
        resolve(payload.data as T);
        return;
      }

      const code = isEnvelope(payload) ? payload.code : 0;
      const message = isEnvelope(payload) && typeof payload.message === 'string'
        ? payload.message
        : '这次操作没有成功';
      reject(new ApiError(message, xhr.status, code, classify(xhr.status, code)));
    });

    xhr.addEventListener('error', () => reject(new ApiError('连不上服务', 0, 0, 'offline')));
    xhr.addEventListener('timeout', () => reject(new ApiError('处理时间比预期长', 0, 0, 'server')));
    xhr.send(formData);
  });
}
