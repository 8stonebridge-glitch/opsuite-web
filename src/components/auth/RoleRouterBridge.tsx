'use client';

/**
 * FEAT-AUTH-05: Role-based dashboard routing bridge.
 *
 * Thin component wrapper around useRoleRouter so it can be placed
 * in the provider tree without modifying layout components.
 */

import { useRoleRouter } from './useRoleRouter';

export function RoleRouterBridge() {
  useRoleRouter();
  return null;
}
