/* 提示条的调用入口。Provider 单独一个文件，保证两边都只导出一种东西。 */

import { useContext } from 'react';

import { ToastContext } from './toast-context';
import type { IToastContextType } from './toast-context';

export function useToast(): IToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast 必须在 ToastProvider 内使用');
  }
  return context;
}
