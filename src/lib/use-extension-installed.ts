/*
 * 判断「导入扩展装了没有」。
 *
 * 扩展会在珂拉页面上留一个隐藏标记元素（见扩展的 bridge.js），
 * 查得到就是装了。这是唯一能在网页侧判断扩展存在的方法——
 * 网页不能直接问浏览器"装了什么扩展"，那样会泄漏隐私。
 *
 * 扩展是异步注入的，所以头一帧查不到不代表没装；这里轮询一小会儿，
 * 超时才认定「没装」。超时给 1.2 秒：够扩展注入，又不至于让
 * 已经装好的人盯着"正在检查"发呆。
 */

import { useEffect, useState } from 'react';

const MARKER_TAG = 'clark-aams-extension';
const POLL_INTERVAL_MS = 120;
const POLL_TIMEOUT_MS = 1200;

export type ExtensionState = 'checking' | 'installed' | 'missing';

export function useExtensionInstalled(): ExtensionState {
  const [state, setState] = useState<ExtensionState>('checking');

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();

    function probe(): void {
      if (cancelled) {
        return;
      }
      if (document.querySelector(MARKER_TAG)) {
        setState('installed');
        return;
      }
      if (Date.now() - startedAt >= POLL_TIMEOUT_MS) {
        setState('missing');
        return;
      }
      window.setTimeout(probe, POLL_INTERVAL_MS);
    }

    probe();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
