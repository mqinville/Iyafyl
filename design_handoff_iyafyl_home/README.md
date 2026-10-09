# Handoff: IYAFYL league site, home page

## Overview
Home page for **If Ya Ain't First, You're Last (IYAFYL)**, a 12-team full-PPR redraft fantasy football league that has run since 2019. The page answers two questions: what happened this week, and where does everyone stand. It also features the league's two titles: the **Fantasy Guru** (champion) and the **King Sh*t** (last place, who has to do a punishment).

The chosen direction is **3a (light)** and **3b (dark)** in `Iyafyl League Site.dc.html`. They share one layout and become the site's light and dark themes.

## About the design files
`Iyafyl League Site.dc.html` is a **design reference built in HTML**, not production code. Open it in a browser and scroll to section **3**. Sections 1 and 2 hold earlier explorations and should be ignored.

Rebuild the design in a **new repo** that uses the same stack and conventions as `mqinville/felix-portfolio2` (felixmainville.ca):

- Next.js 16 App Router, React 19, TypeScript
- Tailwind v4 with **no `tailwind.config`**. The theme is `@theme inline` plus CSS variables in `app/globals.css`.
- shadcn/ui, style `radix-vega`, `rsc: true`, icon library `lucide` (copy `components.json` from the portfolio as-is)
- `radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`, `@tabler/icons-react`
- Bun (`bun install`, `bun run dev`, `bunx shadcn@latest add <name>`)
- `cn()` in `lib/utils.ts`; the `@/*` alias points to the repo root

## Fidelity
**High fidelity.** Colors, type, spacing and copy structure are final. Team names, managers, records and the punishment are placeholder data that Sleeper will replace.

## Repo setup
```bash
bunx create-next-app@16 iyafyl --ts --app --tailwind --eslint --no-src-dir --import-alias "@/*" --use-bun
cd iyafyl
# copy components.json from felix-portfolio2, then:
bunx shadcn@latest add button separator badge tooltip hover-card scroll-area tabs
```
Replace `app/globals.css` with `globals.css` from this folder. Copy `CLAUDE.md` / `AGENTS.md` from the portfolio and edit the Architecture section for this site. The conventions below come from that file.

### Conventions (same as the portfolio)
- No semicolons, double quotes.
- `interface` for object shapes, `type` for unions. No enums.
- Components are written as `const Name: FC<NameProps> = ({ … }) => { … }` with a named props interface.
- Named exports for reusable UI. Default exports for page sections and route files.
- Server Components by default. Add `"use client"` only for browser APIs or state (the theme toggle, a sticky nav).
- Leave `components/ui/*` exactly as the shadcn CLI generates it. Prefer an existing shadcn primitive over hand-rolling one.
- Typed records go in `lib/`. Section prose stays in the component.
- Every motion utility needs a `prefers-reduced-motion: reduce` branch.

## Fonts (next/font/google in `app/layout.tsx`)
| Role | Font | CSS var → Tailwind |
|---|---|---|
| UI / body | Geist (300–700) | `--font-geist-sans` → `font-sans` |
| Numbers, labels | Geist Mono (400, 500) | `--font-geist-mono` → `font-mono` |
| Display headlines and names | Instrument Serif 400 (+ italic) | `--font-instrument-serif` → `font-display` |
| Section heads, team names, deck | Newsreader (opsz 6–72, 400–700, + italic) | `--font-newsreader` → `font-serif` |
| Logo only | IBM Plex Sans Condensed 700 | `--font-plex-condensed` → `font-logo` |

Put all five variables on `<html>` (the portfolio does the same for Geist). Drop Inter.

## Design tokens
All tokens are defined in `globals.css`. Use the semantic utilities, never raw hex values.

