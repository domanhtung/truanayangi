import type { HolidayTrip, HolidayTripDish } from "@/lib/holiday-types";
import { ensureHolidaySchema, getSql } from "@/lib/db";

type TripRow = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  target_dish_count: number | null;
  is_active: boolean;
  dish_count: number | string;
  created_at?: string;
  updated_at?: string;
};

type TripDishRow = {
  id: string;
  name: string;
  category: string;
  minutes: string;
  added_at: string;
};

function asDateString(value: string | Date) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return text.slice(0, 10);
}

function toTrip(row: TripRow): HolidayTrip {
  return {
    id: row.id,
    name: row.name,
    startDate: asDateString(String(row.start_date)),
    endDate: asDateString(String(row.end_date)),
    targetDishCount: row.target_dish_count,
    isActive: Boolean(row.is_active),
    dishCount: Number(row.dish_count) || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type HolidayTripInput = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  targetDishCount?: number | null;
  isActive?: boolean;
};

function assertDateRange(startDate: string, endDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    throw new Error("INVALID_DATES");
  }
  if (endDate < startDate) {
    throw new Error("INVALID_RANGE");
  }
}

export async function listHolidayTrips(): Promise<HolidayTrip[]> {
  await ensureHolidaySchema();
  const sql = getSql();
  const rows = await sql`
    SELECT
      t.id,
      t.name,
      t.start_date,
      t.end_date,
      t.target_dish_count,
      t.is_active,
      t.created_at,
      t.updated_at,
      COUNT(d.dish_id)::int AS dish_count
    FROM holiday_trips t
    LEFT JOIN holiday_trip_dishes d ON d.trip_id = t.id
    GROUP BY t.id
    ORDER BY t.start_date ASC, t.created_at DESC
  ` as TripRow[];
  return rows.map(toTrip);
}

export async function getActiveHolidayTrip(): Promise<HolidayTrip | null> {
  await ensureHolidaySchema();
  const sql = getSql();
  const rows = await sql`
    SELECT
      t.id,
      t.name,
      t.start_date,
      t.end_date,
      t.target_dish_count,
      t.is_active,
      t.created_at,
      t.updated_at,
      COUNT(d.dish_id)::int AS dish_count
    FROM holiday_trips t
    LEFT JOIN holiday_trip_dishes d ON d.trip_id = t.id
    WHERE t.is_active = TRUE
    GROUP BY t.id
    LIMIT 1
  ` as TripRow[];
  return rows[0] ? toTrip(rows[0]) : null;
}

export async function getHolidayTripById(id: string): Promise<HolidayTrip | null> {
  await ensureHolidaySchema();
  const sql = getSql();
  const rows = await sql`
    SELECT
      t.id,
      t.name,
      t.start_date,
      t.end_date,
      t.target_dish_count,
      t.is_active,
      t.created_at,
      t.updated_at,
      COUNT(d.dish_id)::int AS dish_count
    FROM holiday_trips t
    LEFT JOIN holiday_trip_dishes d ON d.trip_id = t.id
    WHERE t.id = ${id}
    GROUP BY t.id
    LIMIT 1
  ` as TripRow[];
  return rows[0] ? toTrip(rows[0]) : null;
}

async function clearActiveTrips() {
  const sql = getSql();
  await sql`UPDATE holiday_trips SET is_active = FALSE WHERE is_active = TRUE`;
}

export async function upsertHolidayTrip(input: HolidayTripInput): Promise<HolidayTrip> {
  assertDateRange(input.startDate, input.endDate);
  const name = input.name.trim();
  if (!name) throw new Error("INVALID_NAME");

  const target =
    input.targetDishCount == null || input.targetDishCount === undefined
      ? null
      : Number(input.targetDishCount);
  if (target != null && (!Number.isSafeInteger(target) || target < 1)) {
    throw new Error("INVALID_TARGET");
  }

  await ensureHolidaySchema();
  const sql = getSql();
  const makeActive = Boolean(input.isActive);

  if (makeActive) {
    await clearActiveTrips();
  }

  await sql`
    INSERT INTO holiday_trips (
      id, name, start_date, end_date, target_dish_count, is_active, updated_at
    ) VALUES (
      ${input.id},
      ${name},
      ${input.startDate},
      ${input.endDate},
      ${target},
      ${makeActive},
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      start_date = EXCLUDED.start_date,
      end_date = EXCLUDED.end_date,
      target_dish_count = EXCLUDED.target_dish_count,
      is_active = EXCLUDED.is_active,
      updated_at = NOW()
  `;

  const trip = await getHolidayTripById(input.id);
  if (!trip) throw new Error("UPSERT_FAILED");
  return trip;
}

export async function updateHolidayTrip(
  id: string,
  patch: Partial<Omit<HolidayTripInput, "id">>,
): Promise<HolidayTrip | null> {
  const current = await getHolidayTripById(id);
  if (!current) return null;

  const next: HolidayTripInput = {
    id,
    name: patch.name ?? current.name,
    startDate: patch.startDate ?? current.startDate,
    endDate: patch.endDate ?? current.endDate,
    targetDishCount:
      patch.targetDishCount === undefined ? current.targetDishCount : patch.targetDishCount,
    isActive: patch.isActive === undefined ? current.isActive : patch.isActive,
  };

  return upsertHolidayTrip(next);
}

export async function deleteHolidayTrip(id: string): Promise<boolean> {
  await ensureHolidaySchema();
  const sql = getSql();
  const rows = await sql`
    DELETE FROM holiday_trips WHERE id = ${id} RETURNING id
  ` as { id: string }[];
  return rows.length > 0;
}

export async function listTripDishes(tripId: string): Promise<HolidayTripDish[]> {
  await ensureHolidaySchema();
  const sql = getSql();
  const rows = await sql`
    SELECT
      d.id,
      d.name,
      d.category,
      d.minutes,
      link.added_at
    FROM holiday_trip_dishes link
    INNER JOIN dishes d ON d.id = link.dish_id
    WHERE link.trip_id = ${tripId}
    ORDER BY link.added_at DESC
  ` as TripDishRow[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    minutes: row.minutes ?? "",
    addedAt: String(row.added_at),
  }));
}

export async function addDishToTrip(tripId: string, dishId: string): Promise<{ added: boolean }> {
  await ensureHolidaySchema();
  const sql = getSql();
  const trip = await getHolidayTripById(tripId);
  if (!trip) throw new Error("TRIP_NOT_FOUND");

  const dishes = await sql`SELECT id FROM dishes WHERE id = ${dishId} LIMIT 1` as { id: string }[];
  if (!dishes.length) throw new Error("DISH_NOT_FOUND");

  const rows = await sql`
    INSERT INTO holiday_trip_dishes (trip_id, dish_id)
    VALUES (${tripId}, ${dishId})
    ON CONFLICT (trip_id, dish_id) DO NOTHING
    RETURNING dish_id
  ` as { dish_id: string }[];

  return { added: rows.length > 0 };
}

export async function removeDishFromTrip(tripId: string, dishId: string): Promise<boolean> {
  await ensureHolidaySchema();
  const sql = getSql();
  const rows = await sql`
    DELETE FROM holiday_trip_dishes
    WHERE trip_id = ${tripId} AND dish_id = ${dishId}
    RETURNING dish_id
  ` as { dish_id: string }[];
  return rows.length > 0;
}
