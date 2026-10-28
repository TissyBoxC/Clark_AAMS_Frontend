/* 确认框：说明后果，再让用户决定。 */

import { useEffect, useRef, type ReactNode } from 'react';

export interface IConfirmOptionsType {
  title: string;
  body: ReactNode;
  confirmText: string;
  cancelText?: string;
  tone?: 'danger' | 'normal';
}

export interface IConfirmStateType extends IConfirmOptionsType {
  resolve: (value: boolean) => void;
}

export function ConfirmDialog({
  state,
  onClose,
}: {
  state: IConfirmStateType | null;
  onClose: (value: boolean) => void;
}) {
  const ref = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (state) {
      ref.current?.focus();
    }
  }, [state]);

  useEffect(() => {
    if (!state) {
      return;
    }
    function onKey(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        onClose(false);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, state]);

  if (!state) {
    return null;
  }

  return (
    <div className="overlay" role="presentation" onClick={() => onClose(false)}>
      <div
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dialog__head">
          <h2 className="dialog__title" id="confirm-title">{state.title}</h2>
        </div>
        <div className="dialog__body">{state.body}</div>
        <div className="dialog__foot">
          <button className="btn btn--ghost" type="button" onClick={() => onClose(false)}>
            {state.cancelText ?? '取消'}
          </button>
          <button
            ref={ref}
            className={`btn ${state.tone === 'danger' ? 'btn--danger' : 'btn--primary'}`}
            type="button"
            onClick={() => onClose(true)}
          >
            {state.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
