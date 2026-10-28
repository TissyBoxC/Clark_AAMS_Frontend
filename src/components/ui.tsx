/* 通用界面零件：页面标题、加载态、空状态、表单字段。 */

import { useEffect, type ReactNode } from 'react';

import { Icon } from './Icons';

/** 设置页面标题与描述。 */
export function PageMeta({ title, description }: { title: string; description?: string }) {
  useEffect(() => {
    document.title = title;
    if (description) {
      let tag = document.querySelector('meta[name="description"]');
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', 'description');
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', description);
    }
  }, [description, title]);

  return null;
}

export function Loading({ text = '正在读取内容…' }: { text?: string }) {
  return (
    <div className="loading-block" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}

export function FullPageLoading({ text }: { text?: string }) {
  return (
    <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
      <Loading text={text} />
    </div>
  );
}

/** 空状态：说明为什么空、下一步能做什么。 */
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <p className="empty__title">{title}</p>
      <div className="empty__body">{children}</div>
      {action ? <div className="row">{action}</div> : null}
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={htmlFor}>{label}</label>
      {children}
      {error ? (
        <span className="field__error" role="alert">
          <Icon name="alert" size={14} />
          {error}
        </span>
      ) : hint ? (
        <span className="field__hint">{hint}</span>
      ) : null}
    </div>
  );
}
