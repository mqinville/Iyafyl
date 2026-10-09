# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

Bun is the package manager and runner (`packageManager: bun@1.3.14`).

```bash
bun install
bun run dev            # next dev
bun run build          # next build
bun run lint           # eslint, then prettier --check
bun run format         # prettier --write .
bun run format:check   # prettier --check .
bun run typecheck      # tsc --noEmit; tsconfig is noEmit + incremental
bun run db:types       # regenerate lib/supabase/database.types.ts from the local Supabase DB
```

`bun run lint` fails when ESLint rules or Prettier formatting are violated. Prettier uses print width 80, no semicolons, and double quotes (`printWidth: 80`, `semi: false`, `singleQuote: false`). Formatting skips `design_handoff_iyafyl_home`, generated shadcn files in `components/ui`, `lib/supabase/database.types.ts`, and `.env*` files.

Supabase CLI loop (local stack needs Docker):

```bash
supabase start                       # local stack; `supabase status` prints URL and keys
supabase migration new <name>        # new file in supabase/migrations
supabase db reset                    # rebuild local DB from migrations
supabase link --project-ref <ref>    # once, to attach the hosted project
supabase db push                     # apply migrations to the hosted project
```

There is no test suite in this repo.

`next build` uses Turbopack, which needs local port binding. In a restricted sandbox use `bunx next build --webpack` instead.

Add shadcn primitives with `bunx shadcn@latest add <component>` — generated files land in [components/ui/](components/ui/) and use the `radix-vega` style (see [components.json](components.json)). Prefer an existing shadcn component over hand-rolling one, and don't add a dependency that isn't already in [package.json](package.json) without asking.

The `radix-vega` registry currently emits `import { cn } from "cn"` (a bare npm package, not ours). After every `shadcn add`, point it back at our helper — this is the only sanctioned edit to generated files:

```bash
sed -i '' 's|from "cn"|from "@/lib/utils"|' components/ui/*.tsx
```

## Architecture

Fantasy football league site ("Iyafyl"): Next.js 16 App Router + React 19 + Tailwind v4. Spec lives in [design_handoff_iyafyl_home/](design_handoff_iyafyl_home/) (read its README before building UI; leave that folder untouched).

**One home page, stub routes.** [app/page.tsx](app/page.tsx) is the home page: header → lead story → titles strip → top of table. Stub routes (placeholder pages only for now): `/standings`, `/teams`, `/matchups`, `/trade-calculator`, `/rankings`, `/hall-of-fame`. Auth pages `/login` and `/signup` are live through Supabase email + password (signed-in users are redirected home), `/auth/confirm` is the signup-confirmation route handler ([app/auth/confirm/route.ts](app/auth/confirm/route.ts): `verifyOtp` with a sanitized same-origin `next`, failures go to `/auth/error`) and `/forgot-password` is a stub. Sign-in is required for every page except the auth routes. The header reads the session, so every page renders dynamically. A screen used by one route stays in that route file; extract a component only when it is reused or the page composes several sections (see [.claude/rules/page-markup.mdc](.claude/rules/page-markup.mdc)).

**Backend policy.** Supabase is the single backend provider: when a feature needs a backend service (auth, database, storage, scheduled jobs, edge functions, email), use Supabase's offering before adding another provider or library.

**Data.** League data comes from the Sleeper public API (no auth) through [lib/server/sleeper.ts](lib/server/sleeper.ts), which is `server-only` and uses `fetch` with `next: { revalidate: 300 }`. The league id is the signed-in user's `profiles.league_id` when set, otherwise `LEAGUE_ID` (see [.env.local.example](.env.local.example); real value goes in the gitignored `.env.local`; the env var remains the fallback). Shared types are in [lib/types.ts](lib/types.ts). Records Sleeper does not provide (titles, punishment, weekly story) are typed data in [lib/league.ts](lib/league.ts) — edit that file to update them.

**Client/server split.** Server Components by default and all Sleeper fetching happens on the server. Add `"use client"` only for browser APIs or state (the profile sheet and its theme toggle, the mobile nav sheet, the active-link nav). Generated shadcn primitives under [components/ui/](components/ui/) — leave those as the CLI produced them.

