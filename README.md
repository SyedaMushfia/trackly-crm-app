# Trackly CRM

Trackly is a full-stack customer relationship management application built with Next.js App Router, Supabase, and NextAuth. It supports manager and salesperson workflows with lead management, tasks, notes, messaging, pipeline staging, team metrics, export, and admin audit logging.

## Table of Contents

- Project Overview
- Tech Stack
- Features
- Getting Started
- Environment Variables
- Database Schema
- Routes & Access Control
- Demo Credentials
- Helpful Scripts
- Notes

## Project Overview

Trackly is designed for small sales teams. The app includes:

- Credential-based authentication with active account checks.
- Role-aware dashboards for managers and salespeople.
- Lead CRUD, notes, messages, reassignments, and status updates.
- Sales pipeline drag-and-drop board.
- Task management and notifications.
- Team performance analytics and export.
- Admin audit log and user management.
- Settings page with profile, password, avatar, and demo-data reset.

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- NextAuth (credentials)
- Supabase Postgres via `@supabase/supabase-js`
- `react-hook-form`, `zod`
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
- `recharts`, `react-simple-maps`, `react-select`
- `react-hot-toast`, `lucide-react`

## Features

- Login page with email/password credentials, session management, and deactivation handling.
- Manager dashboard with KPIs, revenue charts, geographic lead map, and leaderboard.
- Salesperson dashboard with personal pipeline and task overviews.
- Leads list with filtering, inline status updates, and CSV export.
- Lead detail page with notes, threaded messages, tasks, and lead metadata.
- Pipeline board for drag-and-drop lead staging.
- Task page for task creation, completion, and editing.
- Team page for manager performance tracking and export.
- Admin audit log and user management.
- Settings page for profile updates, password changes, avatar upload, and demo refresh.

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase project

### Install

```bash
git clone https://github.com/SyedaMushfia/trackly-crm-app.git
cd trackly-crm-app
npm install
```

### Configure

Copy `.env.example` to `.env.local` and fill in your values.

```bash
cp .env.example .env.local
```

### Run

```bash
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

Required variables in `.env.local`:

- `DATABASE_URL` — Supabase pooled Postgres URL.
- `DIRECT_URL` — Supabase direct Postgres URL.
- `AUTH_SECRET` — secret used by NextAuth.
- `AUTH_URL` — app base URL (for local dev: `http://localhost:3000`).
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service-role key.

## Database Schema

The app uses the following core schema.

```sql
CREATE TYPE lead_status AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'WON', 'LOST');
CREATE TYPE lead_source AS ENUM ('WEBSITE', 'LINKEDIN', 'REFERRAL', 'COLD_EMAIL', 'EVENT', 'OTHER');
CREATE TYPE task_type AS ENUM ('call', 'email', 'follow_up', 'meeting', 'send_proposal', 'linkedin_outreach', 'internal', 'custom');
CREATE TYPE action_type AS ENUM ('lead_created', 'lead_edited', 'lead_deleted', 'lead_reassigned', 'status_changed', 'note_added', 'task_completed', 'manager_message', 'manager_reply', 'user_created', 'user_deactivated', 'user_reactivated', 'password_reset');
CREATE TYPE message_type AS ENUM ('manager_message', 'manager_reply');
CREATE TYPE notification_type AS ENUM ('manager_message', 'manager_reply', 'task_due_today', 'follow_up_due');

CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE leads (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  source lead_source NOT NULL,
  status lead_status NOT NULL DEFAULT 'NEW',
  deal_value NUMERIC NOT NULL DEFAULT 0,
  user_id TEXT NOT NULL REFERENCES users(id),
  country TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  content TEXT NOT NULL,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  type task_type NOT NULL,
  due_date DATE NOT NULL,
  lead_id TEXT NOT NULL REFERENCES leads(id),
  created_by TEXT NOT NULL REFERENCES users(id),
  assigned_to TEXT NOT NULL REFERENCES users(id),
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id),
  message TEXT NOT NULL,
  type message_type NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id),
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE activities (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id),
  action_type action_type NOT NULL,
  description TEXT NOT NULL,
  lead_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Routes & Access Control

- `/login` — public login page.
- `/dashboard` — authenticated landing page.
- `/dashboard/leads` — lead list and export.
- `/dashboard/leads/[id]` — lead detail workspace.
- `/dashboard/pipeline` — salesperson-only pipeline board.
- `/dashboard/tasks` — salesperson-only task list.
- `/dashboard/team` — manager-only team performance.
- `/dashboard/admin/audit-log` — manager-only audit log.
- `/dashboard/admin/users` — manager-only user management.
- `/dashboard/settings` — profile, password, avatar, and demo-data controls.

Route protection is implemented via `src/proxy.ts` and `src/lib/auth.ts`.

## Architecture Overview

- `src/lib/auth.ts` manages NextAuth credentials, JWT sessions, and active-user revalidation.
- `src/types/next-auth.d.ts` extends NextAuth session/JWT types with `role`, `avatarUrl`, and `activeCheckedAt`.
- `src/proxy.ts` is middleware that redirects unauthenticated users, prevents logged-in users from `/login`, and enforces manager-only routes.
- `src/app/dashboard/page.tsx` renders either the manager or salesperson dashboard based on role.
- `src/app/dashboard/leads/page.tsx` is the shared lead list with CSV export.
- `src/app/dashboard/leads/[id]/page.tsx` provides lead detail, notes, message thread, and task section.
- `src/app/dashboard/pipeline/page.tsx` and `src/app/dashboard/tasks/page.tsx` are salesperson-only experiences.
- `src/app/dashboard/team/page.tsx` and `src/app/dashboard/admin/*` pages are manager-only.

## Demo Credentials

- Admin: `admin@example.com` / `password123`
- Salesperson: `alice@example.com` / `Alice@2026!`
- Salesperson: `john@example.com` / `John@2026!`
- Salesperson: `sarah@example.com` / `Sarah@2026!`
- Salesperson: `michael@example.com` / `Michael@2026!`
- Salesperson: `david@example.com` / `David@2026!`
- Salesperson: `emma@example.com` / `Emma@2026!`
- Salesperson: `daniel@example.com` / `Daniel@2026!`
- Salesperson: `olivia@example.com` / `Olivia@2026!`
- Salesperson: `james@example.com` / `James@2026!`
- Salesperson: `sophia@example.com` / `Sophia@2026!`

## Helpful Scripts

- `npm run dev` — start development server.
- `npm run build` — build production output.
- `npm run start` — run production server.
- `npm run lint` — run ESLint.
- `npm run db:types` — generate Supabase TypeScript types.

## Notes

- Supabase is instantiated in `src/lib/supabase.ts` using the public URL and service-role key.
- Auth uses NextAuth credentials and stores role/active state in JWT session tokens.
- The app includes a custom `src/components/ui` component layer and theme support.
- CSV export helpers live in `src/lib/csv.ts`.
- Settings page supports avatar upload, password changes, and demo data refresh.
