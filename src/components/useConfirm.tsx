/* 确认框的调用入口。与弹窗组件分开存放，保证组件文件只导出组件。 */

import { useCallback, useState } from 'react';

import { ConfirmDialog } from './Confirm';
import type { IConfirmOptionsType, IConfirmStateType } from './Confirm';

/** `const { confirm, confirmElement } = useConfirm()`，页面里渲染 `confirmElement`。 */
export function useConfirm() {
  const [state, setState] = useState<IConfirmStateType | null>(null);

  const confirm = useCallback((options: IConfirmOptionsType) => new Promise<boolean>((resolve) => {
    setState({ ...options, resolve });
  }), []);

  const close = useCallback((value: boolean) => {
    setState((current) => {
      current?.resolve(value);
      return null;
    });
  }, []);

  const element = <ConfirmDialog state={state} onClose={close} />;

  return { confirm, confirmElement: element };
}
