/*
 * SPA 页面转场与安全跳转的公共工具。
 * 认证页和后台页都通过这里复用同一套重定向校验规则。
 */

import type { NavigateFunction } from 'react-router-dom';

import { PAGE_TRANSITION_KEY } from '../constants/site-config';

export interface ITransitionNavigateOptionsType {
  replace?: boolean;
  delay?: number;
}

function prefersReducedMotion(): boolean {
  return Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

export function safeRedirect(
  value: string | null | undefined,
  fallback = '/user',
): string {
  const normalizedValue = String(value ?? '').trim();

  if (
    !normalizedValue
    || !normalizedValue.startsWith('/')
    || normalizedValue.startsWith('//')
    || /[\r\n]/.test(normalizedValue)
  ) {
    return fallback;
  }

  return normalizedValue;
}

export function markPageEntering(): void {
  const body = document.body;

  if (!body) {
    return;
  }

  body.classList.add('page-motion-ready');

  if (prefersReducedMotion()) {
    sessionStorage.removeItem(PAGE_TRANSITION_KEY);
    body.classList.remove('page-entering', 'page-leaving');
    return;
  }

  if (sessionStorage.getItem(PAGE_TRANSITION_KEY) !== '1') {
    body.classList.remove('page-leaving');
    return;
  }

  sessionStorage.removeItem(PAGE_TRANSITION_KEY);
  body.classList.remove('page-leaving');
  body.classList.add('page-entering');

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      body.classList.remove('page-entering');
    });
  });
}

export function startPageLeave(callback: () => void, delay = 190): void {
  const body = document.body;

  if (!body || prefersReducedMotion()) {
    callback();
    return;
  }

  sessionStorage.setItem(PAGE_TRANSITION_KEY, '1');
  body.classList.add('page-motion-ready', 'page-leaving');

  window.setTimeout(() => {
    callback();
  }, delay);
}

export function navigateWithTransition(
  url: string,
  navigate: NavigateFunction,
  options: ITransitionNavigateOptionsType = {},
): void {
  const { replace = false, delay = 190 } = options;

  if (!url) {
    return;
  }

  startPageLeave(() => {
    navigate(url, { replace });
  }, delay);
}
