import { NextResponse } from "next/server";

import {
  getActiveHolidayTrip,
  listHolidayTrips,
  upsertHolidayTrip,
  type HolidayTripInput,
} from "@/lib/holiday-store";

function isTripBody(value: unknown): value is HolidayTripInput {
  if (!value || typeof value !== "object") return false;
  const body = value as Partial<HolidayTripInput>;
  return (
    typeof body.id === "string" &&
    typeof body.name === "string" &&
    typeof body.startDate === "string" &&
    typeof body.endDate === "string"
  );
}

export async function GET(request: Request) {
  try {
    const activeOnly = new URL(request.url).searchParams.get("active") === "1";
    if (activeOnly) {
      const trip = await getActiveHolidayTrip();
      return NextResponse.json({ trip });
    }
    const trips = await listHolidayTrips();
    return NextResponse.json({ trips });
  } catch (error) {
    console.error("Failed to list holiday trips", error);
    return NextResponse.json({ error: "Không thể tải danh sách kỳ nghỉ." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!isTripBody(body)) {
      return NextResponse.json({ error: "Dữ liệu kỳ nghỉ không hợp lệ." }, { status: 400 });
    }
    const trip = await upsertHolidayTrip({
      ...body,
      isActive: body.isActive ?? true,
    });
    return NextResponse.json({ trip });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "INVALID_DATES" || message === "INVALID_RANGE" || message === "INVALID_NAME" || message === "INVALID_TARGET") {
      return NextResponse.json({ error: "Hãy kiểm tra tên và khoảng ngày của kỳ nghỉ." }, { status: 400 });
    }
    console.error("Failed to save holiday trip", error);
    return NextResponse.json({ error: "Không thể lưu kỳ nghỉ." }, { status: 500 });
  }
}
