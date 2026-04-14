# CoverMe.ai

AI-powered staff scheduling autopilot for multi-location restaurants. Handles callouts, shift coverage, and SMS-based communication automatically.

## Tech Stack
- **Frontend**: Next.js 15+ (App Router), TypeScript (strict), Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **SMS**: Twilio (Phase 3)
- **AI**: TBD (Phase 4)
- **PWA**: Mobile-first installable app

## Quick Start
```bash
npm install
cp .env.local.example .env.local
# Fill in Supabase credentials in .env.local
npm run dev
```

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

## Database
- Migrations: `supabase/migrations/`
- Seed data: `supabase/seed.sql` (Wingporium -- 6 GTA locations, 20 employees)
- Apply migrations: `psql "$DATABASE_URL" -f supabase/migrations/<file>.sql`
- After schema changes: regenerate types with `npx supabase gen types typescript --project-id <ref> > src/types/database.ts`

## Conventions
- Server Components by default; Client Components only when needed (forms, interactivity)
- All timestamps stored in UTC, displayed in America/Toronto
- Phone numbers in E.164 format (+1XXXXXXXXXX)
- RLS on all tables -- `auth.organization_id()` extracts org from JWT
- User roles in app_metadata: `owner`, `manager`, `employee`

## Project Structure
```
src/
  app/              # Next.js App Router pages
    (auth)/login/   # Auth pages (no dashboard nav)
    dashboard/      # Protected pages (with nav)
  components/ui/    # Shared UI components
  hooks/            # Custom React hooks
  lib/supabase/     # Supabase client (browser + server + middleware)
  types/            # TypeScript types (database.ts)
supabase/
  migrations/       # SQL migration files
  seed.sql          # Dev seed data
```

## Key Tables
- `organizations` -- multi-tenant root
- `locations` -- physical restaurant locations
- `employees` -- staff (may or may not have auth login)
- `roles` / `employee_roles` -- role qualifications per location
- `shifts` / `schedules` -- shift scheduling
- `callouts` -- call-out tracking and auto-fill status
- `sms_conversations` -- Twilio message log

## Test Commands
```bash
npm run lint
npm run build
```

## Never Do
- Use `any` in TypeScript
- Hardcode timezone (use America/Toronto from org settings)
- Skip RLS policies on new tables
- Store secrets in code (use env vars)
