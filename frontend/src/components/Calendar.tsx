"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction"; // for click/hover support
import { useState, useEffect } from "react";

type CalendarEvent = {
  title: string;
  start: string | Date;
  end?: string | Date;
  color?: string;
  extendedProps?: {
    type?: string;
    description?: string;
    employees?: Array<{
      name: string;
      type: string;
      status: string;
      reason?: string;
    }>;
    count?: number;
    isCurrentUser?: boolean;
    hasCurrentUser?: boolean;
  };
};

export default function Calendar({ events, userRole }: { events: CalendarEvent[]; userRole?: string }) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Force calendar to respect our theme system
  useEffect(() => {
    const checkTheme = () => {
      const savedTheme = localStorage.getItem('theme');
      const isDark = savedTheme === 'dark';

      // Create or update style element for FullCalendar theming
      let styleEl = document.getElementById('fullcalendar-theme-override');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'fullcalendar-theme-override';
        document.head.appendChild(styleEl);
      }

      if (isDark) {
        styleEl.textContent = `
          .fc-theme-standard,
          .fc-scrollgrid,
          .fc-col-header,
          .fc-daygrid-day,
          .fc-daygrid-day-top,
          .fc-daygrid-day-number,
          .fc-button {
            background-color: rgb(31 41 55) !important;
            color: rgb(243 244 246) !important;
            border-color: rgb(75 85 99) !important;
          }

          .fc-day-today {
            background-color: rgb(30 58 138 / 0.2) !important;
          }

          .fc-button:hover {
            background-color: rgb(55 65 81) !important;
          }

          .fc-button-active {
            background-color: rgb(37 99 235) !important;
            color: white !important;
          }

          .fc-col-header-cell {
            background-color: rgb(55 65 81) !important;
            border-color: rgb(75 85 99) !important;
          }

          .fc-daygrid-day:hover {
            background-color: rgb(55 65 81) !important;
          }

          .fc-theme-standard .fc-scrollgrid {
            border-color: rgb(75 85 99) !important;
          }

          /* Calendar container and legend theming */
          .calendar-legend {
            background-color: rgb(31 41 55) !important;
            border-color: rgb(75 85 99) !important;
            color: rgb(243 244 246) !important;
          }

          .calendar-legend h3 {
            color: rgb(243 244 246) !important;
          }

          .calendar-legend span {
            color: rgb(209 213 219) !important;
          }
        `;
      } else {
        styleEl.textContent = `
          .fc-theme-standard,
          .fc-scrollgrid,
          .fc-col-header,
          .fc-daygrid-day,
          .fc-daygrid-day-top,
          .fc-daygrid-day-number,
          .fc-button {
            background-color: white !important;
            color: rgb(55 65 81) !important;
            border-color: rgb(229 231 235) !important;
          }

          .fc-day-today {
            background-color: rgb(239 246 255) !important;
          }

          .fc-button:hover {
            background-color: rgb(249 250 251) !important;
          }

          .fc-button-active {
            background-color: rgb(37 99 235) !important;
            color: white !important;
          }

          .fc-col-header-cell {
            background-color: rgb(249 250 251) !important;
            border-color: rgb(229 231 235) !important;
          }

          .fc-daygrid-day:hover {
            background-color: rgb(249 250 251) !important;
          }

          .fc-theme-standard .fc-scrollgrid {
            border-color: rgb(229 231 235) !important;
          }

          /* Calendar container and legend theming */
          .calendar-legend {
            background-color: white !important;
            border-color: rgb(229 231 235) !important;
            color: rgb(55 65 81) !important;
          }

          .calendar-legend h3 {
            color: rgb(55 65 81) !important;
          }

          .calendar-legend span {
            color: rgb(107 114 128) !important;
          }
        `;
      }
    };

    checkTheme();

    // Listen for theme changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme') {
        checkTheme();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      const styleEl = document.getElementById('fullcalendar-theme-override');
      if (styleEl) {
        styleEl.remove();
      }
    };
  }, []);
  return (
    <div className="space-y-4">
      {/* Calendar Legend */}
          <div className="rounded-lg border border-card bg-card p-4 shadow-sm calendar-legend">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Calendar Legend</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {userRole === "HR" || userRole === "Admin" || userRole === "God" || userRole === "Manager" ? (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: "#6366f1" }}></div>
              <span className="text-xs text-gray-600 dark:text-gray-200">Team Leaves</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: "#10b981" }}></div>
              <span className="text-xs text-gray-600 dark:text-gray-200">Your Leaves</span>
            </div>
          )}
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: "#ef4444" }}></div>
                <span className="text-xs text-gray-600 dark:text-gray-200">Holidays</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: "#ec4899" }}></div>
                <span className="text-xs text-gray-600 dark:text-gray-200">Events</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: "#8b5cf6" }}></div>
                <span className="text-xs text-gray-600 dark:text-gray-200">Notices</span>
          </div>
          {(userRole === "HR" || userRole === "Admin" || userRole === "God" || userRole === "Manager") ? (
            <>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: "#fb923c" }}></div>
                <span className="text-xs text-gray-600 dark:text-gray-200">My Off-site</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: "#f97316" }}></div>
                <span className="text-xs text-gray-600 dark:text-gray-200">Team Off-site</span>
              </div>
            </>
          ) : (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: "#f97316" }}></div>
              <span className="text-xs text-gray-600 dark:text-gray-200">Off-site</span>
            </div>
          )}
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: "#06b6d4" }}></div>
                <span className="text-xs text-gray-600 dark:text-gray-200">Birthdays</span>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div
        className="rounded-xl overflow-hidden border border-card bg-card p-4 shadow-lg text-gray-900 dark:text-gray-100"
        style={{
          '--fc-page-bg-color': 'transparent',
          '--fc-neutral-bg-color': 'transparent',
          '--fc-list-event-hover-bg-color': 'transparent',
          '--fc-today-bg-color': 'rgb(59 130 246 / 0.1)',
        } as React.CSSProperties}
      >
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={events}
          height="auto"
          displayEventTime={false}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,dayGridWeek",
          }}
          eventDisplay="block"
          eventClick={(info) => {
            const event = events.find(e =>
              e.title === info.event.title &&
              e.start.toString() === info.event.start?.toString()
            );
            if (event) {
              setSelectedEvent(event);
              setShowModal(true);
            }
          }}
          themeSystem="standard"
        />
      </div>

      {/* Event Details Modal */}
      {showModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedEvent.title}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Date:</strong> {selectedEvent.start instanceof Date 
                  ? selectedEvent.start.toLocaleDateString() 
                  : new Date(selectedEvent.start).toLocaleDateString()}
              </div>
              
              {selectedEvent.extendedProps?.employees && selectedEvent.extendedProps.employees.length > 0 ? (
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    {selectedEvent.extendedProps.count && selectedEvent.extendedProps.count > 1 
                      ? `${selectedEvent.extendedProps.count} employees on leave:`
                      : 'Employee details:'
                    }
                  </div>
                  <div className="space-y-2">
                    {selectedEvent.extendedProps.employees.map((employee, index) => (
                      <div key={index} className="bg-gray-100 dark:bg-gray-600 rounded p-3 border border-gray-200 dark:border-gray-500">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {employee.name}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {employee.type} - {employee.status}
                            </div>
                            {employee.reason && (
                              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                Reason: {employee.reason}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : selectedEvent.extendedProps?.description ? (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Description:</strong> {selectedEvent.extendedProps.description}
                </div>
              ) : (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  No additional details available.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
