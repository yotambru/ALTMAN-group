# AGENTS.md — rules for coding agents working on ALTMAN Group

## Product purpose

ALTMAN Group is a mobile-first property-management platform for the Israeli real-estate
market. It serves three roles — **manager (מנהל)**, **landlord (משכיר)**, and
**tenant (שוכר)** — each with a dedicated dashboard. Domain data is shared via
**Supabase** (Postgres + Storage + Realtime). Login uses **Supabase Auth**; row-level
security scopes data by role. Keep UI decoupled from the data layer
(`src/lib/store.tsx` + `src/lib/supabase/*`).

## RTL & Hebrew requirements (non-negotiable)

- The entire UI is **Hebrew**. All user-facing copy must be natural, professional Hebrew.
- The document is **RTL** (`<html dir="rtl" lang="he">` in `app/layout.tsx`). Do not change this.
- Use **CSS logical properties** and Tailwind logical utilities (`ps-*`, `pe-*`, `ms-*`,
  `me-*`, `start-*`, `end-*`, `text-start`) — never hard-code left/right for layout that
  should mirror.
- Latin wordmarks/segments that must read LTR inside RTL (e.g. the logo, "ALTMAN Group")
  must set `dir="ltr"` locally.
- Verify icons, chevrons, menus, and sheets mirror correctly. Directional chevrons for
  "more" point **left** (`ChevronLeft`) in this RTL UI.
- Never introduce horizontal overflow or broken Hebrew line wrapping.

## Design-system rules

- All colors, radii, shadows, and surfaces come from tokens defined in
  `src/app/globals.css` (`:root` variables mapped via `@theme`). **Use the tokens**, e.g.
  `bg-navy`, `text-orange`, `bg-surface`, `text-text-muted`, `border-border`,
  `text-success`. Do not hard-code hex values in components.
- Brand palette (do not redesign): deep **navy** primary, bright **orange** accent,
  white / very-light-gray surfaces, rounded white cards, subtle borders & shadows,
  large dark-blue Hebrew headings, orange highlights/underlines/CTAs.
- On viewports below `lg` (1024px) the mobile canvas is centered via `.app-shell`
  (`max-width: 30rem; margin-inline: auto`). From `lg` up, `.app-shell` is full-width:
  dashboards use `DashboardFrame` (navy sidebar + scrolling main), and login becomes a
  split layout. Wrap each route's root in `app-shell` (or `DashboardFrame`, which includes it).

## Component conventions

- **No monolithic files.** Compose from the shared components in `components/ui`,
  `components/dashboard`, and `components/brand`. Feature flows live in `src/features/*`.
- Reusable building blocks (keep using these): `BrandHeader`, `MobileMenu`,
  `BottomNavigation`, `DesktopSidebar`, `DashboardFrame`, `DashboardHero`, `MetricCard`, `ActionCard`, `PropertyCard`,
  `PaymentCard`, `StatusBadge`, `SectionHeader`, `Modal`, `FormField`, `Button`, `Toast`.
- Client components need `"use client"`. Reading `localStorage` must go through
  `src/lib/storage.ts` and happen **after mount** (in an effect) to avoid hydration
  mismatches. Domain data is **not** in localStorage — it syncs through `useData()`
  / Supabase.
- Keep **seed data out of components** — put it in `src/lib/mock-data.ts` and expose
  typed selectors. Add/extend types in `src/types`. Persist new collections in
  `supabase/migrations` + `src/lib/supabase/mappers.ts`.
- Icons come from **lucide-react** only. Fonts come from `next/font` (Assistant).
- Accessibility: label controls, keep visible focus states, use semantic roles
  (`radiogroup`/`radio`, `dialog`, `aria-current`), and maintain good contrast.

## Current routes & roles

| Route       | Role       | Component                 |
| ----------- | ---------- | ------------------------- |
| `/`         | —          | `app/page.tsx` (login)    |
| `/manager`  | `manager`  | `app/manager/page.tsx`    |
| `/landlord` | `landlord` | `app/landlord/page.tsx`   |
| `/tenant`   | `tenant`   | `app/tenant/page.tsx`     |

Roles are typed in `src/types` (`Role = "manager" | "landlord" | "tenant"`).

## Rules future agents must follow

1. Preserve RTL + Hebrew everywhere; never ship English UI copy or LTR layout.
2. Use design tokens and existing components before creating new ones.
3. Keep data/types/persistence decoupled from UI; screens consume `useData()` only.
4. Do **not** add Firebase/payments/WhatsApp unless explicitly asked.
   Authentication is Supabase Auth (see `src/lib/auth.ts` + RLS in
   `supabase/migrations/010_auth_rls.sql`).
5. Before finishing any change, ensure all of these pass:
   - `npm run lint`
   - `npx tsc --noEmit`
   - `npm run build`
6. No console errors, no unused imports, no placeholder lorem ipsum, no giant files,
   and never embed the reference screenshots as UI.
7. Verify changes at an iPhone-sized viewport (~390×844) **and** a desktop viewport
   (~1280×800). Confirm the mobile canvas stays centered below `lg`, and the wide web
   layout (sidebar + multi-column home) is used from `lg` up.
