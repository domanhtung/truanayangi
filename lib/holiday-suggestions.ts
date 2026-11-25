export type HolidaySuggestion = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  note?: string;
};

function iso(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function upcomingYear(month: number, day: number, from: Date) {
  const year = from.getFullYear();
  const candidate = new Date(year, month - 1, day);
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return candidate < today ? year + 1 : year;
}

/** Static civil-date suggestions; lunar holidays use editable windows. */
export function holidaySuggestions(from: Date): HolidaySuggestion[] {
  const newYear = upcomingYear(1, 1, from);
  const liberation = upcomingYear(4, 30, from);
  const national = upcomingYear(9, 2, from);

  // Approximate lunar windows for the next occurrence relative to "from"
  const tetYear = from.getMonth() > 1 || (from.getMonth() === 1 && from.getDate() > 20)
    ? from.getFullYear() + 1
    : from.getFullYear();
  const hungVuongYear = from.getMonth() > 3 || (from.getMonth() === 3 && from.getDate() > 18)
    ? from.getFullYear() + 1
    : from.getFullYear();

  return [
    {
      id: "new-year",
      name: "Tết Dương lịch",
      startDate: iso(newYear, 1, 1),
      endDate: iso(newYear, 1, 1),
    },
    {
      id: "tet",
      name: "Tết Âm lịch",
      startDate: iso(tetYear, 1, 25),
      endDate: iso(tetYear, 2, 2),
      note: "Khoảng gợi ý — hãy chỉnh đúng ngày năm nay",
    },
    {
      id: "hung-vuong",
      name: "Giỗ Tổ Hùng Vương",
      startDate: iso(hungVuongYear, 4, 16),
      endDate: iso(hungVuongYear, 4, 18),
      note: "Khoảng gợi ý — có thể chỉnh lại",
    },
    {
      id: "liberation",
      name: "30/4 – 1/5",
      startDate: iso(liberation, 4, 30),
      endDate: iso(liberation, 5, 1),
    },
    {
      id: "national-day",
      name: "Quốc khánh 2/9",
      startDate: iso(national, 9, 1),
      endDate: iso(national, 9, 2),
    },
  ].sort((a, b) => a.startDate.localeCompare(b.startDate));
}
