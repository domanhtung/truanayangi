# Holiday Trip Meals Implementation Plan

> **For agentic workers:** Implement task-by-task. Skip git commits unless the user asks.

**Goal:** Ship `/ky-nghi` holiday planner with Neon persistence and home “add to active trip” after spin.

**Architecture:** Neon tables `holiday_trips` + `holiday_trip_dishes`; REST under `/api/holiday-trips`; client page with month calendar + trip/dish panels; home dialog calls add-dish API when an active trip exists.

**Tech Stack:** Next.js App Router, `@neondatabase/serverless`, React client components, existing Button/Card UI.

## Global Constraints

- Vietnamese UI copy; English code comments only when needed
- Match existing warm-green look (`#253f30`, `#f5f5ed`, etc.)
- No per-day dish assignment; remove-from-trip only
- `.env` / secrets stay local

---

### Task 1: Schema + store + API

**Files:**
- Modify: `lib/db.ts`
- Create: `lib/holiday-types.ts`, `lib/holiday-store.ts`
- Create: `app/api/holiday-trips/route.ts`, `app/api/holiday-trips/[id]/route.ts`, `app/api/holiday-trips/[id]/dishes/route.ts`
- Modify: `scripts/init-db.mjs`

- [ ] Ensure holiday tables next to dishes schema
- [ ] CRUD trips + add/remove dishes + list active
- [ ] Init script creates tables

### Task 2: `/ky-nghi` UI + nav

**Files:**
- Create: `lib/holiday-suggestions.ts`, `lib/holiday-trips.ts` (client fetch helpers)
- Create: `app/ky-nghi/page.tsx`
- Modify: `app/site-header.tsx`

- [ ] Month calendar with range highlight
- [ ] Suggestions + create/select/activate/delete trip
- [ ] Dish list with remove
- [ ] Nav tab “Kỳ nghỉ”

### Task 3: Home add-to-trip

**Files:**
- Modify: `app/page.tsx`

- [ ] Load active trip
- [ ] On finished spin: button adds dish; show status

### Task 4: Verify

- [ ] `npx tsc --noEmit`
- [ ] `node scripts/init-db.mjs`
- [ ] Smoke API if server available
