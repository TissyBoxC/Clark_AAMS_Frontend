/*
 * 全站提示条。
 *
 * Provider 与 hook 分开放在两个文件里，是因为同一文件同时导出组件与函数
 * 会让开发时的热更新失效（eslint 的 only-export-components 规则）。
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { Icon } from './Icons';
import { ToastContext } from './toast-context';
import type { ToastTone } from './toast-context';

interface IToast {
  id: number;
  text: string;
  tone: ToastTone;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<IToast[]>([]);
  const timers = useRef<number[]>([]);

  const notify = useCallback((text: string, tone: ToastTone = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, text, tone }]);
    const timer = window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 4200);
    timers.current.push(timer);
  }, []);

  useEffect(() => () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.tone}`}>
            <Icon name={toast.tone === 'success' ? 'check' : toast.tone === 'error' ? 'alert' : 'info'} size={18} />
            <span>{toast.text}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
