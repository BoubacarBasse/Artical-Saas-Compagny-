# Working in this repo

**Read `context.md` first.** It holds the project state, the architecture, the
permission model, and how to run the app in both data modes. This file exists
only to point you there, because `CLAUDE.md` is loaded automatically and
`context.md` is not.

Two standing rules:

1. **Keep `context.md` current.** When something meaningful is built or decided
   — a phase completes, the data model changes, a hard-to-reverse decision is
   made, something is verified or found broken — update it without being asked.
   Routine edits do not belong there.

2. **All work goes on `claude/article-ordering-webapp-k6vwb4`.**

Before committing: `npm run typecheck && npm run test:unit`.
