import { describe, expect, it } from 'vitest';
import { bearerToken } from '../src/lib/mobile-auth';
describe('native credential boundary', () => {
  it('allows absent credentials to use browser authentication', () => expect(bearerToken(null)).toBeNull());
  it('extracts explicit bearer credentials', () => expect(bearerToken('Bearer a.b-c_d')).toBe('a.b-c_d'));
  it.each(['', 'Basic abc', 'Bearer ', 'Bearer abc def', 'Bearer abc\n'])('rejects malformed credentials without cookie fallback: %j', value => {
    expect(() => bearerToken(value)).toThrow('Please sign in');
  });
});
