# notification system — sprint 2

## the five-line summary

1. Sprint 2 is the first sprint where users can actually see and interact with notifications.
2. A notification center (inbox) appears in the app, showing the user's recent notifications in a list.
3. A badge on the app header shows how many unread notifications are waiting — and clears when the user reads them.
4. Users can open their notification preferences and turn specific notification types on or off.
5. Basic accessibility is built in from the start so the notification center works for users who rely on keyboards or screen readers.

---

## why this sprint comes now

Sprint 1 built the engine. Nothing is visible to users yet, but the system is correctly dispatching, deduplicating, and tracking notifications. Sprint 2 surfaces that work. Without the UI layer, users have no way to receive or respond to the notifications the backend is already generating. This is the sprint where the feature becomes real from a user's perspective.

---

## sprint tasks, explained

**visible notification center (`UI-003` — inbox triage queue)**
This is the panel or page inside the app where users see their notifications listed in order. Each notification shows what happened, when, and a link to the relevant record (an approval request, a report, etc.). Without this, notifications only exist in the backend — users have no place to see or act on them.

**badge state management**
The badge is the small number indicator on the notification bell icon in the app header. It shows how many unread notifications are waiting. When the user opens the notification center and reads the alerts, the badge clears. Stale badges that never clear (`FAIL-032` — ghost notification) confuse users and make the feature feel broken.

**notification list rendering**
The notification center needs to display a list that handles real-world conditions: empty state (no notifications yet), loading state (fetching from the server), long lists (pagination or scroll), and read vs. unread visual distinction. Without proper list rendering, the notification center either shows a blank screen or crashes under load.

**preference controls**
Users need a settings surface where they can turn notification types on or off. This is the user-facing side of the preference check built in Sprint 1. Without visible preference controls, users who do not want certain notifications have no way to opt out — other than uninstalling the app or blocking all notifications.

**basic accessibility**
The notification center should be reachable and operable by keyboard alone, and notification items should be announced correctly to screen readers. This is built from the start rather than retrofitted later — retrofitting accessibility is significantly harder and more disruptive.

---

## build order

1. **first:** build the notification list component with loading, empty, and populated states, and read/unread styling.
2. **parallel:** build the badge component and wire it to the unread count from the backend.
3. **next:** integrate the list and badge into the app shell (notification bell, panel open/close behavior).
4. **next:** build the preference controls screen and connect it to the preference check layer from Sprint 1.
5. **last:** accessibility pass across the notification center and preference controls. end-to-end walkthrough: trigger a real notification, see it appear in the center, see the badge update, mark it read, and verify the badge clears.

---

## what you should expect to see working after sprint 2

- ✅ "Show me the notification center — I want to see my recent notifications listed."
- ✅ "Trigger an approval rejection — does a notification appear in my notification center?"
- ✅ "Show me the badge on the notification bell — does it show the correct unread count?"
- ✅ "Open the notification center and read the notifications — does the badge clear?"
- ✅ "Open my notification preferences — can I turn off approval notifications without affecting onboarding notifications?"
- ✅ "Navigate the notification center using only the keyboard — does it work?"

---

## what is still not included yet

- Reliability polish and timing refinement — Sprint 3.
- Retry visibility and dead-letter surfacing for operations teams — Sprint 3.
- Stronger preference UX with grouped controls and clearer labels — Sprint 3.
- Final metrics, QA, and ship readiness — Sprint 4.
