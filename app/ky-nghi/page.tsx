"use client";

import { useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import { CalendarDays, ChefHat, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { holidaySuggestions } from "@/lib/holiday-suggestions";
import {
  deleteHolidayTrip,
  newTripId,
  patchHolidayTrip,
  removeDishFromTrip,
  saveHolidayTrip,
  useHolidayTrips,
  useTripDishes,
  type HolidayTrip,
} from "@/lib/holiday-trips";

const weekdayLabels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const field =
  "w-full rounded-lg border border-[#dedfd6] bg-[#fdfdf9] px-3 py-2.5 text-sm text-[#26362b] placeholder:text-[#6d776d] focus:border-[#55745b] focus:outline-none focus:ring-2 focus:ring-[#55745b]/25";
const label = "grid min-w-0 gap-2 text-sm font-medium text-[#26362b]";
const primaryButton = "h-10 rounded-lg bg-[#294b37] px-4 text-white hover:bg-[#365d46]";

function formatDateVi(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("vi-VN");
}

function monthTitle(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString("vi-VN", { month: "long", year: "numeric" });
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function startWeekdayMonday(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function inRange(isoDate: string, start: string, end: string) {
  return isoDate >= start && isoDate <= end;
}

function toIso(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

type MonthCursor = { year: number; month: number };

const serverMonthCursor: MonthCursor = { year: 2026, month: 0 };
let clientMonthCursor: MonthCursor | null = null;

function getClientMonthCursor(): MonthCursor {
  if (!clientMonthCursor) {
    const now = new Date();
    clientMonthCursor = { year: now.getFullYear(), month: now.getMonth() };
  }
  return clientMonthCursor;
}

function useDefaultMonthCursor() {
  return useSyncExternalStore(
    () => () => {},
    getClientMonthCursor,
    () => serverMonthCursor,
  );
}

export default function HolidayTripPage() {
  const { trips, error, loading, refresh } = useHolidayTrips();
  const defaultMonth = useDefaultMonthCursor();
  const [monthCursor, setMonthCursor] = useState<MonthCursor | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const visibleMonth = monthCursor ?? defaultMonth;
  const suggestions = useMemo(
    () => holidaySuggestions(new Date(defaultMonth.year, defaultMonth.month, 1)),
    [defaultMonth.year, defaultMonth.month],
  );

  const selected =
    trips.find((trip) => trip.id === selectedId) ??
    trips.find((trip) => trip.isActive) ??
    trips[0] ??
    null;

  const {
    dishes,
    loading: dishesLoading,
    error: dishesError,
    refresh: refreshDishes,
    replace: replaceDishes,
  } = useTripDishes(selected?.id ?? null);

  const calendarCells = useMemo(() => {
    const { year, month } = visibleMonth;
    const leading = startWeekdayMonday(year, month);
    const total = daysInMonth(year, month);
    const cells: Array<{ iso: string; day: number } | null> = [];
    for (let index = 0; index < leading; index += 1) cells.push(null);
    for (let day = 1; day <= total; day += 1) {
      cells.push({ iso: toIso(year, month, day), day });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [visibleMonth]);

  async function afterTripChange(trip?: HolidayTrip) {
    const next = await refresh();
    const prefer = trip?.id ?? selected?.id;
    const nextSelected =
      (prefer && next.find((item) => item.id === prefer)?.id) ||
      next.find((item) => item.isActive)?.id ||
      next[0]?.id ||
      null;
    setSelectedId(nextSelected);
    if (trip) {
      setMonthCursor({
        year: Number(trip.startDate.slice(0, 4)),
        month: Number(trip.startDate.slice(5, 7)) - 1,
      });
    }
    await refreshDishes();
  }

  async function createFromSuggestion(suggestion: (typeof suggestions)[number]) {
    setSaving(true);
    setFeedback(null);
    try {
      const trip = await saveHolidayTrip({
        id: newTripId(),
        name: suggestion.name,
        startDate: suggestion.startDate,
        endDate: suggestion.endDate,
        isActive: true,
      });
      setShowForm(false);
      await afterTripChange(trip);
      setFeedback({ text: `Đã tạo và mở kỳ “${trip.name}”.` });
    } catch (err) {
      setFeedback({ text: err instanceof Error ? err.message : "Không thể tạo kỳ nghỉ.", error: true });
    } finally {
      setSaving(false);
    }
  }

  async function submitTrip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const startDate = String(data.get("startDate") ?? "");
    const endDate = String(data.get("endDate") ?? "");
    const targetRaw = String(data.get("targetDishCount") ?? "").trim();
    const targetDishCount = targetRaw ? Number(targetRaw) : null;

    if (!name || !startDate || !endDate) {
      setFeedback({ text: "Hãy nhập tên và khoảng ngày.", error: true });
      return;
    }
    if (endDate < startDate) {
      setFeedback({ text: "Ngày kết thúc phải từ ngày bắt đầu trở đi.", error: true });
      return;
    }
    if (targetDishCount != null && (!Number.isSafeInteger(targetDishCount) || targetDishCount < 1)) {
      setFeedback({ text: "Số món mục tiêu phải là số nguyên dương.", error: true });
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const trip = await saveHolidayTrip({
        id: newTripId(),
        name,
        startDate,
        endDate,
        targetDishCount,
        isActive: true,
      });
      setShowForm(false);
      form.reset();
      await afterTripChange(trip);
      setFeedback({ text: `Đã tạo và mở kỳ “${trip.name}”.` });
    } catch (err) {
      setFeedback({ text: err instanceof Error ? err.message : "Không thể lưu kỳ nghỉ.", error: true });
    } finally {
      setSaving(false);
    }
  }

  async function activateTrip(trip: HolidayTrip) {
    setSaving(true);
    setFeedback(null);
    try {
      await patchHolidayTrip(trip.id, { isActive: true });
      await afterTripChange(trip);
      setFeedback({ text: `Đang mở kỳ “${trip.name}”.` });
    } catch (err) {
      setFeedback({ text: err instanceof Error ? err.message : "Không thể mở kỳ nghỉ.", error: true });
    } finally {
      setSaving(false);
    }
  }

  async function removeTrip(trip: HolidayTrip) {
    if (!window.confirm(`Xóa kỳ nghỉ “${trip.name}”?`)) return;
    setSaving(true);
    setFeedback(null);
    try {
      await deleteHolidayTrip(trip.id);
      await afterTripChange();
      setFeedback({ text: "Đã xóa kỳ nghỉ." });
    } catch (err) {
      setFeedback({ text: err instanceof Error ? err.message : "Không thể xóa kỳ nghỉ.", error: true });
    } finally {
      setSaving(false);
    }
  }

  async function removeDish(dishId: string) {
    if (!selected) return;
    setFeedback(null);
    try {
      await removeDishFromTrip(selected.id, dishId);
      replaceDishes(dishes.filter((dish) => dish.id !== dishId));
      await refresh();
      setFeedback({ text: "Đã xóa món khỏi kỳ nghỉ." });
    } catch (err) {
      setFeedback({ text: err instanceof Error ? err.message : "Không thể xóa món.", error: true });
    }
  }

  return (
    <div className="min-h-dvh bg-[#f5f5ed] text-[#26362b]">
      <header className="mx-auto max-w-7xl px-5 pt-8 sm:px-8 lg:px-12">
        <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">Kỳ nghỉ sắp tới</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#5c695e] sm:text-base">
          Chọn hoặc tạo kỳ nghỉ, rồi quay món ở trang chủ và thêm vào kỳ đang mở.
        </p>
      </header>

      <main className="mx-auto grid max-w-7xl items-start gap-7 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:px-12">
        <section aria-labelledby="calendar-title" className="grid gap-4">
          <Card className="bg-[#fffffb] ring-[#dbe0d3]">
            <CardHeader className="grid-cols-[auto_1fr] items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-[#e8eee1] text-[#34513d]">
                <CalendarDays className="size-5" aria-hidden="true" />
              </span>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 id="calendar-title" className="text-lg font-semibold capitalize">
                    {monthTitle(visibleMonth.year, visibleMonth.month)}
                  </h2>
                  <p className="text-sm text-[#5c695e]">
                    {selected
                      ? `Đang xem: ${selected.name} (${formatDateVi(selected.startDate)} – ${formatDateVi(selected.endDate)})`
                      : "Chưa có kỳ nghỉ nào"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setMonthCursor((current) => {
                        const base = current ?? defaultMonth;
                        const date = new Date(base.year, base.month - 1, 1);
                        return { year: date.getFullYear(), month: date.getMonth() };
                      })
                    }
                  >
                    Tháng trước
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setMonthCursor((current) => {
                        const base = current ?? defaultMonth;
                        const date = new Date(base.year, base.month + 1, 1);
                        return { year: date.getFullYear(), month: date.getMonth() };
                      })
                    }
                  >
                    Tháng sau
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-[#5c695e]">
                {weekdayLabels.map((day) => (
                  <div key={day} className="py-2">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarCells.map((cell, index) => {
                  if (!cell) return <div key={`empty-${index}`} className="min-h-11 rounded-lg" />;
                  const highlighted = selected ? inRange(cell.iso, selected.startDate, selected.endDate) : false;
                  const isStart = selected && cell.iso === selected.startDate;
                  const isEnd = selected && cell.iso === selected.endDate;
                  return (
                    <div
                      key={cell.iso}
                      className={`grid min-h-11 place-items-center rounded-lg text-sm ${
                        highlighted ? "bg-[#294b37] font-semibold text-white" : "bg-[#f7f8f2] text-[#26362b]"
                      } ${isStart || isEnd ? "ring-2 ring-[#c4d3b4]" : ""}`}
                    >
                      {cell.day}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#fffffb] ring-[#dbe0d3]">
            <CardHeader>
              <h2 className="text-lg font-semibold">Gợi ý ngày lễ</h2>
              <p className="text-sm text-[#5c695e]">Chọn một gợi ý hoặc tạo kỳ nghỉ tùy chỉnh.</p>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <Button
                    key={suggestion.id}
                    type="button"
                    variant="outline"
                    disabled={saving}
                    className="h-auto min-h-10 whitespace-normal px-3 py-2 text-left"
                    onClick={() => void createFromSuggestion(suggestion)}
                  >
                    <span className="grid gap-0.5">
                      <span className="font-medium">{suggestion.name}</span>
                      <span className="text-xs text-[#5c695e]">
                        {formatDateVi(suggestion.startDate)}
                        {suggestion.endDate !== suggestion.startDate ? ` – ${formatDateVi(suggestion.endDate)}` : ""}
                      </span>
                    </span>
                  </Button>
                ))}
              </div>
              <Button type="button" className={primaryButton} onClick={() => setShowForm((open) => !open)}>
                <Plus aria-hidden="true" /> {showForm ? "Ẩn form tạo kỳ nghỉ" : "Tạo kỳ nghỉ tùy chỉnh"}
              </Button>
              {showForm && (
                <form className="grid gap-3 rounded-xl border border-[#e8e9e0] bg-[#fbfcf6] p-4" onSubmit={(event) => void submitTrip(event)}>
                  <label className={label}>
                    Tên kỳ nghỉ *
                    <input name="name" className={field} required maxLength={120} placeholder="Ví dụ: Nghỉ lễ 30/4" />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className={label}>
                      Ngày bắt đầu *
                      <input name="startDate" type="date" className={field} required />
                    </label>
                    <label className={label}>
                      Ngày kết thúc *
                      <input name="endDate" type="date" className={field} required />
                    </label>
                  </div>
                  <label className={label}>
                    Số món mục tiêu (không bắt buộc)
                    <input name="targetDishCount" type="number" min={1} step={1} className={field} placeholder="Ví dụ: 8" />
                  </label>
                  <Button type="submit" disabled={saving} className={primaryButton}>
                    {saving ? "Đang lưu…" : "Lưu và mở kỳ nghỉ"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="trip-list-title" className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="trip-list-title" className="font-serif text-3xl tracking-tight">Kỳ nghỉ & món</h2>
            <span className="rounded-full bg-[#e6ecde] px-3 py-1 text-sm font-medium text-[#34513d]">{trips.length} kỳ</span>
          </div>

          {feedback && (
            <p role={feedback.error ? "alert" : "status"} className={feedback.error ? "text-sm text-red-800" : "text-sm text-[#34513d]"}>
              {feedback.text}
            </p>
          )}

          {loading ? (
            <p role="status" className="rounded-xl border border-dashed border-[#c6cfc0] bg-[#fbfcf6] px-5 py-10 text-center text-sm text-[#5c695e]">
              Đang tải kỳ nghỉ…
            </p>
          ) : error ? (
            <p role="alert" className="rounded-xl bg-white p-5 text-sm text-red-800">Không thể tải danh sách kỳ nghỉ.</p>
          ) : trips.length === 0 ? (
            <div className="grid justify-items-center gap-3 rounded-xl border border-dashed border-[#c6cfc0] bg-[#fbfcf6] px-5 py-12 text-center">
              <span className="grid size-14 place-items-center rounded-full bg-[#e8eee1] text-[#34513d]">
                <CalendarDays className="size-7" aria-hidden="true" />
              </span>
              <h3 className="font-semibold">Chưa có kỳ nghỉ</h3>
              <p className="max-w-xs text-sm text-[#5c695e]">Chọn một gợi ý ngày lễ hoặc tạo kỳ nghỉ tùy chỉnh để bắt đầu.</p>
            </div>
          ) : (
            <ul className="grid gap-3">
              {trips.map((trip) => {
                const active = selected?.id === trip.id;
                return (
                  <li key={trip.id}>
                    <div className={`grid gap-3 rounded-xl border p-4 ${active ? "border-[#294b37] bg-[#fffffb]" : "border-[#dbe0d3] bg-[#fbfcf6]"}`}>
                      <button type="button" className="grid gap-1 text-left" onClick={() => setSelectedId(trip.id)}>
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{trip.name}</span>
                          {trip.isActive && (
                            <span className="rounded-full bg-[#e8eee1] px-2 py-0.5 text-xs font-medium text-[#34513d]">Đang mở</span>
                          )}
                        </span>
                        <span className="text-sm text-[#5c695e]">
                          {formatDateVi(trip.startDate)} – {formatDateVi(trip.endDate)} · {trip.dishCount}
                          {trip.targetDishCount ? ` / ${trip.targetDishCount}` : ""} món
                        </span>
                      </button>
                      <div className="flex flex-wrap gap-2">
                        {!trip.isActive && (
                          <Button type="button" variant="outline" disabled={saving} onClick={() => void activateTrip(trip)}>
                            Mở kỳ này
                          </Button>
                        )}
                        <Button type="button" variant="destructive" disabled={saving} onClick={() => void removeTrip(trip)}>
                          <Trash2 aria-hidden="true" /> Xóa kỳ
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {selected && (
            <Card className="bg-[#fffffb] ring-[#dbe0d3]">
              <CardHeader className="grid-cols-[auto_1fr] items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-[#e8eee1] text-[#34513d]">
                  <ChefHat className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-lg font-semibold">Món cho “{selected.name}”</h3>
                  <p className="text-sm text-[#5c695e]">
                    Quay món ở trang chủ rồi bấm thêm vào kỳ đang mở.
                    {selected.targetDishCount
                      ? ` Mục tiêu ${selected.targetDishCount} món (hiện ${dishes.length}).`
                      : ` Hiện có ${dishes.length} món.`}
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                {dishesLoading ? (
                  <p role="status" className="text-sm text-[#5c695e]">Đang tải món…</p>
                ) : dishesError ? (
                  <p role="alert" className="text-sm text-red-800">Không thể tải món của kỳ nghỉ.</p>
                ) : dishes.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-[#c6cfc0] bg-[#fbfcf6] px-4 py-8 text-center text-sm text-[#5c695e]">
                    Chưa có món nào trong kỳ này.
                  </p>
                ) : (
                  <ul className="grid gap-2">
                    {dishes.map((dish) => (
                      <li key={dish.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e8e9e0] bg-[#fbfcf6] px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="wrap-anywhere font-medium">{dish.name}</p>
                          <p className="text-xs text-[#5c695e]">
                            {dish.category}
                            {dish.minutes ? ` · ${dish.minutes} phút` : ""}
                          </p>
                        </div>
                        <Button type="button" variant="destructive" onClick={() => void removeDish(dish.id)}>
                          <Trash2 aria-hidden="true" /> Xóa món
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
        </section>
      </main>
    </div>
  );
}
