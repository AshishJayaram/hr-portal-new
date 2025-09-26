export type CalendarEvent = {
  title: string;
  start: string | Date;
  end?: string | Date;
};

export function calculateLeaveDays(
  startDate: string,
  endDate: string,
  startHalf: "FULL" | "AM" | "PM",
  endHalf: "FULL" | "AM" | "PM",
  bankHolidays: CalendarEvent[] = []
): number {
  if (!startDate || !endDate) return 0;

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (end < start) return 0;

  // Collect all holiday dates (both bank holidays and regular holidays)
  const holidaySet = new Set(
    bankHolidays
      .filter((h) => h.title === "BH" || h.title === "Holiday")
      .map((h) => new Date(h.start).toDateString())
  );

  let count = 0;
  let cur = new Date(start);

  while (cur <= end) {
    const day = cur.getDay(); // 0 = Sun, 6 = Sat
    const isWeekend = day === 0 || day === 6;
    const isHoliday = holidaySet.has(cur.toDateString());

    if (!isWeekend && !isHoliday) {
      count += 1;
    }
    cur.setDate(cur.getDate() + 1);
  }

  // Half-day adjustments
  if (start.toDateString() === end.toDateString()) {
    // Single-day leave
    if (startHalf !== "FULL" || endHalf !== "FULL") count -= 0.5;
  } else {
    // Multi-day leave
    if (startHalf !== "FULL") count -= 0.5;
    if (endHalf !== "FULL") count -= 0.5;
  }

  return Math.max(count, 0);
}
