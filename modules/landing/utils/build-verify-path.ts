export function buildVerifyPath(code: string): string | null {
  const trimmed = code.trim();
  return trimmed ? `/verificar/${encodeURIComponent(trimmed)}` : null;
}
