export function qqAvatarUrl(email: string | null | undefined): string {
  const match = String(email ?? '').trim().match(/^([1-9]\d{4,11})@qq\.com$/i);

  if (!match) {
    return '/site/logo.png';
  }

  return `https://q1.qlogo.cn/g?b=qq&nk=${encodeURIComponent(match[1])}&s=100`;
}
