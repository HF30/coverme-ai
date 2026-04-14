# CoverMe.ai — Product Brief

## Vision
AI-powered staff scheduling autopilot for multi-location restaurants. The owner never touches scheduling — CoverMe handles call-outs, swaps, staffing predictions, and compliance automatically. SMS-first interface via Twilio + mobile-optimized dashboard for the "golf course CEO."

## First Client
**Wingporium** — 6-location sports bar/wing chain across GTA/Hamilton, Ontario. Owner wants to run the business from the golf course. Currently uses PixelPoint POS (legacy) and group texts for team communication.

## Problem
- Call-out replacement takes managers 45-90 minutes of active effort (calling/texting one by one)
- No cross-location visibility — 6 stores with 100+ staff but each is a silo
- Event-driven demand (Leafs/Raptors/UFC) is staffed by gut feel
- Owner has no real-time view of staffing health across locations
- Scheduling dysfunction costs multi-location chains $400K-$1M/year (turnover, overtime, compliance risk, manager time)
- No existing tool auto-fills call-outs — all stop at "post open shift and hope"

## Target User
Multi-location restaurant owners (5-20 locations) who want to be hands-off on scheduling. Secondary: their managers who currently spend 6-12 hrs/week on scheduling.

## Tech Stack
- **Frontend**: Next.js (App Router), TypeScript, Tailwind CSS, PWA (mobile-first)
- **Backend**: Supabase (PostgreSQL + Edge Functions + Auth + Realtime)
- **SMS**: Twilio (owner interface + staff interaction)
- **AI**: Claude API (intent parsing, briefing generation, scheduling intelligence)
- **Hosting**: Vercel

## MVP Features (Priority Order)

### 1. Core Data Model & Auth
- Organizations (multi-tenant)
- Locations (multiple per org)
- Employees (belong to locations, can float between them)
- Roles (cook, server, bartender, host, manager)
- Shifts & schedules
- Qualifications & certifications (Smart Serve, food handler, etc.)
- Employee availability & preferences

### 2. Schedule Management Dashboard
- Mobile-first responsive dashboard (PWA)
- Weekly schedule view per location
- Drag-drop shift assignment
- Employee availability overlay
- Labor cost vs revenue display
- Cross-location staff view (the shared bench)
- Role-based access (owner sees all, manager sees their location)

### 3. Auto-Fill Call-Outs (THE MOAT)
- Employee texts "can't come in" to Twilio number (or detected in group chat)
- AI parses intent, identifies the shift
- System ranks eligible replacements across ALL locations:
  - Available (not scheduled)
  - Qualified (right role + certs)
  - Won't trigger overtime
  - Proximity to location
  - Historical reliability score
- Texts top 3 candidates simultaneously via SMS
- First "YES" wins — confirms both sides, updates schedule
- If nobody responds in 10 min, texts next batch
- If all exhausted, escalates to manager
- Owner only notified in daily briefing (unless escalation needed)

### 4. Event-Aware Staffing
- Integrates sports/entertainment calendars (NHL, NBA, NFL, MLB, UFC, concerts)
- Maps events to expected demand increase per location
- Auto-suggests adjusted headcount 2-4 weeks before event
- Owner/manager approves or adjusts via SMS or dashboard
- Learns from historical event-vs-actual-covers data over time

### 5. Daily Owner Briefing (SMS)
- 7 AM text to owner summarizing all locations
- Only surfaces what needs attention
- Includes: staffing health, open gaps, labor %, call-outs handled, upcoming events
- Supports natural language replies ("how did Hamilton do?" → AI responds with detail)
- End-of-day summary at 10 PM

### 6. Smart Alerts
- Real-time push/SMS for:
  - Coverage gaps (no replacement found)
  - No-show detected (employee didn't clock in)
  - Labor cost trending over threshold
  - Certification expiring within 30 days
  - Schedule published late
- Alert escalation chain: AI auto-resolves → manager → owner

### 7. Compliance Guardrails
- Ontario ESA: 30-min break after 5 hrs, OT after 44 hrs/week
- Blocks schedule publication if violations detected
- Smart Serve / food handler cert tracking per employee
- Prevents scheduling uncertified staff in restricted roles (bar, kitchen)
- Audit log for compliance reporting

## Integrations (Phase 2 — Not MVP)
- Square for Restaurants API (POS data for labor-vs-revenue)
- 7shifts import (migration path for existing users)
- Telegram Bot API (team chat monitoring)
- Google Business Profile (review alerts)
- QuickBooks/Xero (financial data)

## Out of Scope
- POS functionality (use Square/Lightspeed/existing)
- Payment processing
- Online ordering
- Kitchen display system
- Inventory management
- Accounting/bookkeeping

## Success Criteria
- Call-out auto-filled in < 5 minutes with zero manager involvement
- Owner checks phone once/day (morning briefing) and everything is handled
- 50% reduction in manager time spent on scheduling
- Zero ESA compliance violations
- Cross-location coverage utilized for 30%+ of call-outs

## Pricing Model
- Setup: $5,000
- Monthly: $299/location ($1,794/mo for Wingporium's 6 locations)
- ROI: pays for itself by preventing ONE bad month of overtime/turnover
