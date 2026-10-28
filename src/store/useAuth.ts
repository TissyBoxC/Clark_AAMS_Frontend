/* 身份状态的读取入口。Provider 与 hook 分开，保证组件文件只导出组件。 */

import { useContext } from 'react';

import { AuthContext } from './auth-context';
import type { IAuthContextType } from './auth-context';

export function useAuth(): IAuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth 必须在 AuthProvider 内使用');
  }
  return context;
}
