const LOGIN_CODE_KEY = 'clarkAamsLoginCode';

export function getLoginCode(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  try {
    return window.localStorage.getItem(LOGIN_CODE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function setLoginCode(code: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    if (code) {
      window.localStorage.setItem(LOGIN_CODE_KEY, code);
    } else {
      window.localStorage.removeItem(LOGIN_CODE_KEY);
    }
  } catch {
    // 存储不可用时保持当前会话，只是换设备时需要重新登录。
  }
}

export function clearLoginCode(): void {
  setLoginCode('');
}

/** 复制文本：优先使用剪贴板能力，失败时退回手动选择。 */
export async function copyText(value: string): Promise<void> {
  if (!value) {
    throw new Error('empty');
  }

  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();

  const ok = document.execCommand('copy');
  document.body.removeChild(textarea);

  if (!ok) {
    throw new Error('copy-failed');
  }
}
