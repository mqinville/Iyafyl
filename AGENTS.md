<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

- Use Bun 1.4.2 (`/usr/local/bin/bun`). `bun.lock` is `lockfileVersion` 2, which the `packageManager` pin `bun@1.3.14` cannot parse (`Unknown lockfile version`). Install with `bun install --frozen-lockfile`.
- Dev server: `bun run dev -- --hostname 0.0.0.0 --port 3000`.
- Checks: `bun run lint`, `bun run typecheck`, and `bun run build`. There is no test suite. `next build` uses Turbopack and needs local port binding; if that fails, use `bun x next build --webpack`.
- A signed-in user's `profiles.league_id` is the league id when set. `LEAGUE_ID` in gitignored `.env.local` remains the fallback. With neither set, `/` shows sample standings and the note "Sample data". Sleeper (`api.sleeper.app`) is a public API and needs no auth.

## Backend

Supabase is the single backend provider: when a feature needs a backend service (auth, database, storage, scheduled jobs, edge functions, email), use Supabase's offering before adding another provider or library.
