// Invalid explicit credentials must never fall back to a browser cookie.
export function bearerToken(value: string | null): string | null {
  if (value === null) return null;
  const match = /^Bearer ([A-Za-z0-9._~-]+)$/i.exec(value);
  if (!match) throw new Error('Please sign in');
  return match[1];
}