| Token (utility) | Light 3a | Dark 3b | Used for |
|---|---|---|---|
| `bg-background` | #f4f0e6 | #121110 | page |
| `text-foreground` | #17150f | #f1ede4 | headlines, active nav |
| `text-prose` | #3d382e | #c4bfb3 | deck and italic quotes |
| `text-muted-foreground` | #6b6558 | #a39d91 | nav links, meta lines |
| `text-faint` | #8b8474 | #6f6a61 | "No. 1" rank labels, placeholder text |
| `text-brand-text` | #b4501a | #ec8a43 | kicker, Guru label, links |
| `bg-brand` | #d9661f | #ec8a43 | the "yl" half of the logo |
| `border-rule-strong` | #17150f | #3a3732 | header bottom rule, table top rule |
| `border-rule-double` | #17150f | #5a554c | 3px double rule above the titles |
| `border-rule` | #cfc7b5 | #2c2a26 | vertical divider between titles, placeholder border |
| `border-rule-soft` | #ddd5c4 | #24221f | dividers between standings cells |

Light-mode King Sh*t label is `text-foreground`; dark-mode is `text-muted-foreground`. Radius: logo only, 5px (`rounded-[5px]`). No shadows anywhere, apart from the dark logo's 1px `ring-rule-strong`.

## Screen: Home (`app/page.tsx`)
The canvas is designed at 1280px wide. Use horizontal padding `px-14` (56px) on desktop. Content is not boxed in cards: the page is held together by hairline rules, like a newspaper.

### 1. Header (`components/site-header.tsx`)
- Flex row, `justify-between items-center`, `px-14 py-[22px]`, `border-b border-rule-strong`.
- **Logo** `<Link href="/">`: two adjacent spans, `font-logo font-bold text-[25px] leading-none`, no letter-spacing.
  - "Iyaf": `bg-logo-ink text-white pt-1.5 pb-[5px] pl-2.5 pr-1.5 rounded-l-[5px]`
  - "yl": `bg-brand text-[#111] pt-1.5 pb-[5px] pl-1.5 pr-2.5 rounded-r-[5px]`
  - In dark mode, wrap both in `rounded-[5px] ring-1 ring-rule-strong`.
- **Nav**: flex `gap-[30px] text-[13px] text-muted-foreground`. Active item: `text-foreground font-semibold`. Hover: `hover:opacity-80` (same as the portfolio).
  Items: Home · Standings · Teams · Matchups · Trade Calculator · Rankings · Hall of Fame. Only Home exists for now. Link the rest to their routes and stub them.
- Below `md`, collapse the nav into a shadcn `Sheet` or `Drawer` (`vaul` is already in the portfolio) behind a lucide `Menu` button.

### 2. Lead story
- Centered column, `pt-20 pb-16 px-14`, `flex flex-col items-center text-center gap-[22px]`.
- Kicker: "Week 6 · 2026". `text-[11px] font-semibold tracking-[0.24em] uppercase text-brand-text`.
- H1: `font-display font-normal text-[88px] leading-none tracking-[-0.015em] max-w-[980px] text-balance`. Copy example: "Felix stays perfect. Connor is still looking for a win."
  Responsive: `text-5xl sm:text-7xl lg:text-[88px]`.
- Deck: `font-serif text-xl leading-normal max-w-[600px] text-prose text-pretty`. Example: "The 5–0 team plays the 0–5 team on Sunday."

### 3. Titles strip (Guru / King Sh*t)
- `mx-14 grid grid-cols-2 border-t-[3px] border-double border-t-rule-double border-b border-b-rule-strong`. Stack to one column below `md`.
- **Left, Fantasy Guru**: `py-9 pr-10 border-r border-rule grid grid-cols-[140px_1fr] gap-7 items-center`.
  - Trophy slot: `h-[180px] border border-rule placeholder-stripes`, centered mono 10px `text-faint` "3D trophy". The 3D render will replace this later; see Assets.
  - Text: `flex flex-col gap-2`
    - Label "Fantasy Guru": `text-[10px] font-semibold tracking-[0.22em] uppercase text-brand-text`
    - Name "Dre": `font-display text-5xl leading-none`
    - Meta "Lamb Chops · defending champion": `text-[13px] text-muted-foreground`
- **Right, King Sh*t**: `py-9 pl-10 flex flex-col justify-center gap-2`
  - Label "King Sh*t": same style as the Guru label, with the colour noted under Tokens.
  - Name "Connor": `font-display text-5xl leading-none`
  - Punishment line: `font-serif italic text-lg text-prose`. Example: "Next one works a full shift at Waffle House."

