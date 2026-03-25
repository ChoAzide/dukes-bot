## Teams Clerk Bot (Teams + Admin UI)

This repo contains:

- `apps/bot`: Microsoft Teams bot (Bot Framework) intended for Azure Functions hosting.
- `apps/admin-ui`: Admin web UI (Next.js) intended for Vercel hosting with Microsoft Entra ID (Azure AD) SSO.
- `packages/shared`: Shared types + core logic (rotation, tasks, scheduling).

### Prereqs (local dev / CI)

- Node.js 20+ (recommended)
- npm / pnpm

### Quick start (high level)

1. Create Azure resources (Bot registration + Function App + Storage account).
2. Configure environment variables (see each app’s `.env.example`).
3. Install deps at repo root and run:
   - `apps/admin-ui`: `npm run dev`
   - `apps/bot`: `npm run dev` (requires Azure Functions Core Tools)

### Environment variables

- Bot: `apps/bot/.env.example`
- Admin UI: `apps/admin-ui/.env.example`

