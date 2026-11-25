import { NextResponse } from "next/server";

import { deleteHolidayTrip, getHolidayTripById, updateHolidayTrip } from "@/lib/holiday-store";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const trip = await getHolidayTripById(id);
    if (!trip) {
      return NextResponse.json({ error: "Không tìm thấy kỳ nghỉ." }, { status: 404 });
    }
    return NextResponse.json({ trip });
  } catch (error) {
    console.error("Failed to get holiday trip", error);
    return NextResponse.json({ error: "Không thể tải kỳ nghỉ." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
    }

    const patch = body as {
      name?: string;
      startDate?: string;
      endDate?: string;
      targetDishCount?: number | null;
      isActive?: boolean;
    };

    const trip = await updateHolidayTrip(id, patch);
    if (!trip) {
      return NextResponse.json({ error: "Không tìm thấy kỳ nghỉ." }, { status: 404 });
    }
    return NextResponse.json({ trip });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "INVALID_DATES" || message === "INVALID_RANGE" || message === "INVALID_NAME" || message === "INVALID_TARGET") {
      return NextResponse.json({ error: "Hãy kiểm tra tên và khoảng ngày của kỳ nghỉ." }, { status: 400 });
    }
    console.error("Failed to update holiday trip", error);
    return NextResponse.json({ error: "Không thể cập nhật kỳ nghỉ." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const removed = await deleteHolidayTrip(id);
    if (!removed) {
      return NextResponse.json({ error: "Không tìm thấy kỳ nghỉ." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete holiday trip", error);
    return NextResponse.json({ error: "Không thể xóa kỳ nghỉ." }, { status: 500 });
  }
}
