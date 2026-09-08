# ALTMAN Group — מערכת ניהול נכסים ושכירויות

A polished, mobile-first **Hebrew RTL** property-management web app / PWA for
ALTMAN Group. It ships four principal screens — login/role selection, and dashboards
for **manager**, **landlord**, and **tenant** — built with Next.js, TypeScript, and
Tailwind CSS.

> Domain data is stored in **Supabase** (Postgres + Storage + Realtime) so every
> device sees the same portfolio. Login is **Supabase Auth** with role-based RLS.

---

## Tech stack

- **Next.js 16** (App Router) + **React 19**
- **TypeScript** (strict mode)
- **Tailwind CSS v4** (CSS-first theme tokens)
- **lucide-react** for line icons
- **Assistant** Hebrew font via `next/font/google`
- **Supabase** for shared Postgres, file storage, and live updates
- **Supabase Auth** for login (JWT in the browser client; role comes from `app_users`)
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
3. In the SQL editor, run the migrations in order (`001_init.sql` … `010_auth_rls.sql`).
   In Auth settings, turn **off** “Allow new users to sign up” (accounts are
   created by the office / seed script).
4. Seed the demo portfolio **and** Auth users:

```bash
npm run seed
```

5. For production, add `NEXT_PUBLIC_SUPABASE_*` **and** `SUPABASE_SERVICE_ROLE_KEY`
   in Vercel (the service role is server-only: seed + `/api/auth/account`).

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

**Login:** seeded demo accounts (after `npm run seed`) use email or the short
username, and the seed password (`SEED_DEMO_PASSWORD`, default `Altman1234`):

| Role | Username | Email | Password |
| ---- | -------- | ----- | -------- |
| מנהל | `manager` | `avi@altmangroup.co.il` | seed password |
| עוזר מנהל | `assistant` | `noa@altmangroup.co.il` | seed password |
| משכיר | `landlord` | `daniel@example.com` | seed password |
| שוכר | `tenant` | `danny@example.com` | seed password |

New landlord/tenant accounts opened by the office use **כניסה פעם ראשונה** with
their email, then set a password (minimum 8 characters).

Dashboard URLs require a valid Auth session; unauthenticated visits redirect to `/`.

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
| iOS Bundle ID | `il.co.altmangroup.app` |
| Android package | `il.co.altmangroup.android` |
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

- Role-based login (Supabase Auth) with remember-me for the identifier only.
- Navigation between all dashboards; slide-in mobile menu with logout.
- Tenant bottom navigation switching Dashboard / Notifications / Profile.
- Maintenance-ticket modal that persists submitted tickets to Supabase.
- Chat panel synced live across devices.
- Document vault + digital-signature dialogs (files uploaded to Supabase Storage).
- Manager "add new client" form that appends to the shared portfolio.
- Notification badges, status badges, and toasts.

## Current limitations

- Offline edits are not queued; the native apps need a network connection.
- Property imagery uses local SVG placeholders when no photo was uploaded.
- No tests yet.
- Storage objects are private (signed URLs) but any authenticated user can
  currently read the `uploads` bucket; path-scoped storage policies are next.

## Recommended next phase

1. Path-scoped Storage policies (ID photos / leases only for the owning party).
2. Real e-signature integration for the document vault.
3. Push notifications.
4. Payments / rent collection.
```
