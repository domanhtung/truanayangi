# Holiday trip meal planner — Design

## Goal

Add a holiday planning screen so the user can define an upcoming trip/holiday (date range + name), keep a list of dishes for that whole period (not assigned per day), and add dishes spun on the home page into the currently active trip.

## Decisions (confirmed)

| Topic | Choice |
| --- | --- |
| Planning unit | One trip = name + date range + dish list (no per-day assignment) |
| Trip source | Suggested Vietnamese holidays **and** custom trips |
| Adding dishes | Spin on home → “Add to open trip” |
| Dish actions | Minimal: remove from trip only |
| Persistence | Neon PostgreSQL (same stack as dish notebook) |

## Non-goals

- Day-by-day meal slots (breakfast/lunch/dinner)
- Marking cooked / excluding from future spins
- Multi-user auth or sharing
- Migrating old localStorage data

## User flows

### 1. Open holiday planner

- New nav item → `/ky-nghi`
- Shows month calendar + trip panel
- Highlights the active trip’s date range on the calendar
- If no active trip: prompt to create one or pick a suggestion

### 2. Create / select a trip

**Suggested holidays (examples, computed for the current year / next occurrence):**

- Tết Dương lịch (1/1)
- Giỗ Tổ Hùng Vương (approximate fixed civil date used by app list; note lunar holidays as “suggested window” the user can edit)
- 30/4–1/5
- Quốc khánh 2/9
- Optional short list only — user can always edit dates after selecting

**Custom trip:**

- Name (required)
- Start date + end date (required, end ≥ start)
- Optional target dish count (hint only, e.g. “mục tiêu 8 món” — not a hard lock)

**Active trip:**

- Exactly zero or one trip marked `is_active`
- Creating/selecting a trip can set it active
- Home page uses the active trip for “Add to open trip”

### 3. Add dish from home spin

- After a spin result is shown, if an active trip exists, show button **“Thêm vào kỳ nghỉ đang mở”**
- Adds a link from that dish to the active trip
- Duplicate add of the same dish in the same trip is ignored (idempotent)
- If no active trip: button hidden or replaced by short hint linking to `/ky-nghi`

### 4. Manage trip dishes

- List dishes on the trip (name, category, optional minutes)
- Action: remove dish from trip (does not delete the dish from the notebook)
- Optional display of progress vs target count when target is set

## Information architecture

```
/                     Home — spin reel + add-to-active-trip
/so-tay-mon-an        Dish notebook (existing)
/ky-nghi              Holiday trip planner (new)
```

Header nav gains **Kỳ nghỉ**.

## Data model (Neon)

### `holiday_trips`

| Column | Type | Notes |
| --- | --- | --- |
| id | TEXT PK | Client-generated id |
| name | TEXT NOT NULL | |
| start_date | DATE NOT NULL | |
| end_date | DATE NOT NULL | CHECK end_date >= start_date |
| target_dish_count | INTEGER NULL | Optional goal |
| is_active | BOOLEAN NOT NULL DEFAULT FALSE | At most one true (enforced in app upsert) |
| created_at / updated_at | TIMESTAMPTZ | |

### `holiday_trip_dishes`

| Column | Type | Notes |
| --- | --- | --- |
| trip_id | TEXT NOT NULL FK → holiday_trips ON DELETE CASCADE | |
| dish_id | TEXT NOT NULL FK → dishes ON DELETE CASCADE | |
| added_at | TIMESTAMPTZ NOT NULL DEFAULT NOW() | |
| PRIMARY KEY (trip_id, dish_id) | | Prevents duplicates |

Schema created via the same `ensure*Schema` pattern used for `dishes`.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/holiday-trips` | List trips (include dish counts; optional `?active=1`) |
| POST | `/api/holiday-trips` | Create or upsert trip |
| PATCH | `/api/holiday-trips/[id]` | Update fields / set active |
| DELETE | `/api/holiday-trips/[id]` | Delete trip |
| GET | `/api/holiday-trips/[id]/dishes` | List dishes for trip |
| POST | `/api/holiday-trips/[id]/dishes` | Body `{ dishId }` — add dish |
| DELETE | `/api/holiday-trips/[id]/dishes` | Body `{ dishId }` — remove dish |

Setting a trip active clears `is_active` on others in one transaction/sequence.

## UI outline (`/ky-nghi`)

One composition, matching existing warm-green brand:

1. **Header:** title “Kỳ nghỉ sắp tới” + short subtitle
2. **Calendar:** month grid; range of active/selected trip highlighted
3. **Trip panel:**
   - Active trip summary (name, dates, dish count / target)
   - Suggestions chips + “Tạo kỳ nghỉ mới”
   - List of trips (select / activate / delete)
4. **Dish list for selected trip:** rows with remove button
5. Empty states when no trips or no dishes

Home spin result dialog gains the add-to-trip control when `activeTrip` exists.

## Error handling

- API failures: Vietnamese status/alert messages (same tone as notebook)
- Add dish with no active trip: do not offer the button
- Invalid date range rejected client + server side

## Testing checklist

- Create custom trip; set active; see range on calendar
- Pick a suggested holiday; edit dates; save
- Spin on home; add dish to active trip; appears on `/ky-nghi`
- Add same dish twice → still one row
- Remove dish from trip; notebook dish remains
- Delete trip removes its dish links
- Switch active trip; home add targets the new one

## Out of scope for v1 follow-ups

- Lunar calendar accuracy for Tết Âm lịch beyond a static suggested window the user can edit
- Shared household accounts
- Printing / shopping list export
