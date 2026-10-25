import { createContext, useContext } from 'react';

import type { IAuthStoreValueType } from './auth-store';

export const AuthStoreContext = createContext<IAuthStoreValueType | null>(null);

export function useAuthStore(): IAuthStoreValueType {
  const context = useContext(AuthStoreContext);

  if (!context) {
    throw new Error('useAuthStore must be used within AuthProvider');
  }

  return context;
}
