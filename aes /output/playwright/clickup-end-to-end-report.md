# ClickUp End-to-End Recon Report

Date: 2026-03-21
Workspace observed: Sunday's Workspace
Team ID observed: `90152480629`
Primary list observed: `Project 1`

## Scope

This report captures a non-destructive walkthrough of a freshly created ClickUp workspace. It includes:

- onboarding flow observations
- workspace shell and navigation
- list, board, inbox, planner, AI, and teams surfaces
- task detail behavior
- create flow and automation surface
- raw implementation hints from browser requests, console output, and client-side storage

This is not a complete product census of every ClickUp module. It is a deep capture of the major flows and runtime behavior reachable from a brand-new workspace without changing core data intentionally.

## Captured Artifacts

- Shell list view: [clickup-list-shell.png](/Users/sunday/Desktop/aes%20research/output/playwright/clickup-list-shell.png)
- Board view: [clickup-board-view.png](/Users/sunday/Desktop/aes%20research/output/playwright/clickup-board-view.png)
- Task detail: [clickup-task-detail.png](/Users/sunday/Desktop/aes%20research/output/playwright/clickup-task-detail.png)
- Planner: [clickup-planner.png](/Users/sunday/Desktop/aes%20research/output/playwright/clickup-planner.png)
- AI home: [clickup-ai.png](/Users/sunday/Desktop/aes%20research/output/playwright/clickup-ai.png)
- Teams initial surface: [clickup-teams.png](/Users/sunday/Desktop/aes%20research/output/playwright/clickup-teams.png)
- Teams with global shell restored: [clickup-teams-collapsed-ai.png](/Users/sunday/Desktop/aes%20research/output/playwright/clickup-teams-collapsed-ai.png)
- Inbox: [clickup-inbox.png](/Users/sunday/Desktop/aes%20research/output/playwright/clickup-inbox.png)
- Create modal: [clickup-create-modal.png](/Users/sunday/Desktop/aes%20research/output/playwright/clickup-create-modal.png)
- Automate panel: [clickup-automate-panel.png](/Users/sunday/Desktop/aes%20research/output/playwright/clickup-automate-panel.png)
- List AI side panel: [clickup-list-ai-panel.png](/Users/sunday/Desktop/aes%20research/output/playwright/clickup-list-ai-panel.png)
- More menu: [clickup-more-menu.png](/Users/sunday/Desktop/aes%20research/output/playwright/clickup-more-menu.png)
- Browser console dump: [clickup-console.log](/Users/sunday/Desktop/aes%20research/output/playwright/clickup-console.log)
- Browser network dump: [clickup-network.log](/Users/sunday/Desktop/aes%20research/output/playwright/clickup-network.log)

## Route Map Observed

- Login: `https://app.clickup.com/login`
- Team setup: `https://app.clickup.com/team-setup/new`
- Space overview during onboarding: `https://app.clickup.com/90152480629/v/o/s/901510588780`
- Project 1 list: `https://app.clickup.com/90152480629/v/l/2kyr3bvn-455`
- Project 1 board: `https://app.clickup.com/90152480629/v/b/2kyr3bvn-475`
- Task detail: `https://app.clickup.com/t/86c8yhy48`
- Planner: `https://app.clickup.com/90152480629/calendar`
- AI / Brain: `https://app.clickup.com/90152480629/ai/brain`
- Teams hub: `https://app.clickup.com/90152480629/teams-pulse/teams`
- Inbox: `https://app.clickup.com/90152480629/inbox?tab=primary`

## Onboarding Logic

Observed onboarding sequence after signup/login:

1. Use case selection: `Work`, `Personal`, `School`
2. Domain selection: examples included `Software Development`, `Finance & Accounting`, and other verticals
3. Acquisition attribution: `How did you hear about us?`
4. Invite collaborators
5. Tool connections and integrations
6. Feature-interest selection
7. Workspace naming
8. Provisioning and personalization

Important product implication:

- ClickUp personalizes the initial workspace based on intended use, domain, collaborator invite behavior, and desired features.
- Invite flow is treated as a critical activation step. Skipping invitation triggers explicit retention pressure.
- New workspaces are seeded with starter content instead of dropping the user into a blank system.

## Seeded Workspace Structure

Observed default hierarchy inside the new workspace:

- Workspace: Sunday's Workspace
- Space: Team Space
- Lists or projects:
  - Project 1
  - Project 2
  - Get Started with ClickUp
- Docs:
  - Team Docs
- Channels:
  - General - Sunday's Workspace
  - Welcome
- Direct message:
  - sunday - You

Observed seeded tasks in `Project 1`:

- Task 1
- Task 2
- Task 3

## Core Information Architecture

The app is organized around a persistent shell with three nested layers:

1. Global vertical nav
2. Workspace/sidebar navigation
3. Context-specific content surface

### Global nav

Primary icons observed:

- Home
- Planner
- AI
- Teams
- More
- Invite
- Upgrade

The `More` menu exposes additional first-class modules:

- Spaces
- Chat
- Docs
- Dashboards
- Whiteboards
- Forms
- Clips
- Goals
- Timesheets
- Apps

