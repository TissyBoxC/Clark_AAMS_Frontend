import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import type { IUserType } from '../types/app-types';

import { fetchCurrentUser } from '../api/user-api';
import { useAuthStore } from '../store/auth-context';
import { safeRedirect } from '../utils/navigation';

import { useRequiredUser } from './useRequiredUser';
import { useTransitionNavigate } from './useTransitionNavigate';

export interface IRequiredVerifiedUserResultType {
  user: IUserType;
  isReady: boolean;
}

export function useRequiredVerifiedUser(): IRequiredVerifiedUserResultType {
  const location = useLocation();
  const navigate = useTransitionNavigate();
  const { updateUser } = useAuthStore();
  const { user, isReady: isUserReady } = useRequiredUser();
  const locationKey = `${location.pathname}${location.search}${location.hash}`;
  const [verifiedLocationKey, setVerifiedLocationKey] = useState<string>('');

  useEffect(() => {
    if (!isUserReady) {
      return undefined;
    }

    let isMounted = true;
    const redirectTarget = safeRedirect(
      locationKey,
      '/user',
    );
    const verifyUrl = `/auth/verify?notice=email-required&redirect=${encodeURIComponent(redirectTarget)}`;

    async function verifyCurrentUser(): Promise<void> {
      try {
        const latestUser = await fetchCurrentUser();

        if (!isMounted) {
          return;
        }

        updateUser(latestUser);

        if (!latestUser.emailVerified) {
          navigate(verifyUrl, {
            replace: true,
            delay: 0,
          });
          return;
        }

        setVerifiedLocationKey(locationKey);
      } catch {
        if (!isMounted) {
          return;
        }

        if (!user.emailVerified) {
          navigate(verifyUrl, {
            replace: true,
            delay: 0,
          });
          return;
        }

        setVerifiedLocationKey(locationKey);
      }
    }

    void verifyCurrentUser();

    return () => {
      isMounted = false;
    };
  }, [isUserReady, locationKey, navigate, updateUser, user.emailVerified]);

  return {
    user,
    isReady: isUserReady && user.emailVerified && verifiedLocationKey === locationKey,
  };
}