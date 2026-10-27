import { useCallback, useEffect, useState } from 'react';

type ThemeChoice = 'light' | 'dark';

const STORAGE_KEY = 'clark-aams-theme';

/**
 * 读取用户的主题选择。
 *
 * 没选过时跟随系统偏好；系统偏好也拿不到就按浅色（品牌主色是粉白）。
 */
function readInitialTheme(): ThemeChoice {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') {
    return saved;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/**
 * 明暗主题切换悬浮按钮。
 *
 * 之前主题只跟随系统 `prefers-color-scheme`，用户在深色系统里无法切回
 * 浅色——而浅色才是这个产品的品牌形象。这里给一个明确的出口。
 *
 * 选择写进 localStorage，刷新和换页面都保留。
 */
function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeChoice>(readInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  const isDark = theme === 'dark';

  return (
    <button
      type='button'
      className='theme-toggle'
      onClick={toggle}
      aria-label={isDark ? '切换到浅色主题' : '切换到深色主题'}
      title={isDark ? '切换到浅色主题' : '切换到深色主题'}
    >
      {isDark ? (
        /* 太阳：点了就变亮 */
        <svg viewBox='0 0 24 24' aria-hidden='true'>
          <circle cx='12' cy='12' r='4.2' />
          <path d='M12 2.6v2.4M12 19v2.4M2.6 12H5M19 12h2.4M5.4 5.4l1.7 1.7M16.9 16.9l1.7 1.7M18.6 5.4l-1.7 1.7M7.1 16.9l-1.7 1.7' />
        </svg>
      ) : (
        /* 月亮：点了就变暗 */
        <svg viewBox='0 0 24 24' aria-hidden='true'>
          <path d='M20.5 14.6A8.6 8.6 0 1 1 9.4 3.5a7 7 0 0 0 11.1 11.1Z' />
        </svg>
      )}
    </button>
  );
}

export default ThemeToggle;
