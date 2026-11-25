import { NextResponse } from "next/server";

import type { Dish } from "@/lib/dish-types";
import { deleteDishesByIds, listDishes, upsertDish } from "@/lib/dish-store";

function isDish(value: unknown): value is Dish {
  if (!value || typeof value !== "object") return false;
  const dish = value as Partial<Dish>;
  return (
    typeof dish.id === "string" &&
    typeof dish.name === "string" &&
    typeof dish.category === "string" &&
    dish.instructions !== undefined &&
    dish.ingredients !== undefined
  );
}

export async function GET() {
  try {
    const dishes = await listDishes();
    return NextResponse.json({ dishes });
  } catch (error) {
    console.error("Failed to list dishes", error);
    return NextResponse.json({ error: "Không thể tải danh sách món ăn." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!isDish(body)) {
      return NextResponse.json({ error: "Dữ liệu món ăn không hợp lệ." }, { status: 400 });
    }
    const dish = await upsertDish(body);
    return NextResponse.json({ dish });
  } catch (error) {
    console.error("Failed to save dish", error);
    return NextResponse.json({ error: "Không thể lưu món ăn." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body: unknown = await request.json();
    const ids = body && typeof body === "object" && Array.isArray((body as { ids?: unknown }).ids)
      ? (body as { ids: unknown[] }).ids.filter((id): id is string => typeof id === "string")
      : [];

    if (!ids.length) {
      return NextResponse.json({ error: "Chưa chọn món để xóa." }, { status: 400 });
    }

    const removedCount = await deleteDishesByIds(ids);
    return NextResponse.json({ removedCount });
  } catch (error) {
    console.error("Failed to delete dishes", error);
    return NextResponse.json({ error: "Không thể xóa món ăn." }, { status: 500 });
  }
}
