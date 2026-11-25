import type { Dish } from "@/lib/dish-types";
import { ensureDishSchema, getSql } from "@/lib/db";

type DishRow = {
  id: string;
  name: string;
  category: string;
  ingredients: Dish["ingredients"];
  previous_ingredients: string | null;
  instructions: Dish["instructions"];
  minutes: string;
  servings: string | null;
  base_servings: number | null;
  notes: string;
};

function toDish(row: DishRow): Dish {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    ingredients: row.ingredients,
    previousIngredients: row.previous_ingredients ?? undefined,
    instructions: row.instructions,
    minutes: row.minutes ?? "",
    servings: row.servings ?? undefined,
    baseServings: row.base_servings ?? undefined,
    notes: row.notes ?? "",
  };
}

export async function listDishes(): Promise<Dish[]> {
  await ensureDishSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT
      id,
      name,
      category,
      ingredients,
      previous_ingredients,
      instructions,
      minutes,
      servings,
      base_servings,
      notes
    FROM dishes
    ORDER BY created_at DESC
  ` as DishRow[];
  return rows.map(toDish);
}

export async function upsertDish(dish: Dish): Promise<Dish> {
  await ensureDishSchema();
  const sql = getSql();
  const rows = await sql`
    INSERT INTO dishes (
      id,
      name,
      category,
      ingredients,
      previous_ingredients,
      instructions,
      minutes,
      servings,
      base_servings,
      notes,
      updated_at
    ) VALUES (
      ${dish.id},
      ${dish.name},
      ${dish.category},
      ${JSON.stringify(dish.ingredients)}::jsonb,
      ${dish.previousIngredients ?? null},
      ${JSON.stringify(dish.instructions)}::jsonb,
      ${dish.minutes ?? ""},
      ${dish.servings ?? null},
      ${dish.baseServings ?? null},
      ${dish.notes ?? ""},
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      category = EXCLUDED.category,
      ingredients = EXCLUDED.ingredients,
      previous_ingredients = EXCLUDED.previous_ingredients,
      instructions = EXCLUDED.instructions,
      minutes = EXCLUDED.minutes,
      servings = EXCLUDED.servings,
      base_servings = EXCLUDED.base_servings,
      notes = EXCLUDED.notes,
      updated_at = NOW()
    RETURNING
      id,
      name,
      category,
      ingredients,
      previous_ingredients,
      instructions,
      minutes,
      servings,
      base_servings,
      notes
  ` as DishRow[];

  return toDish(rows[0]);
}

export async function deleteDishesByIds(ids: string[]): Promise<number> {
  if (!ids.length) return 0;
  await ensureDishSchema();
  const sql = getSql();
  const rows = await sql`
    DELETE FROM dishes
    WHERE id = ANY(${ids})
    RETURNING id
  ` as { id: string }[];
  return rows.length;
}