### 4. Top of the table
- `mx-14 mb-14 pt-7`
- Header row: `flex justify-between items-baseline mb-2.5`
  - H3 "Top of the table": `font-serif font-semibold text-2xl`
  - Link "All 12 teams →" to `/standings`: `text-xs font-semibold text-brand-text`
- Grid: `grid grid-cols-6 border-t border-rule-strong`. Below `lg` use `grid-cols-3`; below `sm` use `grid-cols-2`.
- Each cell: `px-4 pt-4 pb-1 flex flex-col gap-1.5 border-r border-rule-soft`
  - "No. {rank}": `font-mono text-[11px] text-faint`
  - Team name: `font-serif text-lg font-semibold leading-[1.15]`
  - "{manager} · {record}": `text-xs text-muted-foreground`, with the record wrapped in `font-mono text-foreground`
- Show the top 6 teams (the playoff spots). Order by wins, then points for.

## Interactions and behavior
- **Theme**: class-based `.dark` on `<html>`. Add a small `"use client"` toggle in the header (lucide `Sun`/`Moon`, shadcn `Button variant="ghost" size="icon"`). Store the choice in localStorage and default to `prefers-color-scheme`. Set the class before paint with an inline script in `<head>` to avoid a flash. `next-themes` would make this easier, but it is a new dependency, so ask before adding it.
- Links: `hover:opacity-80`, `transition-opacity`. Focus: `focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring` (the portfolio pattern).
- No other motion on this page.

## Data
There is no backend. Pull everything from the **Sleeper public API** in Server Components using `fetch(…, { next: { revalidate: 300 } })`.
- `GET https://api.sleeper.app/v1/league/{LEAGUE_ID}`: season and current week (`settings.leg`)
- `GET …/league/{LEAGUE_ID}/rosters`: wins, losses, `fpts` + `fpts_decimal`
- `GET …/league/{LEAGUE_ID}/users`: `display_name`, `metadata.team_name`
- `GET https://api.sleeper.app/v1/state/nfl`: current week fallback

Put the fetchers in `lib/server/sleeper.ts` (`import "server-only"`) with typed interfaces in `lib/types.ts`. Put the parts Sleeper doesn't know about in `lib/league.ts` as typed constants: the reigning Guru and King Sh*t, the season's punishment, and the weekly headline and deck. This follows the portfolio's "records in `lib/`" pattern. `LEAGUE_ID` goes in `.env.local`.

Suggested types:
```ts
interface StandingRow { rank: number; teamName: string; manager: string; wins: number; losses: number; pointsFor: number }
interface LeagueTitles { guru: { manager: string; team: string; note: string }; kingShit: { manager: string; punishment: string } }
interface WeeklyStory { week: number; season: number; headline: string; deck: string }
```

## shadcn primitives to use
- `Separator` for the vertical divider between the two titles, if you'd rather not use a border
- `Button` (`variant="ghost"`/`"link"`) for the theme toggle and the "All 12 teams" link (`asChild` around `Link`)
- `Tooltip` / `HoverCard` for hovering a team cell to show PF and streak (optional, not in the mock)
- `Sheet` or `Drawer` for the mobile nav

Do not wrap sections in `Card`. The design relies on rules, not boxes.

## Suggested file map
```
app/layout.tsx            fonts, <html> classes, theme script
app/page.tsx              thin: fetch data, render sections
components/site-header.tsx
components/theme-toggle.tsx   ("use client")
components/home/lead-story.tsx
components/home/titles-strip.tsx
components/home/top-of-table.tsx
lib/league.ts  lib/types.ts  lib/server/sleeper.ts  lib/utils.ts
```

## Assets
- **3D trophy**: the slot is a placeholder. The plan is a rotating render of the league's printed trophy. Later it can follow the portfolio's three.js pattern (`components/custom/three-keyboard.tsx`: lazy client component with a static fallback). For now, ship the striped placeholder or a still image.
- No other imagery. The logo is pure type.

## Files
- `Iyafyl League Site.dc.html`: the design reference. Section 3 is final: **3a** is light, **3b** is dark.
- `globals.css`: the Tailwind v4 theme with both palettes, ready to drop into `app/globals.css`.
