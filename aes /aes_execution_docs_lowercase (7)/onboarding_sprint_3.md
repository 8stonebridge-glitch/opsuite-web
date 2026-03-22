# onboarding — sprint 3

## the five-line summary

1. Sprint 3 fills in every interactive form element inside the onboarding wizard.
2. Users can now type text, choose from dropdowns, pick dates, and upload files — all without the page freezing or giving confusing errors.
3. The sprint also handles the "sign in with your company account" (SSO/token) flow so enterprise users land directly into onboarding without a separate login detour.
4. Auto-save is added so a half-finished wizard does not disappear if a user closes the tab or steps away.
5. By the end of this sprint, the wizard feels complete and usable from first click to final step.

---

## why this sprint comes now

Sprints 1 and 2 built the wizard shell, the step-by-step structure, branching by role, and the ability to save your place and come back. But those sprints left the actual form fields as placeholders. You could navigate the wizard, but you could not fill it in. Sprint 3 replaces every placeholder with a real, working control — and wraps the whole experience in the error and loading feedback users need when things go slowly or go wrong.

---

## sprint tasks, explained

**text inputs, dropdowns, date pickers, and file uploads**
These are the building blocks of the wizard. Every step that asks a user for information needs a proper field: a text box for names, a dropdown for roles or departments, a date picker for things like start dates, and a file upload for documents like ID or credentials. Without these, the wizard has nowhere to put the user's answers.

**loading states**
When the wizard saves a step or fetches data from the server, there is a brief wait. Without a visible loading indicator, users click again thinking nothing happened — causing duplicate submissions or confusion. Loading states show users the system is working.

**error handling UI**
Things go wrong: a required field is left blank, a file is too large, a network call times out. Without clear error messages shown next to the right field, users do not know what to fix. This sprint adds field-level validation messages and screen-level error banners where needed.

**token resolution and SSO flow**
Many organizations use single sign-on (SSO) — where employees log in through their company's identity provider (like Okta or Azure AD) rather than a separate username/password. This sprint ensures that when an SSO user arrives via an invitation link, their identity token is resolved correctly and they land inside the onboarding wizard without needing a separate login step. Skipping this leaves enterprise users stuck at a login wall.

**auto-save drafts**
If a user closes the browser halfway through onboarding, their answers should not vanish. Auto-save writes the current wizard state to the server every time the user advances a step or pauses. This works together with the resume capability built in Sprint 2: resume only helps if there is something to resume from.

---

## build order

1. **first:** build each form field component in isolation — text input, dropdown, date picker, file upload — with validation rules attached.
2. **parallel:** build loading state wrappers and error display components alongside the fields.
3. **next:** wire each field into the wizard steps so the wizard collects real data and saves it on step advance (auto-save).
4. **next:** integrate the SSO/token resolution path so enterprise users land in the wizard seamlessly.
5. **last:** end-to-end walkthrough with a real user scenario, fixing any rough edges in field behavior, error messages, or the SSO handoff.

---

## what you should expect to see working after sprint 3

- ✅ "Show me the onboarding wizard — I want to fill in my name, choose my department from a dropdown, pick a start date, and upload a document."
- ✅ "Now try leaving a required field blank and advancing to the next step — what does it say?"
- ✅ "What happens if I upload a file that is too large?"
- ✅ "Close the tab halfway through step 3 and reopen the wizard — does it pick up where I left off?"
- ✅ "Show me what happens when an enterprise user clicks an invitation link — do they go through a separate login, or do they land directly in the wizard?"
- ✅ "Slow the network connection and advance a step — does the wizard show a loading indicator or just freeze?"

---

## what is still not included yet

- Activation rate metrics and milestone completion measurement — that is Sprint 4.
- Final acceptance testing and ship readiness — also Sprint 4.