**Supabase.** The local Supabase CLI stack is used for development; production is a hosted free-tier project. Schema changes happen only through migrations in `supabase/migrations`, never dashboard edits; run `bun run db:types` afterwards. Clients live in `lib/supabase/` and each returns `null` when its env vars are unset, so the app runs without Supabase (same idea as `LEAGUE_ID`). The root [proxy.ts](proxy.ts) (Next 16's renamed middleware) refreshes the auth session cookie on each request; it also gates the site: signed-out requests to non-public paths (`isPublicPath` in [lib/auth.ts](lib/auth.ts)) redirect to `/login?next=…` (sanitized by `safeNext`), and the gate is a no-op without Supabase env. `supabase/config.toml` auth settings (`site_url`, redirect URLs, password policy) apply to the local stack and `db push` does not sync them; after `supabase link`, sync them to the hosted project with `supabase config push` (review the diff first). SMTP credentials stay in the dashboard.

**Supporting modules.**

- [lib/nav.ts](lib/nav.ts): `navItems`, the single nav list used by `nav-links` (desktop at `lg`+, client, active state via `usePathname`) and `mobile-nav` (sheet below `lg`, client). Both are rendered by `site-header`.
- [lib/link-classes.ts](lib/link-classes.ts): shared link class strings (`navTextClass`, `navLinkClass(active)`, `brandLinkClass`). Reuse them instead of hand-copying link and focus-ring styles.
- [lib/theme.ts](lib/theme.ts): `THEME_STORAGE_KEY` and the inline `themeScript` injected in `<head>` by the layout; the theme toggle imports the key. Keep it free of server-only imports.
- [lib/supabase/](lib/supabase/): `env.ts` (`getSupabaseEnv()`, null when unset), `server.ts` (cookie-aware async `createClient()` for the server, `server-only`), `client.ts` (browser `createClient()` for client components), `admin.ts` (`createAdminClient()` with `SUPABASE_SECRET_KEY`; bypasses RLS, trusted server jobs only, `server-only`), `proxy.ts` (`updateSession()` used by the root proxy), `database.types.ts` (generated by `bun run db:types`; do not hand-edit once generated).
- [lib/format.ts](lib/format.ts): `formatRecord(wins, losses, ties)`, showing `W–L` or `W–L–T`.
- [lib/auth.ts](lib/auth.ts): shared auth types, `validate()` (sign-up: 8+ characters with a letter and a digit, matching `config.toml`), route constants and copy. Keep it free of `"use client"` and server-only imports. The actions (`authAction`, `signOutAction`) live in [lib/server/auth-actions.ts](lib/server/auth-actions.ts) (`"use server"`, branches on Supabase `error.code`); [lib/server/auth-session.ts](lib/server/auth-session.ts) has `getUserEmail()` and `getSessionProfile()` (via `getClaims()`).
- [components/auth/](components/auth/): the shared sign-in/sign-up form (`auth-form`, with its private `FormField` and `PasswordInput`), the profile sidebar `sign-in-link` (signed out) and sign-out form (signed in: email, display name, Sign out). Email, theme, and league id live in that sidebar (`components/profile-menu.tsx`), not inline in the header. The `/auth/error` body lives in the route file.
- [components/coming-soon.tsx](components/coming-soon.tsx): the placeholder body for stub routes; `app/not-found.tsx` mirrors its look.

**Placeholder and unavailable data.** `getHomeData()` returns a `HomeData` union discriminated on `source`: `"placeholder"` and `"sleeper"` carry `standings: StandingRow[]` and `totalTeams`; `"sleeper-unavailable"` carries `standings: null`. With no saved profile league id and `LEAGUE_ID` unset, it returns sample standings (`source: "placeholder"`; the home page shows a "Sample data" note). When a league id is resolved (profile, then the env fallback), rosters and users are fetched in parallel; a failure or a non-array response is logged with `console.error` and returns `"sleeper-unavailable"` (the page shows "Standings are unavailable right now."); live and placeholder rows are never mixed. Ranking lives in the pure `rankRosters()`: wins, then points for, then team name. The lead-story kicker week and season come from `weeklyStory` in [lib/league.ts](lib/league.ts), which is edited weekly with the headline; no live week is fetched.

## Styling

Tailwind v4 with **no `tailwind.config.js`** — the entire theme is `@theme inline` + CSS variables in [app/globals.css](app/globals.css). Token values come verbatim from the design handoff except `--faint`, darkened/lightened in both themes for WCAG AA (see the comments there); the extra blocks (font variable wiring, `gutter-*` utilities, `color-scheme`, logo text tokens) are ours.

- Horizontal page gutters come from the `gutter-x` (padding) and `gutter-mx` (margin) utilities in `globals.css` (16px, 24px at `sm`, 56px at `md`+). Use them on the header and every home/coming-soon section so left edges align; do not hand-write `px-*`/`mx-*` for page gutters.
- Fonts (an owner decision that replaces the handoff's font table): headings use **Barlow Condensed** 500/600/700 via `font-display`; all other text uses **Inter** (variable, with italic) via `font-sans`, the body default. Both are self-hosted latin-subset `.woff2` files in [app/fonts/](app/fonts/), loaded with `next/font/local` in `app/layout.tsx` (no network needed at build time). `font-mono` (rank labels, records) and `font-logo` are system stacks in `globals.css`. There is no serif face; do not use `font-serif`.
- Use the semantic palette tokens from `globals.css` (`bg-background`, `text-foreground`, `text-prose`, `text-muted-foreground`, `text-faint`, `border-border`, ...) rather than hex values. The token table is in the handoff README.
- `body` already paints `bg-background`. Don't re-apply it per section.
- Dark mode is class-based (`@custom-variant dark`): the `dark` class on `<html>`, toggled by a client component and persisted in `localStorage`.
- Every motion utility needs a `prefers-reduced-motion: reduce` branch.
- Merge classes with `cn()` from [lib/utils.ts](lib/utils.ts).

## Conventions

Code in this repo follows the conventions below (shared with the design handoff README).

- **Print width 80**, **no semicolons**, **double quotes**. Prettier enforces `printWidth: 80`, `semi: false`, and `singleQuote: false`.
- **Braces** on every `if`, `else`, `for`, `while`, and `do` (`curly: ["error", "all"]`). The opening brace stays on the same line. Single-line `if (x) return` is rewritten as a braced block.
- `interface` for object shapes. `type` for primitives, unions, intersections, tuples, and other non-object aliases (`@typescript-eslint/consistent-type-definitions`). No enums — use string unions or `as const`. Enums are a documented convention; there is no mechanical ban.
- Prefer `const` when a binding is never reassigned (`prefer-const`).
- React components: `const Name: FC<NameProps> = ({ ... }) => { ... }` with a named props `interface` (import `type FC` from `react`). Do not inline props types on the parameter; declare `children` on the interface when accepted. Pure helpers that do not return JSX stay as `function` declarations with explicit types.
- Leave generated shadcn files in `components/ui/` as the CLI produced them (apart from the `cn` import fix above). Prettier skips that folder, and so do `curly` and `consistent-type-definitions`. `lib/supabase/database.types.ts` is excluded from Prettier and from those two rules. `prefer-const` still applies to both, because `eslint-config-next/typescript` already enables it.
- Named exports for reusable UI; default export for page sections (`components/home/*.tsx`) and route files. Async Server Component routes stay `export default async function` — do not convert those to `FC`.
- `@/*` path alias maps to the repo root (`@/components`, `@/lib`).
- A screen used by one route stays in that route file. Do not add a component whose only caller is `return <ThatComponent />`. Extract when the UI is reused or the page composes several sections.
- Structured, repeatable records (titles, standings rows, the weekly story) are typed data in `lib/`. One-off section prose is written as JSX in the section component, not as string arrays in `lib/`.
- Keep changes minimal and match existing patterns before introducing abstractions.
- Do not install a new library to accomplish a feature without asking. Explore existing options first.

## Documentation (Context7)

Use the Context7 MCP (`context7`) whenever you need documentation for a library, framework, SDK, API, CLI, or cloud service — including Next.js, React, Tailwind, and shadcn. Prefer it over web search and over training memory. Do not use it for refactors, writing scripts from scratch, debugging business logic, code review, or general programming concepts.

1. Call `resolve-library-id` with the official library name and a specific query.
2. Call `query-docs` with the returned Context7 library ID (`/org/project`) and one focused topic per call.
3. Do not call either tool more than 3 times per question.

For Next.js App Router APIs in this repo, also read `node_modules/next/dist/docs/` — this version has breaking changes that Context7 may not match.
