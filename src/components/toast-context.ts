/* 提示条的状态容器。单独存放，组件文件与调用入口各自只导出一种东西。 */

import { createContext } from 'react';

export type ToastTone = 'success' | 'error' | 'info';

export interface IToastContextType {
  notify: (text: string, tone?: ToastTone) => void;
}

export const ToastContext = createContext<IToastContextType | null>(null);
