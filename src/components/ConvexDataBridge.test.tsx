import { describe, expect, it, vi } from 'vitest';
import { buildBridgeUserSyncAction, syncViewerUser } from './ConvexDataBridge';

describe('syncViewerUser', () => {
  it('uses the direct sync mutation when the viewer JWT already includes email', async () => {
    const syncFromAuth = vi.fn(() => Promise.resolve(null));
    const syncFromAuthAction = vi.fn(() => Promise.resolve(null));

    const result = await syncViewerUser(
      {
        identity: {
          subject: 'user_1',
          issuer: 'https://clerk.opsuite.org',
          email: 'suni93@hotmail.co.uk',
          name: 'Sunday Agwaze',
        },
      },
      syncFromAuth,
      syncFromAuthAction,
    );

    expect(result).toBe('mutation');
    expect(syncFromAuth).toHaveBeenCalledTimes(1);
    expect(syncFromAuthAction).not.toHaveBeenCalled();
  });

  it('uses the Clerk-backed action directly when the viewer JWT does not include email', async () => {
    const syncFromAuth = vi.fn(() => Promise.resolve(null));
    const syncFromAuthAction = vi.fn(() => Promise.resolve(null));

    const result = await syncViewerUser(
      {
        identity: {
          subject: 'user_1',
          issuer: 'https://clerk.opsuite.org',
          email: null,
          name: 'Sunday Agwaze',
        },
      },
      syncFromAuth,
      syncFromAuthAction,
    );

    expect(result).toBe('action');
    expect(syncFromAuth).not.toHaveBeenCalled();
    expect(syncFromAuthAction).toHaveBeenCalledTimes(1);
  });

  it('falls back to the Clerk-backed action if direct sync fails unexpectedly', async () => {
    const syncFromAuth = vi.fn(() => Promise.reject(new Error('sync failed')));
    const syncFromAuthAction = vi.fn(() => Promise.resolve(null));

    const result = await syncViewerUser(
      {
        identity: {
          subject: 'user_1',
          issuer: 'https://clerk.opsuite.org',
          email: 'suni93@hotmail.co.uk',
          name: 'Sunday Agwaze',
        },
      },
      syncFromAuth,
      syncFromAuthAction,
    );

    expect(result).toBe('action-fallback');
    expect(syncFromAuth).toHaveBeenCalledTimes(1);
    expect(syncFromAuthAction).toHaveBeenCalledTimes(1);
  });
});

describe('buildBridgeUserSyncAction', () => {
  it('uses the Clerk session role when one is resolved', () => {
    expect(buildBridgeUserSyncAction('admin', 'user_1')).toEqual({
      type: 'SWITCH_USER',
      role: 'admin',
      userId: 'user_1',
    });
  });

  it('omits role overwrite when the Clerk session role is unresolved', () => {
    expect(buildBridgeUserSyncAction(null, 'user_1')).toEqual({
      type: 'SWITCH_USER',
      role: undefined,
      userId: 'user_1',
    });
  });
});
