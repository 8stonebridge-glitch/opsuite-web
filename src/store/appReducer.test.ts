import { describe, expect, it } from 'vitest';
import { appReducer, EMPTY_APP_STATE } from './appReducer';

describe('appReducer', () => {
  it('updates both role and user id when SWITCH_USER carries a Clerk role', () => {
    const next = appReducer(EMPTY_APP_STATE, {
      type: 'SWITCH_USER',
      role: 'subadmin',
      userId: 'user_1',
    });

    expect(next.role).toBe('subadmin');
    expect(next.userId).toBe('user_1');
  });

  it('preserves the existing role when SWITCH_USER only refreshes the user id', () => {
    const seededState = {
      ...EMPTY_APP_STATE,
      role: 'employee' as const,
      userId: 'user_old',
    };

    const next = appReducer(seededState, {
      type: 'SWITCH_USER',
      userId: 'user_new',
    });

    expect(next.role).toBe('employee');
    expect(next.userId).toBe('user_new');
  });
});
