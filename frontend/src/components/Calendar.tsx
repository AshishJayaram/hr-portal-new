"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction"; // for click/hover support
import { useState, useEffect } from "react";
import { useFilteredUsers } from "@/hooks/useUsersCache";

type CalendarEvent = {
  title: string;
  start: string | Date;
  end?: string | Date;
  color?: string;
  extendedProps?: {
    type?: string;
    description?: string;
    offSiteType?: string;
    originalHoliday?: {
      name?: string;
      title?: string;
      type?: string;
      description?: string;
      [key: string]: any;
    };
    originalLeave?: {
      user?: { name?: string; [key: string]: any };
      type?: string;
      [key: string]: any;
    };
    originalOffSite?: {
      location?: string;
      description?: string;
      [key: string]: any;
    };
    employees?: Array<{
      name: string;
      type: string;
      status: string;
      reason?: string;
    }>;
    holidays?: Array<{
      title: string;
      type?: string;
      description?: string;
    }>;
    offsites?: Array<{
      title: string;
      type?: string;
      description?: string;
      originalOffSite?: { location?: string; description?: string; [key: string]: any };
    }>;
    birthdays?: Array<{
      name: string;
      birthday: string;
      description?: string;
    }>;
    anniversaries?: Array<{
      name: string;
      years: number;
      description?: string;
    }>;
    count?: number;
    isCurrentUser?: boolean;
    hasCurrentUser?: boolean;
    grouped?: boolean;
  };
};

