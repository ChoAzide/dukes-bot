# Continuity: chat, Cursor, and this repo

This file is the **human-readable “save point”** for the project. Cursor does not automatically copy every chat into your repo; use the sections below to know what is where and how to preserve conversations.

## What lives in this folder (your project)

| Item | Purpose |
|------|---------|
| [PROJECT_GOALS.md](PROJECT_GOALS.md) | Mission, MVP scope, rotation/task rules, architecture, definition of done |
| [README.md](README.md) | Repo layout and quick start |
| `apps/bot/` | Teams bot (Azure Functions + Bot Framework), storage, schedulers |
| `apps/admin-ui/` | Next.js admin UI (Entra SSO, CRUD for config) |
| `packages/shared/` | Shared types and rotation/task helpers |
| `.github/workflows/ci.yml` | GitHub Actions CI |
| `.cursor/rules/` | Cursor rules so new chats get project context |

**Git:** If `.git` exists, your code history is already local. Push to GitHub when `origin` is set (see below).

## Cursor chat history (not auto-copied here)

- **Composer / Chat in Cursor** is stored in Cursor’s app data on your Mac, not inside `Dukse_Bot` by default.
- Typical locations to look at (paths may vary by Cursor version):
  - `~/Library/Application Support/Cursor/`
  - Workspace-specific data may appear under paths that include your project or workspace name.

**To keep a literal copy of a conversation in this repo:**

1. In Cursor, open the chat you care about.
2. Use **Copy** / **Export** if your Cursor version offers it, or select all and paste into a new file, e.g. `docs/chat-exports/YYYY-MM-DD-topic.md` (create the folder if needed).
3. Commit that file if you want it in Git history.

## Agent / transcript files (optional reference)

Some Cursor workspaces keep **agent transcripts** under your user folder, e.g. under:

`~/.cursor/projects/`

Those files are for Cursor’s use; they are **not** the same as checking in source code. For portability, prefer exporting the chat into `docs/chat-exports/` as above.

## GitHub (command line vs GitHub Desktop)

- **Either works.** GitHub Desktop is fine if you prefer a GUI.
- **Command line** (`git remote add`, `git push`) is enough if the repo already exists on GitHub.
- **GitHub CLI (`gh`)** can create the repo and push in one flow after `gh auth login`.

After you have a remote:

```bash
cd "/Users/azide/Library/CloudStorage/OneDrive-azide.dk/General/Azide/AI Projekter/Dukse_Bot"
git remote add origin <YOUR_GITHUB_REPO_URL.git>   # skip if already added
git push -u origin main
```

## One-line “resume prompt” for a new Cursor chat

Paste something like:

> Read `PROJECT_GOALS.md`, `CONTINUITY.md`, and `.cursor/rules/dukse-bot-project.mdc`. This is the Dukse Bot monorepo: Teams bot in `apps/bot`, admin UI in `apps/admin-ui`, shared logic in `packages/shared`. Continue from the last state in git / open PRs.

---

*Last updated: continuity doc added so the project folder carries goals + where to find chats + how to resume work.*
