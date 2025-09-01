"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";

type CalendarEvent = {
  title: string;
  start: string | Date;
  end?: string | Date;
};

export default function Calendar({ events }: { events: CalendarEvent[] }) {
  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <FullCalendar
        plugins={[dayGridPlugin]}
        initialView="dayGridMonth"
        events={events}
        height="450px"
      />
    </div>
  );
}
