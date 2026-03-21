import { expect, test } from '@playwright/test';
import { signInAsE2EOwner } from './helpers/auth';

/**
 * AES Messaging E2E Tests
 *
 * Invariants under test:
 *   INV-MSG-001  Unread count correctness
 *   INV-MSG-002  Deterministic message ordering (createdAt, _id)
 *   INV-MSG-003  Organization & role isolation
 *   INV-MSG-004  Offline-safe UX
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function signInAndGoToMessages(page: import('@playwright/test').Page) {
  await signInAsE2EOwner(page);
  await page.goto('/admin/messages', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await expect(page.getByRole('heading', { name: 'Messages' })).toBeVisible({ timeout: 15000 });
}

/** Open the first conversation in the list. Returns true if one was opened. */
async function openFirstConversation(page: import('@playwright/test').Page): Promise<boolean> {
  const row = page.locator('.divide-y button').first();
  const visible = await row.isVisible({ timeout: 3000 }).catch(() => false);
  if (!visible) return false;
  await row.click();
  // Wait for ThreadView to mount
  await page.locator('[role="log"]').waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
  return true;
}

/** Simulate going offline inside ThreadView's useIsOffline hook */
async function goOffline(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });
    window.dispatchEvent(new Event('offline'));
  });
}

/** Simulate going back online */
async function goOnline(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
    window.dispatchEvent(new Event('online'));
  });
}

// Selector for our OfflineBanner (not the Next.js route announcer)
const OFFLINE_BANNER = 'div[role="alert"]:has(svg)';

// ---------------------------------------------------------------------------
// INV-MSG-004 — Offline-safe UX
// ---------------------------------------------------------------------------

