# AGENTS.md — rules for coding agents working on ALTMAN Group

## Product purpose

ALTMAN Group is a mobile-first property-management platform for the Israeli real-estate
market. It serves three roles — **manager (מנהל)**, **landlord (משכיר)**, and
**tenant (שוכר)** — each with a dedicated dashboard. The current codebase is a
high-quality **frontend prototype** with mock data; it is structured for a real backend
to be added later. Keep that separation intact.

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
- The mobile canvas is centered on large screens via the `.app-shell` class
  (`max-width: 30rem; margin-inline: auto`). Wrap each route's root in `app-shell`.

## Component conventions

- **No monolithic files.** Compose from the shared components in `components/ui`,
  `components/dashboard`, and `components/brand`. Feature flows live in `src/features/*`.
- Reusable building blocks (keep using these): `BrandHeader`, `MobileMenu`,
  `BottomNavigation`, `DashboardHero`, `MetricCard`, `ActionCard`, `PropertyCard`,
  `PaymentCard`, `StatusBadge`, `SectionHeader`, `Modal`, `FormField`, `Button`, `Toast`.
- Client components need `"use client"`. Reading `localStorage` must go through
  `src/lib/storage.ts` and happen **after mount** (in an effect) to avoid hydration
  mismatches.
- Keep **mock data out of components** — put it in `src/lib/mock-data.ts` and expose
  typed selectors. Add/extend types in `src/types`.
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
3. Keep data/types/persistence decoupled from UI so a backend swaps in cleanly.
4. Do **not** add Supabase/Firebase/payments/WhatsApp/real-auth unless explicitly asked.
5. Before finishing any change, ensure all of these pass:
   - `npm run lint`
   - `npx tsc --noEmit`
   - `npm run build`
6. No console errors, no unused imports, no placeholder lorem ipsum, no giant files,
   and never embed the reference screenshots as UI.
7. Verify changes at an iPhone-sized viewport (~390×844) and confirm the desktop
   layout keeps the mobile canvas centered.