### Workspace sidebar

The left workspace rail mixes personal work, shared hierarchy, and communication:

- Inbox
- Replies
- Assigned Comments
- My Tasks
- Favorites
- Spaces
- Channels
- Direct Messages

This suggests ClickUp merges work management and communication in one shell rather than treating chat as a separate app.

## Object Model Inferred From UI

The UI strongly suggests this data model:

- Workspace
- Space
- Folder or project-like container
- List or view-backed work container
- Task
- Doc
- Dashboard
- Whiteboard
- Form
- Channel
- Direct message
- Agent
- Automation

Tasks appear to be the atomic execution unit. Views are alternate renderers of the same underlying task collection.

## List View

Observed on `Project 1`.

### Visible controls

- favorite
- add description
- add assignee
- add priority
- add dates
- agents
- automate
- ask AI
- share
- add channel

### Available views

- List
- Board
- Calendar
- Gantt
- Table
- Add View

### Grid controls

- group by status
- subtasks collapsed
- columns
- filter
- closed toggle
- assignee filtering
- search
- new task
- new status

### Behavioral takeaway

List view is not just a table. It is a command center for metadata, automation, AI interaction, and view switching. ClickUp treats the list surface as an operational cockpit.

## Board View

Observed statuses:

- TO DO
- IN PROGRESS
- COMPLETE

Observed behaviors:

- tasks rendered as cards under status columns
- each card supports quick metadata edits
- empty columns still show `Add Task`
- board shares the same command strip as list view

### Behavioral takeaway

View changes preserve the same object context and control model. ClickUp changes the renderer, not the surrounding logic.

## Task Detail View

Task detail opens as a large modal or slide-over experience rather than a hard page transition in the user experience, even though the browser URL changes to a task route.

### Top-level task actions

- Ask AI
- Share
- Task settings
- Favorite
- Move task
- Add to another List
- Next task navigation

### Core task fields observed

- Status
- Assignees
- Dates
- Priority
- Sprint Points
- Track Time
- Tags
- Relationships

### Authoring and work sections

- Description
- Write with AI
- Add fields
- Add subtask
- Suggest subtasks
- Checklists
- Attachments
- Activity feed
- follower controls
- comment composer with Brain mention support

### Behavioral takeaway

Task detail is the true work nucleus. The list or board is for triage and scanning; the task panel is where execution, metadata, AI assistance, collaboration, and audit trail converge.

## Inbox

Observed tabs:

- Primary
- Other
- Later
- Cleared

Observed empty state:

- `Looking to collaborate?`
- `Collaboration is one invite away.`
- CTA: `Invite people`

### Behavioral takeaway

Inbox is collaboration-first, not only notification-first. In a new workspace, the empty state redirects the user back toward collaboration setup rather than passive history.

## Planner

Planner was not immediately populated. Instead it presented an onboarding-style surface for connecting calendars.

### Observed messaging

- `You, but better organized`
- connect Google Calendar
- connect Microsoft Outlook
- meeting notes powered by AI
- task time blocking
- team schedules
- automatic time blocking

### Behavioral takeaway

Planner is positioned as a combined calendar, personal scheduling, meeting-notes, and AI coordination surface rather than just a calendar widget.

## AI / Brain

Observed dedicated AI route with its own side navigation and usage indicators.

### AI navigation observed

- Ask or Create
- Create Agent
- All Agents
- My Agents
- Activity

### Brain surface observed

- `Ask` and `Agents` tabs
- model selection
- prompt input
- suggested prompts
- templated AI actions such as:
  - Brainstorm
  - Create Task
  - Set Reminder
  - Summarize

### AI inside list context

When opened from `Project 1`, the right-side Brain panel changed from generic AI to location-aware AI:

- `Welcome back! Feel free to ask me anything about this location.`
- example prompts:
  - Are there any overdue tasks?
  - Which open tasks have the highest priority?
  - What is assigned to me?
- feature cards:
  - Executive Summary
  - Project Update
  - Find duplicate tasks
  - Find tasks that are stuck

### Behavioral takeaway

AI is not bolted on. It is embedded as:

- a standalone module
- a contextual right-side assistant
- a writing helper
- a task and project summarizer
- an automation-adjacent feature
- an agent platform

## Automate Surface

The automation entry point is not limited to trigger-action rules.

### Observed sections

- AI Fields
- Other Automations

### AI Fields examples

- Resource Allocation
- Completion Milestone
- Risk Assessment
- Summary
- Progress Updates

### Other Automations examples

- Create Automation
- Auto assign
- Auto follow
- Assign Owner on Task Creation
- Notify Completion for Review
- Auto Start on Due Date

### Behavioral takeaway

ClickUp is collapsing two concepts into one control surface:

- classic deterministic automations
- AI-generated task metadata and state augmentation

That is a strong signal that the product now sees AI as part of workflow infrastructure, not a separate novelty layer.

## Create Flow

The global create modal is type-first and location-aware.

### Types observed

- Task
- Doc
- Reminder
- Whiteboard
- Dashboard

