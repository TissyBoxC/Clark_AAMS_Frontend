import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import type { ITransitionNavigateOptionsType } from '../utils/navigation';

import { navigateWithTransition } from '../utils/navigation';

export function useTransitionNavigate(): (
  url: string,
  options?: ITransitionNavigateOptionsType,
) => void {
  const navigate = useNavigate();

  return useCallback(
    (url: string, options?: ITransitionNavigateOptionsType) => {
      navigateWithTransition(url, navigate, options);
    },
    [navigate],
  );
}
