import { useState, type CSSProperties, type ReactNode } from 'react';

import { AUTH_BACKGROUND_IMAGES } from '../constants/auth-backgrounds';

import { ArrowLeftIcon } from './AuthSceneIcons';

interface IAuthSceneLayoutPropsType {
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
  localeLabel?: string;
  localeMeta?: string;
}

function AuthSceneLayout({
  children,
  backHref = '/',
  backLabel = '返回首页',
  localeLabel = '简体中文',
  localeMeta = '文A',
}: IAuthSceneLayoutPropsType) {
  const [backgroundIndex] = useState<number>(() => {
    if (AUTH_BACKGROUND_IMAGES.length === 0) {
      return 0;
    }

    return Math.floor(Math.random() * AUTH_BACKGROUND_IMAGES.length);
  });

  const activeBackground = AUTH_BACKGROUND_IMAGES[backgroundIndex] ?? '';
  const sceneStyle = activeBackground
    ? ({ ['--auth-scene-image' as string]: `url("${activeBackground}")` } as CSSProperties)
    : undefined;

  return (
    <main className='auth-scene' style={sceneStyle}>
      <div className='auth-scene__content'>
        <div className='auth-scene__utility'>
          <a className='auth-scene__back-link' href={backHref} aria-label={backLabel}>
            <ArrowLeftIcon />
            <span>{backLabel}</span>
          </a>
          <button className='auth-scene__locale' type='button' aria-label='界面语言'>
            <span>{localeLabel}</span>
            <strong>{localeMeta}</strong>
          </button>
        </div>

        {children}
      </div>
    </main>
  );
}

export default AuthSceneLayout;
