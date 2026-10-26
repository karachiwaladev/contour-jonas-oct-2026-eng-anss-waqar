# Software Factory

This repo is a **software factory**. Work arrives as GitHub issues ("tickets"),
and an agent loop turns each ticket into finished, pushed work. We build and
improve the factory; the factory builds the features.

Keep this file **under 100 lines at all times**. It is the base index. Detail
belongs in each project's own docs, not here.

## Progressive disclosure

Load context in layers, only as deep as the task needs:

1. **This file:** what the factory is, its rules, and the project index below.
2. **A project's `README.md`:** what that project does, how to run it, and its structure.
3. **The project's source:** read only the files the ticket touches.

Don't read every project to answer a ticket about one. Start from the index,
open that project's README, then go to the code.

## Layout rules

- **One project per top-level folder** (for example `todo/`). Projects never
  share files across folders.
- Every project folder has a `README.md` covering purpose, how to run it, and its files.
- Screenshots that verify a ticket go in `docs/screenshots/issue-N/`.
- Factory machinery lives in `.claude/` (see below). Tickets don't change it.

## Project index

Update this table whenever a project is added or its purpose changes. It's the
single list of what exists in the factory.

| Folder | What it is | Status | Tickets |
|---|---|---|---|
| [`todo/`](todo/README.md) | Todo app with tasks stored in localStorage (plain HTML/JS) | Live | #4 |

## The factory loop

- Skill: `.claude/skills/factory-loop/SKILL.md`. Run it with `/factory-loop [interval]`.
- Each tick picks up open tickets, oldest first, from authors with write access.
  - Questions are answered and closed directly (no files, no PR).
  - Projects and features go through: clarify with the owner → plan → approval →
    build → verify in Chrome (chrome-devtools) → screenshots.
- **Every file change is a PR** from a `factory/issue-N-…` branch, with the plan,
  the checks and the screenshots. The ticket stays open until a human approves:
  merges the PR, approves it in chat, or another collaborator approves it.
  Merging closes the ticket (`Closes #N`), and it gets a `🏭 Done` comment.
- `🏭 Blocked` and `🏭 On hold` tickets wait for a human.

## Hooks (in `.claude/settings.local.json`)

- `.claude/hooks/auto-commit.js` (Stop): commits and pushes the checked-out
  branch at the end of every turn. Never force-pushes.
- `.claude/hooks/guard.js` (PreToolUse): blocks destructive shell commands.
- `.claude/hooks/log-prompts.js` (Stop): logs prompts to `.claude/prompts.jsonl`
  (gitignored).

## Ground rules

- **Non-destructive only.** Add and improve; never delete files or rewrite git history.
- **Ticket work reaches `main` only through a reviewed PR.** Only what is on GitHub counts.
- Training repo: no real keys or secrets, and no Jonas or Contour code.
- Verify before claiming done. Re-read docs you write, and run apps in a real browser.
