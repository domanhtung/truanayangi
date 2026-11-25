import { neon } from "@neondatabase/serverless";

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return url;
}

export function getSql() {
  return neon(getDatabaseUrl());
}

let dishSchemaReady: Promise<void> | null = null;
let holidaySchemaReady: Promise<void> | null = null;

export async function ensureDishSchema() {
  if (!dishSchemaReady) {
    dishSchemaReady = (async () => {
      const sql = getSql();
      await sql`
        CREATE TABLE IF NOT EXISTS dishes (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          category TEXT NOT NULL,
          ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
          previous_ingredients TEXT,
          instructions JSONB NOT NULL,
          minutes TEXT NOT NULL DEFAULT '',
          servings TEXT,
          base_servings INTEGER,
          notes TEXT NOT NULL DEFAULT '',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS dishes_created_at_idx
        ON dishes (created_at DESC)
      `;
    })().catch((error) => {
      dishSchemaReady = null;
      throw error;
    });
  }

  await dishSchemaReady;
}

export async function ensureHolidaySchema() {
  await ensureDishSchema();
  if (!holidaySchemaReady) {
    holidaySchemaReady = (async () => {
      const sql = getSql();
      await sql`
        CREATE TABLE IF NOT EXISTS holiday_trips (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          target_dish_count INTEGER,
          is_active BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CHECK (end_date >= start_date)
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS holiday_trip_dishes (
          trip_id TEXT NOT NULL REFERENCES holiday_trips(id) ON DELETE CASCADE,
          dish_id TEXT NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
          added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (trip_id, dish_id)
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS holiday_trips_start_date_idx
        ON holiday_trips (start_date)
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS holiday_trip_dishes_dish_id_idx
        ON holiday_trip_dishes (dish_id)
      `;
    })().catch((error) => {
      holidaySchemaReady = null;
      throw error;
    });
  }

  await holidaySchemaReady;
}
