# Trackly CRM

Trackly is a full-stack customer relationship management web app for tracking leads through a sales pipeline. It provides credential-based authentication, lead management with full CRUD, a drag-and-drop Kanban board, notes per lead, and a dashboard with live pipeline metrics — built for small sales teams to move deals from first contact to closed.

## Live Demo

https://trackly-crm-app.vercel.app

## Table of Contents

- Project Overview
- Tech Stack
- Features
- How to Run Locally
- Environment Variables
- Database Setup
- Test Login Credentials
- Known Limitations
- Reflection

## Project Overview

The app is built as a full-stack Next.js application using the App Router:

- Pages — Login, Dashboard, Leads list, Lead detail, and Kanban pipeline views
- API routes — Route handlers under src/app/api for auth, leads, notes, users, and dashboard stats
- Database — Supabase (Postgres) as the persistent data store
- Auth — NextAuth with email/password credentials and bcrypt-hashed passwords

## Tech Stack Used

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling/UI**: Tailwind CSS v4, Radix/shadcn-style components, `lucide-react`
- **Forms/Validation**: `react-hook-form`, `zod`
- **Authentication**: `next-auth`, `bcryptjs`
- **Database**: Supabase Postgres via `@supabase/supabase-js`
- **Drag and Drop**: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
- **Tooling**: ESLint, PostCSS, TypeScript

## Features Implemented

- Credential login and protected dashboard routes
- Dashboard KPIs (lead counts by status, pipeline value, won revenue)
- Leads list with:
  - Search by name/company/email
  - Filters by status/source/assigned salesperson
  - Quick status updates
  - Overdue lead indicators
- Lead CRUD:
  - Create new lead
  - Edit existing lead
  - Delete lead
- Lead detail page with note-taking
- Kanban-style pipeline board with drag-and-drop status updates
- Keyboard shortcut support for quick lead creation

## How to Run Locally

**Prerequisites**

Node.js 18+
A Supabase project (free tier works)

1. **Clone and enter the project**

```bash
git clone https://github.com/SyedaMushfia/trackly-crm-app.git
cd trackly-crm-app
```

2. **Install dependencies**

```bash
npm install
```

3. **Create local environment file**

```bash
cp .env.example .env.local
```

```powershell
Copy-Item .env.example .env.local
```

4. **Fill environment variables** in `.env.local`  — see the Environment Variables section below.

5. **Set up the database** — see the Database Setup section below.

6. **Start development server**

```bash
npm run dev
```

7. Open [http://localhost:3000] and log in with one of the test credentials.

## Environment Variables

  A `.env.example` file is committed to the repository with all required keys. Copy it to `.env.local` and fill in your values.

- `DATABASE_URL`  
  Postgres pooled connection string from Supabase.

- `DIRECT_URL`  
  Direct (non-pooled) Postgres connection string from Supabase

- `AUTH_SECRET`  
  Random secret used by NextAuth to sign and encrypt session tokens. Generate one with: `openssl rand -base64 32`

- `AUTH_URL`  
  Public base URL of the app (for local dev: `http://localhost:3000`).

- `NEXT_PUBLIC_SUPABASE_URL`  
  Your Supabase project URL

- `SUPABASE_SERVICE_ROLE_KEY`  
  Supabase service-role key used by server-side API routes.

## Database Setup

This project uses Supabase Postgres. Follow these steps to get your database ready:
  1. Create a Supabase project - Go to `supabase.com`, create a new project, and wait for it to provision.
  2. Run the table schema - Open the SQL Editor in your Supabase dashboard and run the following:

    ```sql 
      -- Enums
        CREATE TYPE lead_status AS ENUM (
          'NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'WON', 'LOST'
        );

        CREATE TYPE lead_source AS ENUM (
          'WEBSITE', 'LINKEDIN', 'REFERRAL', 'COLD_EMAIL', 'EVENT', 'OTHER'
        );

      -- Users table
        CREATE TABLE users (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

      -- Leads table
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
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

      -- Notes table
        CREATE TABLE notes (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          content TEXT NOT NULL,
          lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
          user_id TEXT NOT NULL REFERENCES users(id),
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

      -- Indexes for performance
        CREATE INDEX idx_leads_status ON leads(status);
        CREATE INDEX idx_leads_user_id ON leads(user_id);
        CREATE INDEX idx_leads_source ON leads(source);
        CREATE INDEX idx_notes_lead_id ON notes(lead_id);

      -- Auto-update updated_at on leads
        CREATE OR REPLACE FUNCTION update_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

      CREATE TRIGGER leads_updated_at
        BEFORE UPDATE ON leads
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();

      CREATE TRIGGER users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();```

  3. Seed test users- Run this in the SQL Editor to insert the five demo users with pre-hashed passwords:
  
      ```sql  
        INSERT INTO users (id, name, email, password) VALUES
        (gen_random_uuid()::text, 'Sarah Mitchell', 'sarah.mitchell@example.com', '$2b$12$IXe2zINZ6LmRDxSnhlM/Ru3AXvhV3gzLAoCWQOPBb/lCjOFLgEzN2'),
        
        (gen_random_uuid()::text, 'James Carter',   'james.carter@example.com',   '$2b$12$8fYigbg4hCqgKkTOQ03Ib.MX5eE9WCUfJPs9RsPkl7zH/LI0Tu5Mm'),
  
        (gen_random_uuid()::text, 'Priya Nair',     'priya.nair@example.com',     '$2b$12$PR9YVkB5JBo5fMm5sx5rAugo37YZOkOtdWPvS.edBgwVluy.M877a'),
  
        (gen_random_uuid()::text, 'Daniel Osei',    'daniel.osei@example.com',    '$2b$12$icZZYd729odi7Y6y9hht3ueMHBb.j4kFqnqROW2OoG7s0Ol043GQ2'),
        
        (gen_random_uuid()::text, 'Emily Zhang',    'emily.zhang@example.com',    '$2b$12$Fu9l.BlrhIR3aMMPLRrT4ONEAg9jzTmw999iFkl83llzO5maZn4ry');
    ```
  4. Copy your connection strings
      In Supabase go to Project Settings and get the Connection string:
  
      - Copy the pooled connection string → DATABASE_URL
      - Copy the direct connection string → DIRECT_URL
  
      In Project Settings → API:
  
      - Copy the Project URL → NEXT_PUBLIC_SUPABASE_URL
      - Copy the service_role key → SUPABASE_SERVICE_ROLE_KEY


## Test Login Credentials

  After seeding the database, use any of the following to log in:
  
  - sarah.mitchell@example.com      Sarah@2024!
  - james.carter@example.com        James@2024!
  - priya.nair@example.com          Priya@2024!
  - daniel.osei@example.com         Daniel@2024!
  - emily.zhang@example.com         Emily@2024!

## Known Limitations

- No automated test suite configured yet.
- Authorization is coarse-grained (authenticated users can access shared lead data).
- No pagination for large lead lists.
- Responsiveness — The app is optimised for desktop. 

## Reflection

Trackly has a solid foundation: clear separation between UI and API layers, end-to-end TypeScript types from the database through to the frontend, and consistent schema validation with Zod at every API boundary. The next major improvements should focus on maintainability and production readiness:

1. Make the layout responsive on smaller screens.
2. Introduce role-based access/ownership checks.
3. Add automated tests (unit, API, and end-to-end).
4. Introduce pagination on the leads list API.