export default function Calendar({ events, userRole }: { events: CalendarEvent[]; userRole?: string }) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const { users: usersData } = useFilteredUsers();
  
  // Helper to get user name by ID - tries multiple approaches
  const getUserNameById = (userId: string | number | undefined | null): string | null => {
    if (!userId || !usersData || !Array.isArray(usersData)) return null;
    const userIdStr = String(userId);
    // Try exact match first
    const user: any = usersData.find((u: any) => {
      if (!u) return false;
      const id = String(u.id || u.ID || '');
      return id === userIdStr;
    });
    if (!user) return null;
    // Try name first
    if (user.name) return user.name;
    // Try username as fallback (using any type to avoid TS errors)
    if (user.username) return user.username;
    // Try email as last resort - extract name part before @
    if (user.email && typeof user.email === 'string') {
      return user.email.split('@')[0];
    }
    return null;
  };

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
            background-color: rgba(255, 255, 255, 0.05) !important;
            color: rgb(243 244 246) !important;
            border-color: rgba(255, 255, 255, 0.1) !important;
          }

          .fc-day-today {
            background-color: rgba(99, 102, 241, 0.15) !important;
          }

          .fc-button {
            background-color: rgba(255, 255, 255, 0.1) !important;
            color: rgb(243 244 246) !important;
            border-color: rgba(255, 255, 255, 0.1) !important;
          }

          .fc-button:hover {
            background-color: rgba(255, 255, 255, 0.15) !important;
          }

          .fc-button-active {
            background-color: rgb(99 102 241) !important;
            color: white !important;
            border-color: rgb(99 102 241) !important;
          }

          .fc-col-header-cell {
            background-color: rgba(255, 255, 255, 0.08) !important;
            border-color: rgba(255, 255, 255, 0.1) !important;
          }

          .fc-daygrid-day:hover {
            background-color: rgba(255, 255, 255, 0.08) !important;
          }

          .fc-theme-standard .fc-scrollgrid {
            border-color: rgba(255, 255, 255, 0.1) !important;
          }

          .fc-daygrid-day-number {
            color: rgb(243 244 246) !important;
          }

          .fc-col-header-cell-cushion {
            color: rgb(243 244 246) !important;
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
            background-color: var(--card-background) !important;
            color: var(--text-primary) !important;
            border-color: var(--card-border) !important;
          }

          .fc-day-today {
            background-color: rgba(99, 102, 241, 0.1) !important;
          }

          .fc-button {
            background-color: var(--card-background) !important;
            color: var(--text-primary) !important;
            border-color: var(--card-border) !important;
          }

          .fc-button:hover {
            background-color: var(--bg-1) !important;
          }

          .fc-button-active {
            background-color: rgb(99 102 241) !important;
            color: white !important;
            border-color: rgb(99 102 241) !important;
          }

          .fc-col-header-cell {
            background-color: var(--bg-1) !important;
            border-color: var(--card-border) !important;
          }

          .fc-daygrid-day:hover {
            background-color: var(--bg-1) !important;
          }

          .fc-theme-standard .fc-scrollgrid {
            border-color: var(--card-border) !important;
          }

          .fc-daygrid-day-number {
            color: var(--text-primary) !important;
          }

          .fc-col-header-cell-cushion {
            color: var(--text-primary) !important;
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
          <div className="rounded-lg border border-card bg-card dark:bg-white/10 dark:border-white/10 p-4 shadow-sm calendar-legend">
        <h3 className="text-sm font-semibold text-primary dark:text-white mb-3">Calendar Legend</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {userRole === "HR" || userRole === "Admin" || userRole === "God" ? (
            <>
              <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: "#10b981" }}></div>
                  <span className="text-xs text-secondary dark:text-gray-200">Your Leaves</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: "#6366f1" }}></div>
                    <span className="text-xs text-secondary dark:text-gray-200">Team Leaves</span>
              </div>
            </>
          ) : (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: "#10b981" }}></div>
                  <span className="text-xs text-secondary dark:text-gray-200">Your Leaves</span>
            </div>
          )}
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: "#ef4444" }}></div>
                <span className="text-xs text-secondary dark:text-gray-200">Holidays</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: "#ec4899" }}></div>
                <span className="text-xs text-secondary dark:text-gray-200">Events</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: "#39ff14" }}></div>
                <span className="text-xs text-secondary dark:text-gray-200">Notices</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: "#f97316" }}></div>
                <span className="text-xs text-secondary dark:text-gray-200">My Off-site</span>
          </div>
          {userRole === "HR" || userRole === "Admin" || userRole === "God" ? (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: "#e91e63" }}></div>
                  <span className="text-xs text-secondary dark:text-gray-200">Team Off-site</span>
            </div>
          ) : null}
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: "#06b6d4" }}></div>
                <span className="text-xs text-secondary dark:text-gray-200">Birthdays</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: "#f59e0b" }}></div>
                <span className="text-xs text-secondary dark:text-gray-200">Work Anniversaries</span>
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
            // Find the matching event - use more flexible matching
            const clickedEvent = info.event;
            const event = events.find(e => {
              // Match by title and start date, or use the event directly from FullCalendar
              const eStart = e.start instanceof Date ? e.start : new Date(e.start);
              const clickedStart = clickedEvent.start instanceof Date 
                ? clickedEvent.start 
                : clickedEvent.start ? new Date(clickedEvent.start) : null;
              
              if (!clickedStart) return false;
              
              return (
                e.title === clickedEvent.title &&
                eStart.getTime() === clickedStart.getTime()
              );
            }) || {
              // Fallback: create event from FullCalendar's event data
              title: clickedEvent.title,
              start: clickedEvent.start || new Date(),
              end: clickedEvent.end || undefined,
              color: clickedEvent.backgroundColor,
              extendedProps: clickedEvent.extendedProps || {}
            } as CalendarEvent;
            
              setSelectedEvent(event);
              setShowModal(true);
          }}
          themeSystem="standard"
        />
      </div>

      {/* Event Details Modal */}
      {showModal && selectedEvent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-card dark:bg-white/10 dark:border-white/10 rounded-xl shadow-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-primary dark:text-white">
                {selectedEvent.title}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-muted hover:text-primary dark:text-gray-400 dark:hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Date Range Information */}
              <div className="bg-white/5 dark:bg-white/10 rounded-lg p-4 border border-card dark:border-white/10">
                <div className="text-sm font-semibold text-primary dark:text-white mb-3">
                  Date Information
                </div>
                <div className="text-sm text-secondary space-y-2">
                  <div>
                    <strong className="text-primary dark:text-white">Start:</strong>{' '}
                    <span className="text-secondary dark:text-gray-300">
                      {selectedEvent.start instanceof Date 
                        ? selectedEvent.start.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                        : new Date(selectedEvent.start).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                  {selectedEvent.end && (
                    <div>
                      <strong className="text-primary dark:text-white">End:</strong>{' '}
                      <span className="text-secondary dark:text-gray-300">
                        {selectedEvent.end instanceof Date 
                          ? selectedEvent.end.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                          : new Date(selectedEvent.end).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                    </div>
                  )}
                  {selectedEvent.start && selectedEvent.end && (
                    <div className="mt-2 pt-2 border-t border-card dark:border-white/10">
                      <span className="text-xs text-muted dark:text-gray-400">
                        {(() => {
                          const start = selectedEvent.start instanceof Date ? selectedEvent.start : new Date(selectedEvent.start);
                          const end = selectedEvent.end instanceof Date ? selectedEvent.end : new Date(selectedEvent.end);
                          const diffTime = Math.abs(end.getTime() - start.getTime());
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          return diffDays > 1 ? `${diffDays} days` : 'Single day';
                        })()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Event Type Badge */}
              {selectedEvent.extendedProps?.type && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-3 py-1.5 text-xs font-semibold rounded-full capitalize border ${
                    selectedEvent.extendedProps.type === 'holiday' ? 'bg-red-500/30 text-red-300 border-red-500/40' :
                    selectedEvent.extendedProps.type === 'event' ? 'bg-amber-500/30 text-amber-300 border-amber-500/40' :
                    selectedEvent.extendedProps.type === 'notice' ? 'bg-green-500/30 text-green-300 border-green-500/40' :
                    'bg-blue-500/30 text-blue-300 border-blue-500/40'
                  }`}>
                    {selectedEvent.extendedProps.type}
                  </span>
                  {selectedEvent.extendedProps?.offSiteType && (
                    <span className="px-3 py-1.5 text-xs font-semibold rounded-full bg-orange-500/30 text-orange-300 border border-orange-500/40">
                      {selectedEvent.extendedProps.offSiteType === 'my-offsite' ? 'My Off-site' : 'Team Off-site'}
                    </span>
                  )}
                  {selectedEvent.extendedProps?.isCurrentUser && (
                    <span className="px-3 py-1.5 text-xs font-semibold rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                      Your Event
                    </span>
                  )}
                </div>
              )}
              
              {/* Leave Details */}
              {selectedEvent.extendedProps?.employees && selectedEvent.extendedProps.employees.length > 0 ? (
                <div>
                  <div className="text-sm font-semibold text-primary dark:text-white mb-3">
                    {selectedEvent.extendedProps.count && selectedEvent.extendedProps.count > 1 
                      ? `${selectedEvent.extendedProps.count} employees on leave:`
                      : 'Leave Details:'
                    }
                  </div>
                  <div className="space-y-3">
                    {selectedEvent.extendedProps.employees.map((employee: any, index: number) => (
                      <div key={index} className="bg-white/5 dark:bg-white/10 rounded-lg p-4 border border-card dark:border-white/10">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-semibold text-primary dark:text-white text-base mb-2">
                              {employee.name}
                            </div>
                            <div className="text-sm flex items-center gap-2 flex-wrap">
                              <span className="px-2.5 py-1 rounded-full bg-blue-500/30 text-blue-300 border border-blue-500/40 text-xs font-medium">
                                {employee.type}
                              </span>
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                                employee.status === 'approved' 
                                  ? 'bg-green-500/30 text-green-300 border-green-500/40'
                                  : employee.status === 'pending'
                                  ? 'bg-yellow-500/30 text-yellow-300 border-yellow-500/40'
                                  : 'bg-red-500/30 text-red-300 border-red-500/40'
                              }`}>
                                {employee.status}
                              </span>
                            </div>
                            {employee.reason && (
                              <div className="mt-3 p-3 bg-white/5 dark:bg-white/10 rounded-lg border-l-4 border-indigo-500">
                                <div className="text-xs font-semibold text-primary dark:text-white mb-1">
                                  Reason:
                                </div>
                                <div className="text-sm text-secondary dark:text-gray-300">
                                  {employee.reason}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              
              {/* Holiday/Event Details */}
              {selectedEvent.extendedProps?.holidays && selectedEvent.extendedProps.holidays.length > 0 ? (
                <div>
                  <div className="text-sm font-semibold text-primary dark:text-white mb-3">
                    {(selectedEvent.extendedProps.count ?? 0) > 1 
                      ? `${selectedEvent.extendedProps.count} holidays/events:`
                      : 'Holiday/Event Details:'
                    }
                  </div>
                  <div className="space-y-3">
                    {selectedEvent.extendedProps.holidays.map((holiday: any, index: number) => (
                      <div key={index} className="bg-white/5 dark:bg-white/10 rounded-lg p-4 border border-card dark:border-white/10">
                        <div className="font-semibold text-primary dark:text-white text-base mb-2">
                          {holiday.title}
                        </div>
                        {holiday.type && (
                          <div className="text-sm mb-2">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${
                              holiday.type === 'holiday' ? 'bg-red-500/30 text-red-300 border-red-500/40' :
                              holiday.type === 'event' ? 'bg-amber-500/30 text-amber-300 border-amber-500/40' :
                              holiday.type === 'notice' ? 'bg-green-500/30 text-green-300 border-green-500/40' :
                              'bg-purple-500/30 text-purple-300 border-purple-500/40'
                            }`}>
                              {holiday.type}
                            </span>
                          </div>
                        )}
                        {holiday.description && (
                          <div className="mt-3 p-3 bg-white/5 dark:bg-white/10 rounded-lg">
                            <div className="text-xs font-semibold text-primary dark:text-white mb-1">
                              Description:
                            </div>
                            <div className="text-sm text-secondary dark:text-gray-300">
                              {holiday.description}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              
              {/* Off-site Details */}
              {selectedEvent.extendedProps?.offsites && selectedEvent.extendedProps.offsites.length > 0 ? (
                <div>
                  <div className="text-sm font-semibold text-primary dark:text-white mb-3">
                    {(selectedEvent.extendedProps.count ?? 0) > 1 
                      ? `${selectedEvent.extendedProps.count} off-site ${selectedEvent.extendedProps.offSiteType === 'my-offsite' ? 'entries (mine):' : 'entries (team):'}`
                      : 'Off-site Details:'
                    }
                  </div>
                  <div className="space-y-3">
                    {selectedEvent.extendedProps.offsites.map((offsite: any, index: number) => {
                      // Extract user ID first
                      const userId = offsite.user?.id 
                        || offsite.originalOffSite?.user?.id
                        || offsite.originalOffSite?.user_id
                        || offsite.user_id;
                      
                      // Extract user name from multiple possible locations - always prefer name over User ID
                      let userName = offsite.user?.name 
                        || offsite.originalOffSite?.user?.name 
                        || offsite.originalOffSite?.user_name
                        || (userId ? getUserNameById(userId) : null)
                        || null;
                      let userEmail = offsite.user?.email 
                        || offsite.originalOffSite?.user?.email;
                      
                      // If no name but email exists, use email as display name
                      if (!userName && userEmail) {
                        userName = userEmail;
                      }
                      
                      // Also try to get email from users cache if not found
                      if (!userEmail && userId) {
                        const userFromCache: any = usersData?.find((u: any) => String(u.id) === String(userId));
                        if (userFromCache?.email) {
                          userEmail = userFromCache.email;
                          // If we still don't have a name, use email
                          if (!userName && userEmail) {
                            userName = userEmail;
                          }
                        }
                      }
                      const location = offsite.originalOffSite?.location 
                        || offsite.location;
                      const description = offsite.originalOffSite?.description 
                        || offsite.description;
                      const startDate = offsite.originalOffSite?.start_date 
                        || offsite.start_date;
                      const endDate = offsite.originalOffSite?.end_date 
                        || offsite.end_date;
                      
                      return (
                        <div key={index} className="bg-white/5 dark:bg-white/10 rounded-lg p-4 border border-card dark:border-white/10">
                          <div className="font-semibold text-primary dark:text-white text-base mb-3">
                            {offsite.title || offsite.originalOffSite?.title}
                          </div>
                          {(userName || userEmail) && (
                            <div className="text-sm text-secondary dark:text-gray-300 mb-2">
                              <strong className="text-primary dark:text-white">Employee:</strong> {userName || userEmail}
                              {userEmail && userName && userName !== userEmail && (
                                <span className="text-xs text-muted dark:text-gray-400 ml-2">
                                  ({userEmail})
                                </span>
                              )}
                            </div>
                          )}
                          <div className="space-y-1 text-sm">
                            {startDate && (
                              <div className="text-secondary dark:text-gray-300">
                                <strong className="text-primary dark:text-white">Start Date:</strong>{' '}
                                {new Date(startDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                              </div>
                            )}
                            {endDate && (
                              <div className="text-secondary dark:text-gray-300">
                                <strong className="text-primary dark:text-white">End Date:</strong>{' '}
                                {new Date(endDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                              </div>
                            )}
                            {location && (
                              <div className="text-secondary dark:text-gray-300 mt-2">
                                <strong className="text-primary dark:text-white">Location:</strong> {location}
                              </div>
                            )}
                          </div>
                          {description && (
                            <div className="mt-3 p-3 bg-white/5 dark:bg-white/10 rounded-lg">
                              <div className="text-xs font-semibold text-primary dark:text-white mb-1">
                                Description:
                              </div>
                              <div className="text-sm text-secondary dark:text-gray-300">
                                {description}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              
              {/* Birthday Details */}
              {selectedEvent.extendedProps?.type === 'birthday' ? (
                <div className="bg-white/5 dark:bg-white/10 rounded-lg p-4 border border-card dark:border-white/10">
                  <div className="text-base font-semibold text-primary dark:text-white mb-3">
                    🎂 {selectedEvent.extendedProps?.grouped || (selectedEvent.extendedProps?.count && selectedEvent.extendedProps.count > 1)
                      ? `${selectedEvent.extendedProps.count || selectedEvent.extendedProps?.birthdays?.length || 0} Birthdays` 
                      : selectedEvent.title.replace("🎂 ", "").replace("'s Birthday", "")}
                  </div>
                  {selectedEvent.extendedProps?.birthdays && selectedEvent.extendedProps.birthdays.length > 1 ? (
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-primary dark:text-white mb-2">
                        Birthday celebrants:
                      </div>
                      {selectedEvent.extendedProps.birthdays.map((birthday: any, index: number) => (
                        <div key={index} className="text-sm text-secondary dark:text-gray-300 pl-3 border-l-4 border-cyan-500 py-1">
                          🎂 {birthday.name}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-secondary dark:text-gray-300">
                      {selectedEvent.extendedProps?.birthdays?.[0]?.description || 
                       selectedEvent.extendedProps?.description || 
                       `${selectedEvent.title.replace("🎂 ", "").replace("'s Birthday", "")}'s birthday celebration`}
                    </div>
                  )}
                </div>
              ) : null}
              
              {/* Work Anniversary Details */}
              {selectedEvent.extendedProps?.type === 'anniversary' ? (
                <div className="bg-white/5 dark:bg-white/10 rounded-lg p-4 border border-card dark:border-white/10">
                  <div className="text-base font-semibold text-primary dark:text-white mb-3">
                    🎉 {selectedEvent.extendedProps?.grouped || (selectedEvent.extendedProps?.count && selectedEvent.extendedProps.count > 1)
                      ? `${selectedEvent.extendedProps.count || selectedEvent.extendedProps?.anniversaries?.length || 0} Work Anniversaries`
                      : selectedEvent.title.replace("🎉 ", "").replace("'s Work Anniversary", "")}
                  </div>
                  {selectedEvent.extendedProps?.anniversaries && selectedEvent.extendedProps.anniversaries.length > 1 ? (
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-primary dark:text-white mb-2">
                        Celebrations:
                      </div>
                      {selectedEvent.extendedProps.anniversaries.map((a: any, index: number) => (
                        <div key={index} className="text-sm text-secondary dark:text-gray-300 pl-3 border-l-4 border-amber-500 py-1">
                          🎉 {a.name} — {a.years} year{a.years === 1 ? '' : 's'}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-secondary dark:text-gray-300">
                      {(() => {
                        const a = selectedEvent.extendedProps?.anniversaries?.[0];
                        if (a) {
                          return `${a.name} — ${a.years} year${a.years === 1 ? '' : 's'} at the company`;
                        }
                        return selectedEvent.extendedProps?.description || 'Work anniversary';
                      })()}
                    </div>
                  )}
                </div>
              ) : null}
              
              {/* Generic Description */}
              {!selectedEvent.extendedProps?.employees && 
               !selectedEvent.extendedProps?.holidays && 
               !selectedEvent.extendedProps?.offsites && 
               selectedEvent.extendedProps?.type !== 'birthday' &&
               selectedEvent.extendedProps?.description && (
                <div className="bg-white/5 dark:bg-white/10 rounded-lg p-4 border border-card dark:border-white/10">
                  <div className="text-sm font-semibold text-primary dark:text-white mb-2">
                    Description:
                  </div>
                  <div className="text-sm text-secondary dark:text-gray-300">
                    {selectedEvent.extendedProps.description}
                  </div>
                </div>
              )}
              
              {/* Original Holiday Info (for single holidays) */}
              {selectedEvent.extendedProps?.originalHoliday && !selectedEvent.extendedProps?.holidays && (
                <div className="bg-white/5 dark:bg-white/10 rounded-lg p-4 border border-card dark:border-white/10">
                  <div className="font-semibold text-primary dark:text-white text-base mb-2">
                    {selectedEvent.extendedProps.originalHoliday.name || selectedEvent.title}
                  </div>
                  {selectedEvent.extendedProps.originalHoliday.type && (
                    <div className="text-sm mb-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${
                        selectedEvent.extendedProps.originalHoliday.type === 'holiday' ? 'bg-red-500/30 text-red-300 border-red-500/40' :
                        selectedEvent.extendedProps.originalHoliday.type === 'event' ? 'bg-amber-500/30 text-amber-300 border-amber-500/40' :
                        selectedEvent.extendedProps.originalHoliday.type === 'notice' ? 'bg-green-500/30 text-green-300 border-green-500/40' :
                        'bg-purple-500/30 text-purple-300 border-purple-500/40'
                      }`}>
                        {selectedEvent.extendedProps.originalHoliday.type}
                      </span>
                    </div>
                  )}
                  {selectedEvent.extendedProps.originalHoliday.description && (
                    <div className="mt-3 p-3 bg-white/5 dark:bg-white/10 rounded-lg">
                      <div className="text-xs font-semibold text-primary dark:text-white mb-1">
                        Description:
                      </div>
                      <div className="text-sm text-secondary dark:text-gray-300">
                        {selectedEvent.extendedProps.originalHoliday.description}
                      </div>
                    </div>
                  )}
                  {(selectedEvent.extendedProps.originalHoliday.date || selectedEvent.extendedProps.originalHoliday.date_range) && (
                    <div className="mt-3 pt-3 border-t border-card dark:border-white/10 text-xs text-muted dark:text-gray-400">
                      {selectedEvent.extendedProps.originalHoliday.date_range 
                        ? `Date Range: ${selectedEvent.extendedProps.originalHoliday.date_range}`
                        : selectedEvent.extendedProps.originalHoliday.date 
                        ? `Date: ${new Date(selectedEvent.extendedProps.originalHoliday.date).toLocaleDateString()}`
                        : ''}
                    </div>
                  )}
                </div>
              )}
              
              {/* Original Leave Info (for single leaves) */}
              {selectedEvent.extendedProps?.originalLeave && !selectedEvent.extendedProps?.employees && (
                <div className="bg-white/5 dark:bg-white/10 rounded-lg p-4 border border-card dark:border-white/10">
                  <div className="font-semibold text-primary dark:text-white text-base mb-3">
                    {selectedEvent.extendedProps.originalLeave.user?.name || 'Employee'} - {selectedEvent.extendedProps.originalLeave.type}
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-full bg-blue-500/30 text-blue-300 border border-blue-500/40 text-xs font-medium">
                        {selectedEvent.extendedProps.originalLeave.type}
                      </span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        selectedEvent.extendedProps.originalLeave.status === 'approved' 
                          ? 'bg-green-500/30 text-green-300 border-green-500/40'
                          : selectedEvent.extendedProps.originalLeave.status === 'pending'
                          ? 'bg-yellow-500/30 text-yellow-300 border-yellow-500/40'
                          : 'bg-red-500/30 text-red-300 border-red-500/40'
                      }`}>
                        {selectedEvent.extendedProps.originalLeave.status}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {(selectedEvent.extendedProps.originalLeave.from_date || selectedEvent.extendedProps.originalLeave.from) && (
                        <div className="text-secondary dark:text-gray-300">
                          <strong className="text-primary dark:text-white">From:</strong>{' '}
                          {new Date(selectedEvent.extendedProps.originalLeave.from_date || selectedEvent.extendedProps.originalLeave.from).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                      )}
                      {(selectedEvent.extendedProps.originalLeave.to_date || selectedEvent.extendedProps.originalLeave.to) && (
                        <div className="text-secondary dark:text-gray-300">
                          <strong className="text-primary dark:text-white">To:</strong>{' '}
                          {new Date(selectedEvent.extendedProps.originalLeave.to_date || selectedEvent.extendedProps.originalLeave.to).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                      )}
                      {selectedEvent.extendedProps.originalLeave.days && (
                        <div className="text-secondary dark:text-gray-300">
                          <strong className="text-primary dark:text-white">Duration:</strong> {selectedEvent.extendedProps.originalLeave.days} day{selectedEvent.extendedProps.originalLeave.days !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                    {selectedEvent.extendedProps.originalLeave.reason && (
                      <div className="mt-3 p-3 bg-white/5 dark:bg-white/10 rounded-lg border-l-4 border-indigo-500">
                        <div className="text-xs font-semibold text-primary dark:text-white mb-1">
                          Reason:
                        </div>
                        <div className="text-sm text-secondary dark:text-gray-300">
                          {selectedEvent.extendedProps.originalLeave.reason}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Original Off-site Info (for single off-sites) */}
              {selectedEvent.extendedProps?.originalOffSite && !selectedEvent.extendedProps?.offsites && (
                <div className="bg-white/5 dark:bg-white/10 rounded-lg p-4 border border-card dark:border-white/10">
                  <div className="font-semibold text-primary dark:text-white text-base mb-3">
                    {selectedEvent.extendedProps.originalOffSite.title}
                  </div>
                  <div className="space-y-2 text-sm">
                    {/* Extract user name from multiple possible locations - always prefer name over User ID */}
                    {(() => {
                      const offSite = selectedEvent.extendedProps.originalOffSite;
                      const userId = offSite.user?.id || offSite.user_id;
                      const userName = offSite.user?.name 
                        || offSite.user_name
                        || (userId ? getUserNameById(userId) : null)
                        || null;
                      const userEmail = offSite.user?.email;
                      
                      return userName ? (
                        <div className="text-secondary dark:text-gray-300 mb-2">
                          <strong className="text-primary dark:text-white">Employee:</strong> {userName}
                          {userEmail && (
                            <span className="text-xs text-muted dark:text-gray-400 ml-2">
                              ({userEmail})
                            </span>
                          )}
                        </div>
                      ) : null;
                    })()}
                    <div className="space-y-1">
                      {selectedEvent.extendedProps.originalOffSite.start_date && (
                        <div className="text-secondary dark:text-gray-300">
                          <strong className="text-primary dark:text-white">Start Date:</strong>{' '}
                          {new Date(selectedEvent.extendedProps.originalOffSite.start_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                      )}
                      {selectedEvent.extendedProps.originalOffSite.end_date && (
                        <div className="text-secondary dark:text-gray-300">
                          <strong className="text-primary dark:text-white">End Date:</strong>{' '}
                          {new Date(selectedEvent.extendedProps.originalOffSite.end_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                      )}
                      {selectedEvent.extendedProps.originalOffSite.location && (
                        <div className="text-secondary dark:text-gray-300 mt-2">
                          <strong className="text-primary dark:text-white">Location:</strong> {selectedEvent.extendedProps.originalOffSite.location}
                        </div>
                      )}
                    </div>
                    {selectedEvent.extendedProps.originalOffSite.description && (
                      <div className="mt-3 p-3 bg-white/5 dark:bg-white/10 rounded-lg">
                        <div className="text-xs font-semibold text-primary dark:text-white mb-1">
                          Description:
                        </div>
                        <div className="text-sm text-secondary dark:text-gray-300">
                          {selectedEvent.extendedProps.originalOffSite.description}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Fallback if no extended props */}
              {!selectedEvent.extendedProps?.employees && 
               !selectedEvent.extendedProps?.holidays && 
               !selectedEvent.extendedProps?.offsites && 
               selectedEvent.extendedProps?.type !== 'birthday' &&
               !selectedEvent.extendedProps?.description &&
               !selectedEvent.extendedProps?.originalHoliday &&
               !selectedEvent.extendedProps?.originalLeave &&
               !selectedEvent.extendedProps?.originalOffSite && (
                <div className="text-sm text-secondary dark:text-gray-400 text-center py-4">
                  <p>No additional details available for this event.</p>
                  <p className="text-xs text-muted dark:text-gray-500 mt-2">
                    Click on other events to see more information.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
