/* 图标：只在帮助识别时使用，统一 1.6px 描边、24 网格。 */

export type IconName =
  | 'home'
  | 'calendar'
  | 'import'
  | 'image'
  | 'ticket'
  | 'sparkle'
  | 'settings'
  | 'logout'
  | 'arrow-right'
  | 'arrow-left'
  | 'plus'
  | 'close'
  | 'check'
  | 'alert'
  | 'copy'
  | 'trash'
  | 'edit'
  | 'chevron-down'
  | 'mail'
  | 'server'
  | 'tag'
  | 'chart'
  | 'shield'
  | 'globe'
  | 'menu'
  | 'clock'
  | 'download'
  | 'info'
  | 'search'
  | 'user';

const PATHS: Record<IconName, string> = {
  home: 'M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z',
  calendar: 'M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm3-2v4m8-4v4M4 11h16',
  import: 'M12 4v10m0 0 3.5-3.5M12 14l-3.5-3.5M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2',
  image: 'M4 6h16v12H4zM4 15l4-4 4 4 3-3 5 5',
  ticket: 'M4 9a2 2 0 0 0 0 6v3h16v-3a2 2 0 0 1 0-6V6H4zm5 0v6m6-6v6',
  sparkle: 'M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6zM18 16l.8 2.2L21 19l-2.2.8L18 22l-.8-2.2L15 19l2.2-.8z',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14.6 3h-4l-.4 2.4a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2l.4 2.4h4l.4-2.4a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z',
  logout: 'M9 5H5v14h4m4-3 4-4-4-4m4 4H9',
  'arrow-right': 'M5 12h13m0 0-5-5m5 5-5 5',
  'arrow-left': 'M19 12H6m0 0 5-5m-5 5 5 5',
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6 6 18',
  check: 'M5 12.5 10 17l9-10',
  alert: 'M12 4l9 16H3zM12 10v4m0 3v.5',
  copy: 'M9 9h9v11H9zM6 15H4V4h11v2',
  trash: 'M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13',
  edit: 'M4 20h4L20 8l-4-4L4 16zm10-12 4 4',
  'chevron-down': 'M6 9l6 6 6-6',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  server: 'M4 5h16v6H4zM4 13h16v6H4zM8 8h.01M8 16h.01',
  tag: 'M4 4h8l8 8-8 8-8-8zM8.5 8.5h.01',
  chart: 'M4 20V9m5 11V5m5 15v-7m5 7V8',
  shield: 'M12 3l8 3v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6z',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3c2.5 2.4 3.8 5.4 3.8 9S14.5 18.6 12 21c-2.5-2.4-3.8-5.4-3.8-9S9.5 5.4 12 3Z',
  menu: 'M4 7h16M4 12h16M4 17h16',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v5l3.5 2',
  download: 'M12 4v10m0 0 3.5-3.5M12 14l-3.5-3.5M4 18h16',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-9v5m0-8v.5',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5 -2 4 4',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 8c0-3.3 3.6-6 8-6s8 2.7 8 6',
};

export interface IIconType {
  name: IconName;
  className?: string;
  size?: number;
}

export function Icon({ name, className, size = 20 }: IIconType) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
