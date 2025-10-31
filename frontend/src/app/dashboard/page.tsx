"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getDashboardStats, getCurrentUser, getLeaves, getOffSites } from "../../lib/api";
import Loader from "../../components/Loader";
import LeaveBalanceCard from "../../components/LeaveBalanceCard";
import Calendar from "../../components/Calendar";
import Card from "@/components/ui/Card";
import { motion } from "framer-motion";
import RoleGuard from "../../components/RoleGuard";
import Link from "next/link";
import { FileText } from "lucide-react";

export default function DashboardPage() {
  const user = getCurrentUser();
  const userId = user?.id || "u1";
  const userRole = user?.role || "Employee";


  // Single API call for all dashboard data
  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ["dashboard-data"],
    queryFn: getDashboardStats,
  });

  // For managers: fetch team leaves; others may rely on dashboard stats or own leaves
  const roleStr = String(userRole);
  const { data: teamLeaves } = useQuery({
    queryKey: ["team-leaves", new Date().getMonth()],
    queryFn: () => getLeaves({ view: "team", status: "approved" }),
    enabled: (roleStr === "Manager") || (roleStr === "HR") || (roleStr === "Admin") || (roleStr === "God"),
  });

  const { data: teamOffSites } = useQuery({
    queryKey: ["team-offsites", new Date().getMonth()],
    queryFn: () => getOffSites({ view: "team" }),
    enabled: (roleStr === "Manager") || (roleStr === "HR") || (roleStr === "Admin") || (roleStr === "God"),
  });


  if (isLoading) return <Loader />;


  if (error) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Dashboard</h1>
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
          <h3 className="text-red-400 font-semibold mb-2">Error loading dashboard data</h3>
          <p className="text-red-300 text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  // Group leaves by date for Admin/HR users
  const groupLeavesByDate = (leaves: any[]) => {
    const grouped: { [key: string]: any[] } = {};
    
    leaves.forEach((leave) => {
      const startDate = new Date(leave.from_date || leave.from);
      const endDate = new Date(leave.to_date || leave.to);
      
      // Add leave to each date in the range
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split('T')[0];
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(leave);
      }
    });
    
    return grouped;
  };

  // Create calendar events with grouping for Admin/HR users
  const createCalendarEvents = () => {
    const events: any[] = [];
    
    
    // Add holidays (robust multi-day parsing)
    events.push(...(dashboardData?.data?.upcoming_holidays || [])
      .filter((h: any) => h.isCalendarEvent !== false)
      .map((h: any) => {
        const range = h.date_range || h.dateRange;
        if (range) {
          // Multi-day event (support "to" or "-" separators). End is exclusive for all-day.
          let parts = String(range).includes(" to ") ? String(range).split(" to ") : String(range).split("-");
          if (parts.length >= 2) {
            const startDate = new Date(parts[0].trim());
            const endInclusive = new Date(parts[1].trim());
          const endExclusive = new Date(endInclusive);
          endExclusive.setDate(endExclusive.getDate() + 1); // make inclusive visible
          return {
            title: h.name || h.title,
            start: startDate,
            end: endExclusive,
            allDay: true,
            color: h.color || (h.type === 'holiday' ? "#ef4444" : h.type === 'event' ? "#ec4899" : h.type === 'notice' ? "#8b5cf6" : "#10b981"),
            extendedProps: {
              type: h.type || 'holiday',
              description: h.description
            }
          };
          }
        } else if (h.date) {
          // Single day event
          return {
            title: h.name || h.title,
            start: new Date(h.date),
            end: new Date(new Date(h.date).getTime() + 24*60*60*1000), // exclusive end for single all-day
            allDay: true,
            color: h.color || (h.type === 'holiday' ? "#ef4444" : h.type === 'event' ? "#ec4899" : h.type === 'notice' ? "#8b5cf6" : "#10b981"),
            extendedProps: {
              type: h.type || 'holiday',
              description: h.description
            }
          };
        } else {
          // Holiday without specific date (like "Christmas Vacation")
          // Show it on today's date as a special event
          const today = new Date();
          return {
            title: h.name || h.title,
            start: today,
            end: today,
            color: h.color || (h.type === 'holiday' ? "#ef4444" : h.type === 'event' ? "#ec4899" : h.type === 'notice' ? "#8b5cf6" : "#10b981"),
            extendedProps: {
              type: h.type || 'holiday',
              description: h.description,
              noSpecificDate: true
            }
          };
        }
      }));

    // Add off-site entries (separate My vs Team)
    const myOffSites = (dashboardData?.data?.recent_off_sites || [])
      .filter((o: any) => o.start_date && o.end_date);

    events.push(...myOffSites.map((o: any) => {
      const start = new Date(o.start_date);
      const endInclusive = new Date(o.end_date);
      const endExclusive = new Date(endInclusive);
      endExclusive.setDate(endExclusive.getDate() + 1);
      return ({
        title: `${o.title}`,
        start,
        end: endExclusive,
        allDay: true,
        color: "#fb923c", // My Off-site
        extendedProps: {
          type: 'offsite',
          isCurrentUser: true,
        }
      });
    }));

    const isManagerOrAbove = (roleStr === "Manager") || (roleStr === "HR") || (roleStr === "Admin") || (roleStr === "God");
    if (isManagerOrAbove) {
      const teamOff = (teamOffSites?.data || [])
        .filter((o: any) => o.start_date && o.end_date)
        .filter((o: any) => String(o.user_id) !== String(userId)); // exclude mine to avoid dupes

      events.push(...teamOff.map((o: any) => {
        const start = new Date(o.start_date);
        const endInclusive = new Date(o.end_date);
        const endExclusive = new Date(endInclusive);
        endExclusive.setDate(endExclusive.getDate() + 1);
        return ({
          title: `${o.user?.name ? o.user.name + ' - ' : ''}${o.title}`,
          start,
          end: endExclusive,
          allDay: true,
          color: "#f97316", // Team Off-site
          extendedProps: {
            type: 'offsite',
            isCurrentUser: false,
          }
        });
      }));
    }

    // Add birthdays - show for multiple years to make them appear as repeating events
    const currentYear = new Date().getFullYear();
    events.push(...(dashboardData?.data?.user_birthdays || [])
      .filter((b: any) => b.birthday_visible)
      .flatMap((b: any) => {
        const birthdayDate = new Date(b.birthday);
        const birthdays = [];

        // Show birthdays for current year and next 2 years
        for (let yearOffset = 0; yearOffset < 3; yearOffset++) {
          const birthdayThisYear = new Date(currentYear + yearOffset, birthdayDate.getMonth(), birthdayDate.getDate());

          // Only show if the birthday hasn't passed in the current year (for current year only)
          if (yearOffset === 0 && birthdayThisYear < new Date()) {
            continue; // Skip past birthdays in current year
          }

          birthdays.push({
            title: `🎂 ${b.name}'s Birthday`,
            start: birthdayThisYear,
            end: birthdayThisYear,
            color: "#06b6d4", // Cyan color for birthdays
            extendedProps: {
              type: 'birthday',
              description: `${b.name}'s birthday`
            }
          });
        }

        return birthdays;
      }));

    // Add leaves with grouping by day for privileged roles; personal multi-day bars for employees
    const leavesRecent = (dashboardData?.data?.recent_leaves || []).filter((leave: any) => leave.status === 'approved');
    const leavesTeam = (teamLeaves?.data || []).filter((leave: any) => leave.status === 'approved');

    // Merge and de-duplicate by id
    const leavesById: Record<string, any> = {};
    [...leavesRecent, ...leavesTeam].forEach((lv: any) => {
      if (lv && (lv.id != null)) leavesById[String(lv.id)] = lv;
    });

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
    const overlapsMonth = (from: Date, to: Date) => !(to < monthStart || from > monthEnd);

    const isPrivileged = roleStr === "Manager" || roleStr === "HR" || roleStr === "Admin" || roleStr === "God";

    if (isPrivileged) {
      // Group team leaves by day
      const byDate: Record<string, any[]> = {};
      Object.values(leavesById).forEach((l: any) => {
        const start = new Date(l.from_date || l.from);
        const endInclusive = new Date(l.to_date || l.to);
        if (!overlapsMonth(start, endInclusive)) return;
        // iterate through each date in range
        const cur = new Date(Math.max(start.getTime(), monthStart.getTime()));
        const last = new Date(Math.min(endInclusive.getTime(), monthEnd.getTime()));
        for (let d = new Date(cur); d <= last; d.setDate(d.getDate() + 1)) {
          const key = d.toISOString().split('T')[0];
          if (!byDate[key]) byDate[key] = [];
          byDate[key].push(l);
        }
      });

      Object.entries(byDate).forEach(([dateKey, dayLeaves]) => {
        const date = new Date(dateKey);
        const endExclusive = new Date(date);
        endExclusive.setDate(endExclusive.getDate() + 1);
        const currentUserInGroup = dayLeaves.some((l: any) => String(l.user_id) === String(userId));

        if (dayLeaves.length > 1) {
          // Grouped event with count and employee list
          events.push({
            title: `${dayLeaves.length} employees on leave`,
            start: date,
            end: endExclusive,
            allDay: true,
            color: "#6366f1",
            extendedProps: {
              type: 'leave',
              employees: dayLeaves.map((l: any) => ({
                name: l.user?.name || 'Employee',
                type: l.type,
                status: l.status,
                reason: l.reason,
              })),
              count: dayLeaves.length,
              hasCurrentUser: currentUserInGroup,
            },
          });
        } else {
          // Single leave for that day
          const l = dayLeaves[0];
          const isCurrentUser = String(l.user_id) === String(userId);
          events.push({
            title: `${l.user?.name || (isCurrentUser ? 'You' : 'Employee')} - ${l.type}`,
            start: date,
            end: endExclusive,
            allDay: true,
            color: "#6366f1",
            extendedProps: {
              type: 'leave',
              employees: [{
                name: l.user?.name || (isCurrentUser ? 'You' : 'Employee'),
                type: l.type,
                status: l.status,
                reason: l.reason,
              }],
              count: 1,
              isCurrentUser,
            },
          });
        }
      });
    } else {
      // Regular employee: show own leaves as multi-day bars
      Object.values(leavesById).forEach((l: any) => {
        const isCurrentUser = String(l.user_id) === String(userId);
        if (!isCurrentUser) return;
        const start = new Date(l.from_date || l.from);
        const endInclusive = new Date(l.to_date || l.to);
        if (!overlapsMonth(start, endInclusive)) return;
        const endExclusive = new Date(endInclusive);
        endExclusive.setDate(endExclusive.getDate() + 1);
        events.push({
          title: l.type,
          start,
          end: endExclusive,
          allDay: true,
          color: "#10b981",
          extendedProps: {
            type: 'leave',
            employees: [{
              name: l.user?.name || 'You',
              type: l.type,
              status: l.status,
              reason: l.reason,
            }],
            count: 1,
            isCurrentUser: true,
          },
        });
      });
    }

    // Ensure at least one sample for each legend category in the current month
    const now = new Date(monthStart);

    const isInCurrentMonth = (d: Date | string) => {
      const dt = d instanceof Date ? d : new Date(d);
      return dt >= monthStart && dt <= monthEnd;
    };

    const hasTypeInMonth = (type: string, predicate?: (e: any) => boolean) =>
      events.some((e) => {
        const matchesType = e.extendedProps?.type === type;
        const inMonth = isInCurrentMonth(e.start);
        const ok = predicate ? predicate(e) : true;
        return matchesType && inMonth && ok;
      });

    // Choose distinct days for samples to avoid overlap
    const dayFor = (offset: number) => new Date(now.getFullYear(), now.getMonth(), Math.min(1 + offset, monthEnd.getDate()));

    const maybePushSample = (
      condition: boolean,
      sample: { title: string; color: string; type: string; dayOffset: number; extra?: any }
    ) => {
      if (!condition) {
        const start = dayFor(sample.dayOffset);
        const endExclusive = new Date(start);
        endExclusive.setDate(endExclusive.getDate() + 1);
        events.push({
          title: sample.title,
          start,
          end: endExclusive,
          allDay: true,
          color: sample.color,
          extendedProps: { type: sample.type, __sample: true, ...(sample.extra || {}) },
        });
      }
    };

    // Samples based on legend and role
    const isPrivilegedSamples = userRole === "HR" || userRole === "Admin" || userRole === "God" || userRole === "Manager";

    if (isPrivilegedSamples) {
      // Only Team Leaves sample for privileged users
      maybePushSample(
        hasTypeInMonth('leave'),
        { title: 'Team Leave (sample)', color: '#6366f1', type: 'leave', dayOffset: 1 }
      );
    } else {
      // Only your leaves for employees
      maybePushSample(
        hasTypeInMonth('leave', (e) => e.extendedProps?.isCurrentUser === true),
        { title: 'Your Leave (sample)', color: '#10b981', type: 'leave', dayOffset: 0, extra: { isCurrentUser: true } }
      );
    }

    // Off-site samples
    if (isPrivilegedSamples) {
      maybePushSample(
        hasTypeInMonth('offsite', (e) => e.color === '#fb923c'),
        { title: 'My Off-site (sample)', color: '#fb923c', type: 'offsite', dayOffset: 5 }
      );
      maybePushSample(
        hasTypeInMonth('offsite', (e) => e.color === '#f97316'),
        { title: 'Team Off-site (sample)', color: '#f97316', type: 'offsite', dayOffset: 6 }
      );
    } else {
      maybePushSample(
        hasTypeInMonth('offsite'),
        { title: 'Off-site (sample)', color: '#f97316', type: 'offsite', dayOffset: 5 }
      );
    }

    // Holidays
    maybePushSample(
      hasTypeInMonth('holiday'),
      { title: 'Holiday (sample)', color: '#ef4444', type: 'holiday', dayOffset: 2 }
    );

    // Events
    maybePushSample(
      hasTypeInMonth('event'),
      { title: 'Event (sample)', color: '#ec4899', type: 'event', dayOffset: 3 }
    );

    // Notices
    maybePushSample(
      hasTypeInMonth('notice'),
      { title: 'Notice (sample)', color: '#8b5cf6', type: 'notice', dayOffset: 4 }
    );

    // Birthdays
    maybePushSample(
      hasTypeInMonth('birthday'),
      { title: 'Birthday (sample)', color: '#06b6d4', type: 'birthday', dayOffset: 6 }
    );

    return events;
  };

  return (
    <main className="space-y-8" role="main" aria-label="Dashboard overview">
      {/* AI-Friendly Page Structure */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "HR Portal Dashboard",
            "description": "Overview of HR metrics, employee activities, and organizational data",
            "url": typeof window !== 'undefined' ? window.location.href : '',
            "isPartOf": {
              "@type": "WebSite",
              "name": "HR Portal"
            },
            "about": {
              "@type": "Organization",
              "name": "HR Management System"
            },
            "mainEntity": {
              "@type": "ItemList",
              "name": "Dashboard Metrics",
              "itemListElement": [
                {
                  "@type": "ListItem",
                  "name": "Leave Balances",
                  "description": "Current leave balances for all employees"
                },
                {
                  "@type": "ListItem", 
                  "name": "Upcoming Events",
                  "description": "Holidays, notices, and important dates"
                },
                {
                  "@type": "ListItem",
                  "name": "Recent Activities",
                  "description": "Recent leaves, documents, and off-site entries"
                },
                {
                  "@type": "ListItem",
                  "name": "Calendar View",
                  "description": "Monthly calendar with events and activities"
                }
              ]
            }
          })
        }}
      />

      <header>
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-gray-400 mt-2">
          Overview of HR metrics, employee activities, and organizational data
        </p>
      </header>


      {/* Leave Balances */}
      <section aria-labelledby="leave-balances-heading">
        <h2 id="leave-balances-heading" className="sr-only">Leave Balances</h2>
        <LeaveBalanceCard balance={dashboardData?.data?.leave_balances || []} />
      </section>

      {/* Events & Notices */}
      <section aria-labelledby="events-notices-heading">
        <h2 id="events-notices-heading" className="sr-only">Upcoming Events & Notices</h2>
        <Card title="Upcoming Events & Notices">
        <div className="space-y-3">
          
          {(dashboardData?.data?.upcoming_holidays || [])
            .filter((h: any) => {
              // Include notices without dates, and dated events that are today or future
              if (!h.date && h.type === 'notice') return true;
              if (!h.date) return false;
              const eventDate = new Date(h.date);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return eventDate >= today;
            })
            .sort((a: any, b: any) => {
              // Notices without dates go first, then sort by date
              if (!a.date && !b.date) return 0;
              if (!a.date) return -1;
              if (!b.date) return 1;
              return new Date(a.date).getTime() - new Date(b.date).getTime();
            })
            .slice(0, 3)
            .map((event: any) => (
              <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="text-lg">
                  {event.type === 'event' ? "📅" : event.type === 'notice' ? "📢" : "🎊"}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-primary">{event.name || event.title}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      event.type === 'holiday' ? 'bg-red-500/20 text-red-400' :
                      event.type === 'event' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-purple-500/20 text-purple-400'
                    }`}>
                      {event.type || 'holiday'}
                    </span>
                  </div>
                  {event.date ? (
                    <p className="text-sm text-secondary">
                      {new Date(event.date).toLocaleDateString('en-US', { 
                        weekday: 'short',
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </p>
                  ) : (
                    <p className="text-sm text-secondary">📢 Ongoing Notice</p>
                  )}
                  {event.description && (
                    <p className="text-sm text-gray-400 mt-1">{event.description}</p>
                  )}
                </div>
              </div>
            ))}
          {(dashboardData?.data?.upcoming_holidays || []).filter((h: any) => {
            // Include notices without dates, and dated events that are today or future
            if (!h.date && h.type === 'notice') return true;
            if (!h.date) return false;
            const eventDate = new Date(h.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return eventDate >= today;
          }).length === 0 && (
            <div className="text-center text-gray-400 py-4">
              No upcoming events or notices
            </div>
          )}
        </div>
        <div className="mt-4 pt-4 border-t border-white/10">
          <Link href="/holidays" className="text-sm text-indigo-400 hover:text-indigo-300">
            View all events & notices →
          </Link>
        </div>
      </Card>
      </section>

      <div className="space-y-6">
        {/* Calendar or List (responsive) */}
        <section aria-labelledby="calendar-heading">
          <h2 id="calendar-heading" className="sr-only">Calendar View</h2>
          <Card title="Upcoming Leaves & Holidays">
      <div className="hidden sm:block">
        <Calendar events={createCalendarEvents()} userRole={userRole} />
      </div>
          <div className="sm:hidden space-y-3">
            {createCalendarEvents()
              // include ongoing multi-day events (end is exclusive)
              .filter((e) => new Date(e.end) > new Date(new Date().toDateString()))
              .slice(0, 3)
              .map((e, index) => (
                <div key={`mobile-${index}`} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className={`w-2 h-8 rounded`} style={{ backgroundColor: e.color }} />
                  <div>
                    <div className="text-sm text-gray-300">{e.title}</div>
                    <div className="text-xs text-gray-400">
                      {e.start instanceof Date
                        ? e.start.toLocaleDateString()
                        : new Date(e.start).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </Card>
        </section>

        {/* Recent Documents - compact */}
        <Card className="p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold">Recent Documents</h3>
            <button
              onClick={() => window.location.href = '/documents'}
              className="text-indigo-400 hover:text-indigo-300 text-sm font-medium"
            >
              View All
            </button>
          </div>
          <ul className="divide-y divide-gray-700 text-sm">
              {(dashboardData?.data?.recent_documents || [])
                .filter((doc: any) => {
                  // Filter out private documents for non-HR/Admin users
                  if (userRole === "HR" || userRole === "Admin" || userRole === "God") {
                    return true; // HR/Admin can see all documents
                  }
                  return doc.isPublic || doc.user_id === userId; // Employees can only see public docs or their own
                })
                .slice(0, 3).map((doc: any) => (
              <li key={doc.id} className="py-2 flex justify-between items-center">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white flex-shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="truncate block font-medium">{doc.title}</span>
                    <span className="text-xs text-gray-400">{doc.category}</span>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/documents/${doc.id}/download`, {
                        headers: {
                          'Authorization': `Bearer ${localStorage.getItem('token')}`,
                          'X-Organization-ID': localStorage.getItem('organizationId') || '',
                        },
                      });
                      const data = await response.json();
                      if (data.fileUrl) {
                        if (data.fileUrl.toLowerCase().endsWith('.pdf')) {
                          // Open PDF in custom viewer
                          const encodedUrl = encodeURIComponent(data.fileUrl);
                          const encodedTitle = encodeURIComponent(doc.title);
                          window.open(`/pdf?url=${encodedUrl}&title=${encodedTitle}`, '_blank');
                        } else {
                          window.open(data.fileUrl, '_blank');
                        }
                      }
                    } catch (error) {
                      // Failed to download document
                    }
                  }}
                  className="text-indigo-400 hover:underline"
                >
                  {doc.fileUrl?.toLowerCase().endsWith('.pdf') ? 'View PDF' : 'View'}
                </button>
              </li>
            ))}
          {((dashboardData?.data?.recent_documents || []).length || 0) === 0 && (
            <li className="text-gray-400 py-4 text-center">No documents available</li>
          )}
        </ul>
      </Card>

        {/* Recent Salary Slips - compact */}
        <Card title="Recent Salary Slips" className="p-4">
          <ul className="divide-y divide-gray-700 text-sm">
            {(dashboardData?.data?.recent_salary_slips || []).slice(0, 3).map((slip: any) => (
              <li key={slip.id} className="py-2 flex justify-between items-center">
                <span className="truncate pr-3">
                  {new Date(slip.year, slip.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/salary-slips/${slip.id}/download`, {
                        headers: {
                          'Authorization': `Bearer ${localStorage.getItem('token')}`,
                          'X-Organization-ID': localStorage.getItem('organizationId') || '',
                        },
                      });
                      const data = await response.json();
                      if (data.fileUrl) {
                        window.open(data.fileUrl, '_blank');
                      }
                    } catch (error) {
                      // Failed to download salary slip
                    }
                  }}
                  className="text-indigo-400 hover:underline"
                >
                  View
                </button>
              </li>
            ))}
            {((dashboardData?.data?.recent_salary_slips || []).length || 0) === 0 && (
              <li className="text-gray-400">No salary slips</li>
            )}
          </ul>
        </Card>
      </div>
    </main>
  );
}