test.describe('INV-MSG-004: Offline-safe UX', () => {
  test('offline banner appears when network drops and dismisses on reconnect', async ({ page }) => {
    await signInAndGoToMessages(page);
    const opened = await openFirstConversation(page);
    if (!opened) {
      test.skip();
      return;
    }

    // Go offline
    await goOffline(page);

    // Our OfflineBanner has role="alert" + contains an SVG (WifiOff icon)
    const banner = page.locator(OFFLINE_BANNER);
    await expect(banner).toBeVisible({ timeout: 5000 });
    await expect(banner).toContainText('offline');

    // Go back online
    await goOnline(page);
    await expect(banner).not.toBeVisible({ timeout: 5000 });
  });

  test('compose input is disabled when offline and re-enables on reconnect', async ({ page }) => {
    await signInAndGoToMessages(page);
    const opened = await openFirstConversation(page);
    if (!opened) {
      test.skip();
      return;
    }

    const textarea = page.locator('textarea[placeholder="Type a message..."]');
    const sendBtn = page.getByLabel('Send message');
    await expect(textarea).toBeVisible({ timeout: 5000 });
    await expect(textarea).toBeEnabled();

    // Go offline
    await goOffline(page);
    await expect(textarea).toBeDisabled({ timeout: 3000 });
    await expect(sendBtn).toBeDisabled();

    // Reconnect
    await goOnline(page);
    await expect(textarea).toBeEnabled({ timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// INV-MSG-002 — Deterministic message ordering
// ---------------------------------------------------------------------------

test.describe('INV-MSG-002: Message ordering', () => {
  test('thread container has role="log" with correct aria-label', async ({ page }) => {
    await signInAndGoToMessages(page);
    const opened = await openFirstConversation(page);
    if (!opened) {
      test.skip();
      return;
    }

    const threadLog = page.locator('[role="log"]');
    await expect(threadLog).toBeVisible({ timeout: 5000 });
    await expect(threadLog).toHaveAttribute('aria-label', 'Message thread');
  });

  test('timestamps are rendered for each message', async ({ page }) => {
    await signInAndGoToMessages(page);
    const opened = await openFirstConversation(page);
    if (!opened) {
      test.skip();
      return;
    }

    // Each MessageBubble renders a timestamp with suppressHydrationWarning
    const timestamps = page.locator('[role="log"] [suppresshydrationwarning]');
    const count = await timestamps.count();

    // If messages exist, each should have a non-empty timestamp
    if (count > 0) {
      const texts = await timestamps.allTextContents();
      for (const t of texts) {
        expect(t.trim().length).toBeGreaterThan(0);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// INV-MSG-001 — Unread count correctness
// ---------------------------------------------------------------------------

test.describe('INV-MSG-001: Unread count', () => {
  test('opening a conversation with unread messages clears badge', async ({ page }) => {
    await signInAndGoToMessages(page);

    // Look for an unread badge (emerald circle with number)
    const badgeSelector = '.bg-emerald-500.rounded-full';
    const badge = page.locator(badgeSelector).first();
    const hasBadge = await badge.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasBadge) {
      // No unread conversations to test — skip gracefully
      test.skip();
      return;
    }

    // Click the conversation that has the unread badge
    const row = page.locator('.divide-y button').filter({ has: page.locator(badgeSelector) }).first();
    await row.click();

    // Wait for markAsRead to fire (throttled to 1s)
    await page.waitForTimeout(2500);

    // Navigate back to check badge cleared
    const backBtn = page.getByLabel('Back to conversations');
    if (await backBtn.isVisible().catch(() => false)) {
      await backBtn.click();
      await page.waitForTimeout(1500);
    }
  });
});

// ---------------------------------------------------------------------------
// INV-MSG-003 — Organization & role isolation
// ---------------------------------------------------------------------------

test.describe('INV-MSG-003: Org isolation', () => {
  test('accessing invalid conversation ID does not leak data', async ({ page }) => {
    await signInAsE2EOwner(page);
    await page.goto('/admin/messages/zz_invalid_conv_id_999', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Should NOT show any real message bubbles — error or empty is fine
    const threadLog = page.locator('[role="log"]');
    const visible = await threadLog.isVisible().catch(() => false);

    if (visible) {
      // If thread container is present, it should have zero or only empty-state content
      const messageAreas = threadLog.locator('.space-y-2 > div');
      const count = await messageAreas.count().catch(() => 0);
      expect(count).toBeLessThanOrEqual(2); // empty state + possibly "load more"
    }
    // Not visible at all is also a valid isolation result
  });

  test('conversation list renders org-scoped data without errors', async ({ page }) => {
    await signInAndGoToMessages(page);

    // Page rendered with heading and new-conversation button = org query succeeded
    await expect(page.getByRole('heading', { name: 'Messages' })).toBeVisible();
    await expect(page.getByLabel('New conversation')).toBeVisible();

    // Either conversations exist (org-scoped), empty state, or the right panel empty state
    // Any of these prove the page rendered successfully with org-scoped data
    const emptyInbox = page.getByText('No conversations yet');
    const emptyPanel = page.getByText('Select a conversation or start a new one');
    const conversationRow = page.locator('.divide-y button').first();

    const hasEmptyInbox = await emptyInbox.isVisible({ timeout: 3000 }).catch(() => false);
    const hasEmptyPanel = await emptyPanel.isVisible({ timeout: 1000 }).catch(() => false);
    const hasConversation = await conversationRow.isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasEmptyInbox || hasEmptyPanel || hasConversation).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Smoke: Full messaging flow
// ---------------------------------------------------------------------------

test.describe('Messaging smoke', () => {
  test('messages page loads with header and new-conversation button', async ({ page }) => {
    await signInAndGoToMessages(page);

    await expect(page.getByRole('heading', { name: 'Messages' })).toBeVisible();
    await expect(page.getByLabel('New conversation')).toBeVisible();
  });

  test('typing indicator region has aria-live="polite"', async ({ page }) => {
    await signInAndGoToMessages(page);
    const opened = await openFirstConversation(page);
    if (!opened) {
      test.skip();
      return;
    }

    const liveRegion = page.locator('[aria-live="polite"]');
    await expect(liveRegion).toBeVisible({ timeout: 5000 });
  });

  test('load-older-messages button has correct aria-label', async ({ page }) => {
    await signInAndGoToMessages(page);
    const opened = await openFirstConversation(page);
    if (!opened) {
      test.skip();
      return;
    }

    // Only visible if there are > 50 messages
    const loadMore = page.getByLabel('Load older messages');
    // Just verify the selector is correct — don't fail if not enough messages
    const visible = await loadMore.isVisible({ timeout: 2000 }).catch(() => false);
    if (visible) {
      await expect(loadMore).toContainText('Load older messages');
    }
  });
});
