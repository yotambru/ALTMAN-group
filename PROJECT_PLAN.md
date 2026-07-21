# PROJECT_PLAN.md — ALTMAN Group

Mobile-first Hebrew RTL property-management prototype (Next.js + TS + Tailwind).
Four screens: login/role selection, manager, landlord, and tenant dashboards.

## Implementation phases

### Phase 0 — Foundation
- Scaffold Next.js 16 (App Router) + TypeScript strict + Tailwind v4 + ESLint.
- Initialize Git in the project root.
- Add `lucide-react`; load the **Assistant** Hebrew font via `next/font`.
- Set `<html dir="rtl" lang="he">` and page metadata.

### Phase 1 — Design system
- Centralized tokens in `globals.css` (`:root` + `@theme`): navy, orange, background,
  surface, text, muted, border, success, warning, card radii, shadows, spacing.
- `.app-shell` mobile canvas centered on large screens; ambient gradient backdrop.
- RTL-safe primitives, focus states, animations, scrollbar utilities.

### Phase 2 — Data & domain model
- Types: `User, Role, Property, Landlord, Tenant, Lease, Payment, MaintenanceTicket,
  Document (AppDocument), Notification (AppNotification)`.
- Mock data + typed selectors in `lib/mock-data.ts`.
- Utilities (`lib/utils.ts`) and SSR-safe `localStorage` wrapper (`lib/storage.ts`).

### Phase 3 — Shared components
- UI: `Button, Modal, FormField, StatusBadge, SectionHeader, Toast`.
- Brand: `Logo` (styled-text wordmark placeholder), `Cityscape`, `PropertyImage` (SVG).
- Dashboard: `BrandHeader, DashboardHero, MetricCard, ActionCard, PropertyCard
  (+ PropertyMiniCard), PaymentCard, MobileMenu, BottomNavigation`.

### Phase 4 — Screens
- **Login**: hero + logo, role selector (מנהל/משכיר/שוכר) with selected state, email/phone,
  password with show/hide, remember-me, orange CTA, forgot-password, security note; mock auth.
- **Manager**: navy header, summary metrics (82/35/48/12), current clients + detailed
  property card, big "הזנת לקוח חדש" CTA, 6 quick actions.
- **Landlord**: light header + bell, portfolio-value hero, active/expected metrics,
  rental-management list, property showcase, action grid, security footer.
- **Tenant**: navy hero, active property card, payments cards, action rows, bottom nav
  with notification badge.

### Phase 5 — Interactivity
- Role login & routing; mobile menu; tenant tab switching.
- Maintenance-ticket modal (persists to localStorage); mock chat panel.
- Document vault + digital-signature dialogs; add-client form (persists); toasts/badges.

### Phase 6 — Verification
- ESLint, `tsc --noEmit`, and production build all green.
- Browser QA at ~390×844 across all routes; RTL, spacing, hierarchy refinements.

## Completed items ✅

- [x] Scaffolding, Git init, dependencies, Assistant font, RTL document.
- [x] Centralized design-system tokens + mobile-canvas shell.
- [x] Domain types, mock data + selectors, utils, storage wrapper.
- [x] Full shared component library (UI / brand / dashboard).
- [x] Login + all three dashboards, matching the reference visual language.
- [x] Interactive flows: login, menu, tabs, ticket, chat, documents, signature, add-client,
      toasts, notification badges, localStorage persistence.
- [x] `npm run lint`, `npx tsc --noEmit`, and `npm run build` pass with no errors.
- [x] Verified all routes in-browser at iPhone viewport + desktop centering.

## Remaining production work 🚧

- [ ] Replace mock auth with real authentication + role-based authorization.
- [ ] Backend/API layer; replace mock-data selectors with real fetching.
- [ ] Persistent storage for tickets, documents, chat, notifications.
- [ ] File storage + real e-signature; annual-report generation.
- [ ] Real-time chat and push notifications; payments / rent collection.
- [ ] Swap the placeholder wordmark for the official ALTMAN Group logo asset.
- [ ] Automated tests (unit + e2e) and CI.
- [ ] PWA manifest / offline support and analytics.
```
