/*
 * 运行时 API 共用的最小 fetch 封装。
 * 统一处理认证头、后端信封解析以及页面可复用的错误对象。
 */

import type { IApiEnvelopeType } from '../types/app-types';

import type { ErrorKind } from '../constants/error-codes';

import { classifyError, isRetryable } from '../constants/error-codes';
import { getStoredLoginCode } from '../utils/auth-storage';

const CONFIGURED_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').trim();

export const API_BASE_URL = CONFIGURED_API_BASE_URL;

export interface IRequestOptionsType extends Omit<RequestInit, 'body'> {
  body?: BodyInit | FormData | object | null;
  includeAuth?: boolean;
}

export class HttpError extends Error {
  readonly status: number;
  readonly payload: unknown;
  readonly code?: number;
  /**
   * 后端信封里的原始 message。
   *
   * 保留它是为了排查问题时能拿到原始信息，**不等于可以直接显示**：
   * 界面上一律走 `userMessageFor(error)` 取文案。
   */
  readonly payloadMessage: string;

  constructor(message: string, status: number, payload: unknown = null) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.payload = payload;

    if (isApiEnvelope(payload)) {
      this.code = payload.code;
      this.payloadMessage =
        typeof payload.message === 'string' ? payload.message : '';
    } else {
      this.payloadMessage = '';
    }
  }

  /**
   * 错误分类（P2-3）。
   *
   * 页面据此决定「跳登录 / 提示无权限 / 提示明天再试 / 允许重试」，
   * 不必各自去拼 `status === 429` 这类判断。
   */
  get kind(): ErrorKind {
    return classifyError(this.code, this.status);
  }

  /** 该错误是否值得让用户原地重试（配额用尽重试无意义）。 */
  get retryable(): boolean {
    return isRetryable(this.kind);
  }
}

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

export function buildApiUrl(url: string): string {
  const baseUrl = getApiBaseUrl().replace(/\/$/, '');

  if (/^https?:\/\//i.test(url)) {
    const parsedUrl = new URL(url);

    if (!baseUrl) {
      return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
    }

    return `${baseUrl}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
  }

  const normalizedUrl = url.startsWith('/') ? url : `/${url}`;

  return baseUrl ? `${baseUrl}${normalizedUrl}` : normalizedUrl;
}

export function buildAbsoluteApiUrl(url: string): string {
  const resolvedUrl = buildApiUrl(url);

  if (/^https?:\/\//i.test(resolvedUrl) || typeof window === 'undefined') {
    return resolvedUrl;
  }

  return new URL(resolvedUrl, window.location.origin).toString();
}

function isApiEnvelope(value: unknown): value is IApiEnvelopeType<unknown> {
  return Boolean(
    value
      && typeof value === 'object'
      && 'code' in value
      && typeof (value as { code?: unknown }).code === 'number'
      && 'message' in value,
  );
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (isApiEnvelope(payload) && typeof payload.message === 'string' && payload.message) {
    return payload.message;
  }

  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as { message?: unknown }).message;

    if (typeof message === 'string' && message) {
      return message;
    }
  }

  return fallback;
}

function buildHeaders(
  headers: HeadersInit | undefined,
  includeAuth: boolean,
  body: IRequestOptionsType['body'],
): Headers {
  const finalHeaders = new Headers(headers ?? {});

  if (includeAuth) {
    const loginCode = getStoredLoginCode();

    if (loginCode && !finalHeaders.has('X-Clark-Aams-Login-Code')) {
      finalHeaders.set('X-Clark-Aams-Login-Code', loginCode);
    }
  }

  if (body && !(body instanceof FormData) && typeof body !== 'string' && !finalHeaders.has('Content-Type')) {
    finalHeaders.set('Content-Type', 'application/json');
  }

  return finalHeaders;
}

function buildBody(body: IRequestOptionsType['body']): BodyInit | null | undefined {
  if (!body) {
    return body;
  }

  if (body instanceof FormData || typeof body === 'string') {
    return body;
  }

  return JSON.stringify(body);
}

async function parseResponsePayload<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text) {
    return null as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HttpError(text, response.status, text);
  }
}

async function performRequest<T>(
  url: string,
  options: IRequestOptionsType,
): Promise<{ response: Response; payload: T }> {
  const { includeAuth = true, headers, body, ...restOptions } = options;
  const response = await fetch(buildApiUrl(url), {
    credentials: 'include',
    cache: 'no-store',
    ...restOptions,
    headers: buildHeaders(headers, includeAuth, body),
    body: buildBody(body),
  });
  const payload = await parseResponsePayload<T>(response);

  return { response, payload };
}

export async function requestEnvelope<T>(
  url: string,
  options: IRequestOptionsType = {},
): Promise<T> {
  const { response, payload } = await performRequest<IApiEnvelopeType<T>>(url, options);

  if (!response.ok || !isApiEnvelope(payload) || payload.code !== 0) {
    throw new HttpError(getErrorMessage(payload, `HTTP ${response.status}`), response.status, payload);
  }

  return payload.data;
}

export async function requestText(
  url: string,
  options: IRequestOptionsType = {},
): Promise<string> {
  const { includeAuth = true, headers, body, ...restOptions } = options;

  const response = await fetch(buildApiUrl(url), {
    credentials: 'include',
    cache: 'no-store',
    ...restOptions,
    headers: buildHeaders(headers, includeAuth, body),
    body: buildBody(body),
  });

  const text = await response.text();

  if (!response.ok) {
    throw new HttpError(text || `HTTP ${response.status}`, response.status, text);
  }

  return text;
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof HttpError && (error.status === 401 || error.status === 403 || error.code === 40101);
}