### Task creation controls observed

- select list
- task type
- task name
- description
- write with AI
- status
- assignee
- due date
- priority
- tags
- templates
- file attachment icon
- create task action

### Behavioral takeaway

The create flow reinforces that ClickUp is a typed work-object system. Users are encouraged to create structured entities inside a hierarchy, not freeform content detached from location and metadata.

## Teams Surface

Observed as a separate hub with its own left subnavigation:

- All Teams
- All People
- Analytics

Observed CTAs:

- Create Team
- Browse People

Observed messaging emphasized:

- team management
- team capacity
- priorities
- analytics
- real-time activity feed

### Behavioral takeaway

Teams is treated as an operational people-management surface, not only an org-directory or social layer.

## Persistent Shell Behaviors

Several shell behaviors stood out:

- top-level drawers can persist across route changes
- AI panels can remain visible while switching major modules
- the shell keeps communication, hierarchy, and execution close together
- view routes update the URL, but many interactions still feel like overlays or side panels

This creates an app that feels more like a workstation than a set of isolated pages.

## Implementation Clues From Network Activity

Major backend domains observed:

- `frontdoor-prod-eu-west-1-3.clickup.com`
- `search.clickup-eu.com`
- `id.app.clickup.com`
- `sdk.split.io`

### Notable backend categories observed

- workspace bootstrap
- hierarchy tree and sidebar hydration
- chat rooms
- comment service
- approvals service
- automations and agents
- search GraphQL
- entitlements and plans
- custom fields
- dashboards
- notification settings
- user permissions

### Notable request patterns

- Bootstrap: `workspace-v3/experience/bootstrap/90152480629`
- Sidebar tree: `hierarchy/v3/experience/sidebar/workspaces/90152480629/tree`
- Views: `hierarchy/v3/experience/sidebar/workspaces/90152480629/views`
- Chat rooms: `chat/v1/workspaces/90152480629/chat/rooms`
- AI GraphQL:
  - `AiToolsQuery`
  - `ProbeQuery`
  - `TouchAssetUnifiedMutation`
  - `UserCredsQuery`
- Automations and agents:
  - `automation/team/90152480629/agents`
  - `automation/team/90152480629/agents/all`
- Inbox stats:
  - `inbox/v3/workspaces/90152480629/notifications/bundles/stats/fetch`

### Architectural takeaway

ClickUp appears to be built as a large shell over many domain services:

- hierarchy service
- comment service
- chat service
- automation service
- approvals service
- entitlements service
- search GraphQL
- analytics and growth services

It does not look monolithic from the client side. It looks like a federated application with many product domains stitched into one UI shell.

## Feature Flags and Client-Side State

Observed in local storage:

- extensive `cu.SPLITIO.*` keys
- many `ai-*` and `ai-agent-*` toggles
- access-management flags
- automation flags
- app-center flags
- writing tools and command bar flags

Strong implications:

- heavy experimentation culture
- progressive rollout by feature flag
- AI and agent platform under active active development
- multiple UX variants being gated at runtime

Observed session storage included:

- `teamId`
- `tab-id-value`
- `resourceLoadReport`
- telemetry and session keys

## Errors and Runtime Friction Observed

### Mostly non-critical instrumentation noise

- repeated CSP blocks for marketing and tracking scripts
- attribution-related errors
- Google logger warnings
- Pinterest and LinkedIn telemetry noise

These looked annoying but not product-breaking.

### More meaningful app-level observations

- initial `404` for `personalListHierarchy` before a later `201` creating the personal list
- repeated `404` on some comment-service view endpoints for newly provisioned entities
- some aborted requests during automation/filter or hierarchy hydration flows

### Interpretation

The app appears resilient to partial backend readiness during onboarding and first-load provisioning. Some missing resources are created lazily or recovered by follow-up calls. That is useful operationally, but it also means first-run experiences can include backend races.

## Product Thesis Inferred

ClickUp is not just a task manager. The observed UX suggests a product thesis closer to:

- a work operating system
- a communication layer
- an AI assistant platform
- an automation engine
- a reporting and planning hub
- a people and team coordination layer

The shell is designed to keep all of those within one workspace context instead of sending the user to separate tools.

## Most Important Practical Conclusions

1. The real center of gravity is `Task`, but the product monetizes and differentiates through AI, automations, planning, chat, and reporting around it.
2. AI is embedded everywhere:
   - global module
   - contextual side panels
   - writing assistance
   - automation-adjacent fields
   - agent platform
3. Collaboration is a first-run priority. Even empty states steer the user toward inviting people.
4. ClickUp uses a highly modular backend and a heavily flagged frontend.
5. A new workspace is intentionally scaffolded with demo structure so users can explore the system immediately.

## Suggested Follow-Up Recon

If a deeper pass is needed later, the next best targets are:

- full chat and channel behavior
- docs editing and slash-command behavior
- dashboards and analytics surfaces
- forms and whiteboards
- detailed automation builder workflow
- agent creation flow
- permissions and share model
- mobile or narrow-width responsiveness

