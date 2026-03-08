export function isNonEmpty(value: string | null | undefined): value is string {
  return Boolean(value && value.trim().length > 0);
}

export function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
