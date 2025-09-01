"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction"; // for click/hover support

type CalendarEvent = {
  title: string;
  start: string | Date;
  end?: string | Date;
  color?: string; // 👈 allow custom colors (self vs teammates)
};

export default function Calendar({ events }: { events: CalendarEvent[] }) {
  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-lg">
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={events}
        height="auto"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,dayGridWeek,dayGridDay",
        }}
        eventDisplay="block"
        eventClick={(info) => {
          alert(`${info.event.title}\n${info.event.start?.toDateString()}`);
        }}
      />
    </div>
  );
}
