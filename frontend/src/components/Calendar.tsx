"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction"; // for click/hover support
import { useState } from "react";

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
  return (
    <div className="space-y-4">
      {/* Calendar Legend */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Calendar Legend</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {userRole === "HR" || userRole === "Admin" || userRole === "God" ? (
            <>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: "#10b981" }}></div>
                <span className="text-xs text-gray-600 dark:text-gray-400">Your Leaves</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: "#6366f1" }}></div>
                <span className="text-xs text-gray-600 dark:text-gray-400">Team Leaves</span>
              </div>
            </>
          ) : (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: "#10b981" }}></div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Your Leaves</span>
            </div>
          )}
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: "#ef4444" }}></div>
            <span className="text-xs text-gray-600 dark:text-gray-400">Holidays</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: "#ec4899" }}></div>
            <span className="text-xs text-gray-600 dark:text-gray-400">Events</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: "#8b5cf6" }}></div>
            <span className="text-xs text-gray-600 dark:text-gray-400">Notices</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: "#f97316" }}></div>
            <span className="text-xs text-gray-600 dark:text-gray-400">Off-site Work</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: "#ec4899" }}></div>
            <span className="text-xs text-gray-600 dark:text-gray-400">Birthdays</span>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-lg">
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
