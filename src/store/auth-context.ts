/* 身份状态的容器。单独存放，Provider 与读取入口各自只导出一种东西。 */

import { createContext } from 'react';

import type { IUserType, UserRoleType } from '../types';

export interface IAuthContextType {
  user: IUserType | null;
  role: UserRoleType;
  displayName: string;
  isResolved: boolean;
  isVerified: boolean;
  refresh: () => Promise<void>;
  applyUser: (user: IUserType | null) => void;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<IAuthContextType | null>(null);
