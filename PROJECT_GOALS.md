# Dukse Bot (Teams Clerk Bot) - Project Goals

## 1) Mission
Create a Microsoft Teams bot that helps a small office run weekly/monthly “clerk” duties reliably:
- Track who is on duty (including a shared-week rotation where two people split the days).
- Remind the assigned clerk each day (Mon–Fri, Europe/Copenhagen) about open tasks.
- Let the clerk confirm completion by replying in chat (e.g. `done vande planter`).
- Post a weekly “wrap-up” in the group channel when everything for the week is finished.

## 2) MVP Scope (what “done” means)
This MVP is considered complete when all of the following work end-to-end:

### Rotation + scheduling rules
- Rotation is based on ISO week numbers in `Europe/Copenhagen`.
- Weekday reminders run only on Mon–Fri.
- Danish public holidays follow this rule:
  - Daily tasks are skipped on holidays.
  - Weekly/monthly tasks remain due for that period and are reminded on the next working day (Mon–Fri).
- Weekly tasks due-day behavior:
  - `vande planter`, `Gå ned med pant`, and `Køb mælk og kaffebønner` are treated as due **Monday** of the week (or moved to next working day if Monday is a Danish holiday).

### Tasks + completion tracking
- Tasks exist in three cadences: `daily`, `weekly`, `monthly`.
- The bot can:
  - Display `status` for the current clerk (and open tasks due today/this week as appropriate).
  - Mark a task instance as completed via `done <task>`.
- Completion state is persisted so it survives restarts (Azure Table Storage).

### Proactive reminders + wrap-up
- The bot sends the assigned clerk a DM with missing tasks at the configured reminder time.
- At week’s completion (or at a configured week-end time), the bot posts a summary in the configured Teams channel and acknowledges “all tasks done”.

### Admin UI (no redeploy to change rotation/tasks)
- Admins can sign in via Microsoft Entra ID (SSO).
- Admins can update:
  - Roster/rotation rules (including the shared-week pair and their day split).
  - Task definitions (daily/weekly/monthly + enabled/disabled).
  - Reminder time and target announcement channel.
- Changes take effect without rebuilding the bot:
  - Admin UI updates shared config in Azure storage.
  - Bot reads the latest config during reminder/handler execution (with short cache TTL).

## 3) Architecture (target)
Recommended architecture:
- **Bot backend**: Azure Functions (Bot Framework message endpoint + timer triggers)
- **Proactive messaging**: Bot Framework proactive DMs using stored `conversationReference`
- **Data store**: Azure Table Storage
  - Config: rotation rules, tasks, schedules
  - Task instances: per period (day/week/month) and per assignee
  - Conversation references: required for proactive DM
  - Audit log: optional but recommended
- **Admin UI**: Vercel-hosted Next.js
  - Auth: Microsoft Entra ID
  - Writes config through a backend API (or writes shared storage directly, but avoid split-brain)

### Key code locations (already created in the repo)
- Shared types + rotation logic:
  - `packages/shared/src/types.ts`
  - `packages/shared/src/rotation.ts`
- Shared task instance helpers:
  - `packages/shared/src/tasks.ts`
- Azure Table config persistence + API endpoint:
  - `apps/bot/src/storage/configStore.ts`
  - `apps/bot/src/api/configFunction.ts`
- Admin UI:
  - `apps/admin-ui/src/auth.ts`
  - `apps/admin-ui/src/api/client.ts`

## 4) Rotation + shared-week pattern (your provided history)
Expected clerk assignment pattern (ISO week numbers):
- Uge 9: Jes
- Uge 10: Jonas (Mon/Tue/Fri) and Julie (Wed/Thu)
- Uge 11: Nusha
- Uge 12: Christine
- Uge 13: Frederik
- Uge 14: Jonas (Mon/Tue/Fri) and Julie (Wed/Thu)
- Uge 15: Jes
- Uge 16: Nusha
- Uge 17: Christine
- Uge 18: Frederik

Implementation note:
- The current repo includes a rotation helper (`packages/shared/src/rotation.ts`) but it will need alignment to reproduce the exact pattern above (likely via an explicit “base week offset” or via configuration that encodes the shared-week week numbers + day mapping).

## 5) Definition of Done Checklist
Code/infra is “done” when:
- [ ] Admin UI can authenticate (Entra SSO) and is restricted to allowlisted admins.
- [ ] Admin UI can edit tasks/rotation/settings and persist changes to storage.
- [ ] Bot sends daily DM reminders Mon–Fri, Europe/Copenhagen, using stored conversation references.
- [ ] Danish holidays:
  - [ ] daily tasks are skipped on holidays
  - [ ] weekly tasks remain due for that week and are reminded on the next working day
- [ ] `status` and `done <task>` work reliably and update persisted task instances.
- [ ] Weekly wrap-up posts to the configured channel when weekly tasks are completed.
- [ ] A minimal GitHub Actions CI workflow runs typecheck/build for shared/admin/bot packages.

## 6) Non-goals for MVP
- Natural language “chatbot” semantics beyond `status`, `done <task>`, and `help`.
- Complex rescheduling/“fairness scoring” for daily tasks (we start with the rotation rules you gave).
- Perfect audit/reporting UI beyond basic admin edit + config preview.

