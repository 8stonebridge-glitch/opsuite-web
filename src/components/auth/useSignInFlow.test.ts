import { describe, expect, it } from 'vitest';
import { POST_SIGN_IN_URL, resolvePostSignInUrl } from './useSignInFlow';

describe('resolvePostSignInUrl', () => {
  it('falls back to the role-aware root redirect when no returnTo exists', () => {
    expect(resolvePostSignInUrl('')).toBe(POST_SIGN_IN_URL);
    expect(POST_SIGN_IN_URL).toBe('/');
  });

  it('keeps a safe relative returnTo path', () => {
    expect(resolvePostSignInUrl('?returnTo=%2Femployee%2Fmy-day')).toBe('/employee/my-day');
  });

  it('rejects external redirect targets', () => {
    expect(resolvePostSignInUrl('?returnTo=https%3A%2F%2Fevil.example')).toBe(POST_SIGN_IN_URL);
    expect(resolvePostSignInUrl('?returnTo=%2F%2Fevil.example')).toBe(POST_SIGN_IN_URL);
  });
});
