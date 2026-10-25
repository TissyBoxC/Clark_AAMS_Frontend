/*
 * 优先使用异步剪贴板 API，无法使用时再回退到 DOM 复制方案，
 * 兼容不支持 navigator.clipboard 的浏览器或嵌入环境。
 */

function legacyCopyText(value: string): void {
  if (!document.body) {
    throw new Error('当前环境无法访问剪贴板。');
  }

  const activeElement = document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null;
  const selection = document.getSelection();
  const previousRange = selection && selection.rangeCount > 0
    ? selection.getRangeAt(0).cloneRange()
    : null;
  const input = document.createElement('textarea');

  input.value = value;
  input.setAttribute('readonly', '');
  input.style.position = 'fixed';
  input.style.left = '-9999px';
  document.body.appendChild(input);
  input.select();

  const isCopied = document.execCommand('copy');
  input.remove();

  if (selection) {
    selection.removeAllRanges();

    if (previousRange) {
      selection.addRange(previousRange);
    }
  }

  activeElement?.focus();

  if (!isCopied) {
    throw new Error('复制命令未执行成功。');
  }
}

export async function copyText(value: string): Promise<void> {
  const normalizedValue = String(value);

  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(normalizedValue);
    return;
  }

  legacyCopyText(normalizedValue);
}
