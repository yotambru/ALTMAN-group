# ALTMAN Group — מערכת ניהול נכסים ושכירויות

A polished, mobile-first **Hebrew RTL** property-management web app / PWA for
ALTMAN Group. It ships four principal screens — login/role selection, and dashboards
for **manager**, **landlord**, and **tenant** — built with Next.js, TypeScript, and
Tailwind CSS.

> Domain data is stored in **Supabase** (Postgres + Storage + Realtime) so every
> device sees the same portfolio. Login is still demo credentials (`manager` / `1234`).

---

## Tech stack

- **Next.js 16** (App Router) + **React 19**
- **TypeScript** (strict mode)
- **Tailwind CSS v4** (CSS-first theme tokens)
- **lucide-react** for line icons
- **Assistant** Hebrew font via `next/font/google`
- **Supabase** for shared Postgres, file storage, and live updates
- Demo login session in `localStorage` (`src/lib/storage.ts`)
- **ESLint** (+ TypeScript) for validation

## Getting started

```bash
npm install          # install dependencies
cp .env.example .env.local   # then paste your Supabase keys
npm run dev          # start the dev server (http://localhost:3000)
```

Without Supabase keys the UI still runs on in-memory seed data (refresh resets it).

### Supabase setup

1. Create a free project at [supabase.com](https://supabase.com) — region **Frankfurt (eu-central-1)**.
2. Copy Project URL + `anon` key into `.env.local` (see `.env.example`).
   Add the `service_role` key too (seed script only — never ship it to the browser).
3. In the SQL editor, run [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql), then later migrations if the project already existed (`002_user_password.sql`, `003_lease_rent_history.sql`, `004_property_photos.sql`).
4. Seed the demo portfolio:

```bash
npm run seed
```

5. For production, add the same `NEXT_PUBLIC_SUPABASE_*` variables in Vercel.

Other commands:

```bash
npm run build        # production build
npm run start        # serve the production build
npm run lint         # run ESLint
npx tsc --noEmit     # TypeScript type-check
npm run seed         # push mock-data.ts into Supabase
```

> Note: if `next dev` fails to enumerate network interfaces in a restricted
> sandbox, run it bound to localhost: `npm run dev -- --hostname 127.0.0.1`.

## Routes

| Route        | Screen                              | Role       |
| ------------ | ----------------------------------- | ---------- |
| `/`            | Login & role selection              | —          |
| `/privacy`     | Privacy policy (for store listings) | —          |
| `/manager`     | Manager dashboard (דשבורד מנהל)     | `manager`  |
| `/landlord`    | Landlord dashboard (דשבורד משכיר)   | `landlord` |
| `/tenant`      | Tenant dashboard (דשבורד שוכר)      | `tenant`   |
| `/professional`| Professional dashboard              | `professional` |

**Mock login:** pick a role, then sign in with that role's username and password `1234`:

| Role | Username | Password |
| ---- | -------- | -------- |
| מנהל | `manager` | `1234` |
| עוזר מנהל | `assistant` | `1234` |
| משכיר | `landlord` | `1234` |
| שוכר | `tenant` | `1234` |
| בעל מקצוע | `professional` | `1234` |

Dashboard URLs require a valid session; unauthenticated visits redirect to `/`.

## Native apps (Capacitor)

The same web app is wrapped for **iOS** and **Android** with Capacitor. The native
shell loads production at `https://altman-group.vercel.app`.

Requires **Node 22+** (see `.nvmrc`).

```bash
nvm use                 # Node 22
npm install
npm run cap:sync        # sync www + plugins into ios/ and android/
npm run cap:ios         # open Xcode
npm run cap:android     # open Android Studio
```

| Item | Value |
| ---- | ----- |
| App ID | `il.co.altmangroup.app` |
| App name | ALTMAN Group |
| Privacy policy | https://altman-group.vercel.app/privacy |

Store account setup and submission steps: [`docs/STORE_ACCOUNTS.md`](docs/STORE_ACCOUNTS.md), [`docs/STORE_SUBMIT.md`](docs/STORE_SUBMIT.md).

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
├── lib/                     # store, supabase, mock-data, utils, storage, useSession
└── types/                   # domain types (User, Property, Lease, …)
```

**Separation of concerns**

- **Seed data** lives in `src/lib/mock-data.ts`, loaded into Supabase via `npm run seed`.
- **Domain types** live in `src/types` and are backend-agnostic.
- **Shared persistence** goes through `src/lib/store.tsx` → `src/lib/supabase/`.
- **Session / remember-me** stay in the SSR-safe wrapper `src/lib/storage.ts`.
- **Design tokens** are centralized as CSS variables + Tailwind theme in `globals.css`.

## Implemented prototype behavior

- Role selection with a clear selected state, mock login, remember-me (localStorage).
- Navigation between all dashboards; slide-in mobile menu with logout.
- Tenant bottom navigation switching Dashboard / Notifications / Profile.
- Maintenance-ticket modal that persists submitted tickets to Supabase.
- Chat panel synced live across devices.
- Document vault + digital-signature dialogs (files uploaded to Supabase Storage).
- Manager "add new client" form that appends to the shared portfolio.
- Notification badges, status badges, and toasts.

## Current limitations

- Mock authentication only — no real auth, sessions, or authorization.
- RLS is open to the anon key (same trust model as the public demo login).
- Existing per-browser `localStorage` data is not migrated.
- Offline edits are not queued; the native apps need a network connection.
- Property imagery uses local SVG placeholders, not real photos.
- No tests yet.

## Recommended next phase

1. Real authentication & role-based RLS (replace demo `useSession` / `auth.ts`).
2. Tighten Storage to private buckets + signed URLs.
3. Real e-signature integration for the document vault.
4. Push notifications.
5. Payments / rent collection.
```
