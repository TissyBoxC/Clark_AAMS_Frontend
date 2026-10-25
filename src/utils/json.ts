export function formatJson(value: unknown): string {
  try {
    return JSON.stringify(typeof value === 'string' ? JSON.parse(value) : value, null, 2);
  } catch {
    return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  }
}
