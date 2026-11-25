import { NextResponse } from "next/server";

import { addDishToTrip, listTripDishes, removeDishFromTrip } from "@/lib/holiday-store";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const dishes = await listTripDishes(id);
    return NextResponse.json({ dishes });
  } catch (error) {
    console.error("Failed to list trip dishes", error);
    return NextResponse.json({ error: "Không thể tải món của kỳ nghỉ." }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body: unknown = await request.json();
    const dishId =
      body && typeof body === "object" && typeof (body as { dishId?: unknown }).dishId === "string"
        ? (body as { dishId: string }).dishId
        : "";

    if (!dishId) {
      return NextResponse.json({ error: "Thiếu món ăn." }, { status: 400 });
    }

    const result = await addDishToTrip(id, dishId);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "TRIP_NOT_FOUND") {
      return NextResponse.json({ error: "Không tìm thấy kỳ nghỉ." }, { status: 404 });
    }
    if (message === "DISH_NOT_FOUND") {
      return NextResponse.json({ error: "Không tìm thấy món ăn." }, { status: 404 });
    }
    console.error("Failed to add dish to trip", error);
    return NextResponse.json({ error: "Không thể thêm món vào kỳ nghỉ." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body: unknown = await request.json();
    const dishId =
      body && typeof body === "object" && typeof (body as { dishId?: unknown }).dishId === "string"
        ? (body as { dishId: string }).dishId
        : "";

    if (!dishId) {
      return NextResponse.json({ error: "Thiếu món ăn." }, { status: 400 });
    }

    const removed = await removeDishFromTrip(id, dishId);
    return NextResponse.json({ removed });
  } catch (error) {
    console.error("Failed to remove dish from trip", error);
    return NextResponse.json({ error: "Không thể xóa món khỏi kỳ nghỉ." }, { status: 500 });
  }
}
