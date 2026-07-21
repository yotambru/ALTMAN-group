# ALTMAN Group — מערכת ניהול נכסים ושכירויות

A polished, mobile-first **Hebrew RTL** property-management web app / PWA prototype for
ALTMAN Group. It ships four principal screens — login/role selection, and dashboards
for **manager**, **landlord**, and **tenant** — built with Next.js, TypeScript, and
Tailwind CSS.

> This is a **frontend prototype** with local mock data and mock authentication.
> No backend, payments, or third-party services are wired up yet. The architecture is
> structured so a real API can be connected cleanly later.

---

## Tech stack

- **Next.js 16** (App Router) + **React 19**
- **TypeScript** (strict mode)
- **Tailwind CSS v4** (CSS-first theme tokens)
- **lucide-react** for line icons
- **Assistant** Hebrew font via `next/font/google`
- Local mock data + `localStorage` for lightweight persistence
- **ESLint** (+ TypeScript) for validation

## Getting started

```bash
npm install          # install dependencies
npm run dev          # start the dev server (http://localhost:3000)
```

Other commands:

```bash
npm run build        # production build
npm run start        # serve the production build
npm run lint         # run ESLint
npx tsc --noEmit     # TypeScript type-check
```

> Note: if `next dev` fails to enumerate network interfaces in a restricted
> sandbox, run it bound to localhost: `npm run dev -- --hostname 127.0.0.1`.

## Routes

| Route        | Screen                              | Role       |
| ------------ | ----------------------------------- | ---------- |
| `/`          | Login & role selection              | —          |
| `/manager`   | Manager dashboard (דשבורד מנהל)     | `manager`  |
| `/landlord`  | Landlord dashboard (דשבורד משכיר)   | `landlord` |
| `/tenant`    | Tenant dashboard (דשבורד שוכר)      | `tenant`   |

**Mock login:** pick a role, enter any email/phone (≥3 chars) and password (≥4 chars),
then press **כניסה**. You'll be routed to the matching dashboard. Visiting a dashboard
URL directly also works (it falls back to that role for demo purposes).

## Project architecture

```
src/
├── app/                     # App Router routes
│   ├── layout.tsx           # RTL <html>, Assistant font, metadata
│   ├── globals.css          # design tokens (@theme) + primitives
│   ├── page.tsx             # login / role selection
│   ├── manager/page.tsx
│   ├── landlord/page.tsx
│   └── tenant/page.tsx
├── components/
│   ├── brand/               # Logo, Cityscape, PropertyImage (SVG placeholders)
│   ├── ui/                  # Button, Modal, FormField, StatusBadge, SectionHeader, Toast
│   └── dashboard/           # BrandHeader, DashboardHero, MetricCard, ActionCard,
│                            #   PropertyCard, PaymentCard, MobileMenu, BottomNavigation
├── features/                # feature-scoped flows
│   ├── auth/RoleSelector
│   ├── maintenance/TicketModal
│   ├── chat/ChatPanel
│   ├── notifications/NotificationsPanel
│   ├── documents/{DocumentsDialog, SignatureDialog}
│   └── manager/AddClientModal
├── lib/                     # mock-data, utils, storage, useSession
└── types/                   # domain types (User, Property, Lease, …)
```

**Separation of concerns**

- **Mock data** lives in `src/lib/mock-data.ts`, decoupled from UI.
- **Domain types** live in `src/types` and are backend-agnostic.
- **Persistence** goes through the SSR-safe wrapper in `src/lib/storage.ts`.
- **Design tokens** are centralized as CSS variables + Tailwind theme in `globals.css`.

## Implemented prototype behavior

- Role selection with a clear selected state, mock login, remember-me (localStorage).
- Navigation between all dashboards; slide-in mobile menu with logout.
- Tenant bottom navigation switching Dashboard / Notifications / Profile.
- Maintenance-ticket modal that persists submitted tickets to localStorage.
- Mock chat panel with simulated replies.
- Document vault + digital-signature dialogs.
- Manager "add new client" form that appends to the clients list (localStorage).
- Notification badges, status badges, and toasts.

## Current limitations

- Mock authentication only — no real auth, sessions, or authorization.
- Data is static/local; changes are not shared across devices or users.
- Property imagery uses local SVG placeholders, not real photos.
- The ALTMAN Group wordmark is a styled-text placeholder (see `components/brand/Logo.tsx`)
  intended to be swapped for the official SVG/PNG.
- No tests yet.

## Recommended backend phase

1. Introduce an API layer (REST/GraphQL) and replace `src/lib/mock-data.ts`
   selectors with data fetching (Server Components / route handlers).
2. Real authentication & role-based authorization (replace `useSession`/`storage`).
3. Persistent storage for tickets, documents, chat, and notifications.
4. File storage + real e-signature integration for the document vault.
5. Real-time chat and push notifications.
6. Payments / rent collection and annual-report generation.
```
