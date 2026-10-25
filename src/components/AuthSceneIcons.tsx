import type { SVGProps } from 'react';

type IAuthIconPropsType = SVGProps<SVGSVGElement>;

export function ArrowLeftIcon(props: IAuthIconPropsType) {
  return (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' {...props}>
      <path d='M15 18 9 12l6-6' />
      <path d='M9 12h10' />
    </svg>
  );
}

export function ArrowRightIcon(props: IAuthIconPropsType) {
  return (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' {...props}>
      <path d='M9 6l6 6-6 6' />
      <path d='M5 12h10' />
    </svg>
  );
}

export function MailIcon(props: IAuthIconPropsType) {
  return (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' {...props}>
      <rect x='3.5' y='5.5' width='17' height='13' rx='2.5' />
      <path d='m5 7 7 5 7-5' />
    </svg>
  );
}

export function UserIcon(props: IAuthIconPropsType) {
  return (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' {...props}>
      <circle cx='12' cy='8' r='3.5' />
      <path d='M5 20a7 7 0 0 1 14 0' />
    </svg>
  );
}

export function LockIcon(props: IAuthIconPropsType) {
  return (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' {...props}>
      <rect x='5' y='11' width='14' height='9' rx='2.5' />
      <path d='M8 11V8.5a4 4 0 1 1 8 0V11' />
    </svg>
  );
}

export function CodeIcon(props: IAuthIconPropsType) {
  return (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' {...props}>
      <rect x='3.5' y='6' width='17' height='12' rx='2.5' />
      <path d='M8 10 6 12l2 2' />
      <path d='M16 10l2 2-2 2' />
      <path d='m13.5 9-3 6' />
    </svg>
  );
}

export function EyeIcon(props: IAuthIconPropsType) {
  return (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' {...props}>
      <path d='M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z' />
      <circle cx='12' cy='12' r='3' />
    </svg>
  );
}

export function EyeOffIcon(props: IAuthIconPropsType) {
  return (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' {...props}>
      <path d='M3 3l18 18' />
      <path d='M10.6 6C11 5.9 11.5 5.8 12 5.8c6 0 9.5 6.2 9.5 6.2a15.2 15.2 0 0 1-3.1 3.8' />
      <path d='M6.4 7.2A15.5 15.5 0 0 0 2.5 12s3.5 6.2 9.5 6.2c1 0 2-.2 2.8-.5' />
      <path d='M9.9 9.9a3 3 0 0 0 4.2 4.2' />
    </svg>
  );
}
