"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getDashboardStats, getCurrentUser } from "../../lib/api";
import Loader from "../../components/Loader";
import LeaveBalanceCard from "../../components/LeaveBalanceCard";
import Calendar from "../../components/Calendar";
import Card from "@/components/ui/Card";
import { GlassCard } from "@/components/ui/glass";
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


  if (isLoading) return <Loader />;


  if (error) {
    return (
      <div className="space-y-6">
        <GlassCard className="p-6" variant="gradient">
          <header>
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-gray-200 mt-3 text-lg">
              Overview of HR metrics, employee activities, and organizational data
            </p>
          </header>
        </GlassCard>
        <GlassCard variant="default">
          <div className="p-6">
            <h3 className="text-liquid-accent-red font-semibold mb-3 text-xl">Error loading dashboard data</h3>
            <p className="text-gray-600 dark:text-gray-300">{error.message}</p>
          </div>
        </GlassCard>
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
    
    
    // Add holidays
    events.push(...(dashboardData?.data?.upcoming_holidays || [])
      .filter((h: any) => h.isCalendarEvent !== false)
      .map((h: any) => {
        if (h.date_range) {
          // Multi-day event
          const [start, end] = h.date_range.split(" to ");
          return {
            title: h.name || h.title,
            start: new Date(start.trim()),
            end: new Date(end.trim()),
            color: h.color || (h.type === 'holiday' ? "#ef4444" : h.type === 'event' ? "#ec4899" : h.type === 'notice' ? "#8b5cf6" : "#10b981"),
            extendedProps: {
              type: h.type || 'holiday',
              description: h.description
            }
          };
        } else if (h.date) {
          // Single day event
          return {
            title: h.name || h.title,
            start: new Date(h.date),
            end: new Date(h.date),
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

    // Add off-site entries
    events.push(...(dashboardData?.data?.recent_off_sites || [])
      .filter((o: any) => o.start_date && o.end_date)
      .map((o: any) => ({
        title: `${o.title}`,
        start: new Date(o.start_date),
        end: new Date(o.end_date),
        color: "#f97316",
        extendedProps: {
          type: 'offsite'
        }
      })));

    // Add birthdays
    events.push(...(dashboardData?.data?.user_birthdays || [])
      .filter((b: any) => b.birthday_visible)
      .map((b: any) => {
        const birthdayDate = new Date(b.birthday);
        const currentYear = new Date().getFullYear();
        const birthdayThisYear = new Date(currentYear, birthdayDate.getMonth(), birthdayDate.getDate());

        // If birthday has passed this year, show next year's birthday
        if (birthdayThisYear < new Date()) {
          birthdayThisYear.setFullYear(currentYear + 1);
        }

        return {
          title: `🎂 ${b.name}'s Birthday`,
          start: birthdayThisYear,
          end: birthdayThisYear,
          color: "#06b6d4", // Cyan color for birthdays
          extendedProps: {
            type: 'birthday',
            description: `${b.name}'s birthday`
          }
        };
      }));

    // Add leaves with grouping for Admin/HR users - only approved leaves
    const leaves = (dashboardData?.data?.recent_leaves || []).filter((leave: any) => leave.status === 'approved');
    
    if (userRole === "HR" || userRole === "Admin" || userRole === "God") {
      // Group leaves by date
      const groupedLeaves = groupLeavesByDate(leaves);
      
      Object.entries(groupedLeaves).forEach(([date, dayLeaves]) => {
        // Check if current user is in this group
        const currentUserInGroup = dayLeaves.some((leave: any) => String(leave.user_id) === String(userId));
        
        if (dayLeaves.length === 1) {
          // Single leave - show normally
          const leave = dayLeaves[0];
          const isCurrentUser = String(leave.user_id) === String(userId);
          events.push({
            title: `${leave.user?.name || 'Employee'} - ${leave.type}`,
            start: new Date(date),
            end: new Date(date),
            color: isCurrentUser ? "#10b981" : "#6366f1", // Green for current user, indigo for others
            extendedProps: {
              type: 'leave',
              employees: [{
                name: leave.user?.name || 'Employee',
                type: leave.type,
                status: leave.status,
                reason: leave.reason
              }],
              count: 1,
              isCurrentUser
            }
          });
        } else {
          // Multiple leaves - show grouped
          const color = currentUserInGroup ? "#10b981" : "#6366f1"; // Green if current user is in group, indigo otherwise
          events.push({
            title: `${dayLeaves.length} employees on leave`,
            start: new Date(date),
            end: new Date(date),
            color,
            extendedProps: {
              type: 'leave',
              employees: dayLeaves.map((leave: any) => ({
                name: leave.user?.name || 'Employee',
                type: leave.type,
                status: leave.status,
                reason: leave.reason
              })),
              count: dayLeaves.length,
              hasCurrentUser: currentUserInGroup
            }
          });
        }
      });
    } else {
      // Regular employees - show only their own approved leaves
      
      const myLeaves = leaves.filter((l: any) => String(l.user_id) === String(userId));
      
      events.push(...myLeaves.map((l: any) => ({
          title: l.type,
          start: new Date(l.from_date || l.from),
          end: new Date(l.to_date || l.to),
          color: "#10b981", // Green for current user's leaves
          extendedProps: {
            type: 'leave',
            employees: [{
              name: l.user?.name || 'You',
              type: l.type,
              status: l.status,
              reason: l.reason
            }],
            count: 1,
            isCurrentUser: true
          }
        })));
    }

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

      <GlassCard className="p-6" variant="gradient">
        <header>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-gray-200 mt-3 text-lg">
            Overview of HR metrics, employee activities, and organizational data
          </p>
        </header>
      </GlassCard>


      {/* Leave Balances */}
      <section aria-labelledby="leave-balances-heading">
        <h2 id="leave-balances-heading" className="sr-only">Leave Balances</h2>
        <LeaveBalanceCard balance={dashboardData?.data?.leave_balances || []} />
      </section>

      {/* Events & Notices */}
      <section aria-labelledby="events-notices-heading">
        <h2 id="events-notices-heading" className="sr-only">Upcoming Events & Notices</h2>
        <GlassCard>
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Upcoming Events & Notices</h3>
            <div className="space-y-4">
          
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
              <div key={event.id} className="flex items-start gap-4 p-4 rounded-liquid-md bg-liquid-glass-white dark:bg-liquid-glass-black border border-white/20 shadow-liquid">
                <div className="text-2xl">
                  {event.type === 'event' ? "📅" : event.type === 'notice' ? "📢" : "🎊"}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-primary">{event.name || event.title}</h4>
                    <span className={`px-3 py-1 rounded-liquid-sm text-xs font-medium ${
                      event.type === 'holiday' ? 'bg-liquid-accent-red/20 text-liquid-accent-red' :
                      event.type === 'event' ? 'bg-liquid-secondary/20 text-liquid-secondary-orange' :
                      event.type === 'notice' ? 'bg-liquid-primary/20 text-liquid-primary-purple' :
                      'bg-liquid-accent-green/20 text-liquid-accent-green'
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
            <div className="mt-4 pt-4 border-t border-white/20">
              <Link href="/holidays" className="text-sm text-liquid-primary-purple hover:text-liquid-primary-purple-light transition-colors">
                View all events & notices →
              </Link>
            </div>
          </div>
        </GlassCard>
      </section>

      <div className="space-y-6">
        {/* Calendar or List (responsive) */}
        <section aria-labelledby="calendar-heading">
          <h2 id="calendar-heading" className="sr-only">Calendar View</h2>
          <GlassCard>
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Upcoming Leaves & Holidays</h3>
              <div className="hidden sm:block">
                <Calendar events={createCalendarEvents()} userRole={userRole} />
              </div>
              <div className="sm:hidden space-y-3">
                {createCalendarEvents()
                  .filter((e) => new Date(e.start) >= new Date(new Date().toDateString()))
                  .slice(0, 3)
                  .map((e, index) => (
                    <div key={`mobile-${index}`} className="flex items-center gap-4 p-4 rounded-liquid-md bg-liquid-glass-white dark:bg-liquid-glass-black border border-white/20 shadow-liquid">
                      <div className={`w-3 h-10 rounded-liquid-sm`} style={{ backgroundColor: e.color }} />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{e.title}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {e.start instanceof Date
                            ? e.start.toLocaleDateString()
                            : new Date(e.start).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </GlassCard>
        </section>

        {/* Recent Documents - compact */}
        <GlassCard>
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Documents</h3>
              <button
                onClick={() => window.location.href = '/documents'}
                className="text-liquid-primary-purple hover:text-liquid-primary-purple-light text-sm font-medium transition-colors"
              >
                View All
              </button>
            </div>
            <ul className="divide-y divide-white/20 text-sm">
              {(dashboardData?.data?.recent_documents || [])
                .filter((doc: any) => {
                  // Filter out private documents for non-HR/Admin users
                  if (userRole === "HR" || userRole === "Admin" || userRole === "God") {
                    return true; // HR/Admin can see all documents
                  }
                  return doc.isPublic || doc.user_id === userId; // Employees can only see public docs or their own
                })
                .slice(0, 3).map((doc: any) => (
                <li key={doc.id} className="py-3 flex justify-between items-center">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-liquid-md bg-liquid-primary flex items-center justify-center text-white flex-shrink-0 shadow-liquid">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="truncate block font-medium text-gray-900 dark:text-white">{doc.title}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{doc.category}</span>
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
                  className="text-liquid-primary-purple hover:text-liquid-primary-purple-light text-sm font-medium ml-2 flex-shrink-0 transition-colors"
                >
                  {doc.fileUrl?.toLowerCase().endsWith('.pdf') ? 'View PDF' : 'View'}
                </button>
              </li>
            ))}
            {((dashboardData?.data?.recent_documents || []).length || 0) === 0 && (
              <li className="text-gray-500 dark:text-gray-400 py-4 text-center">No documents available</li>
            )}
            </ul>
          </div>
        </GlassCard>

        {/* Recent Salary Slips - compact */}
        <GlassCard>
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Recent Salary Slips</h3>
            <ul className="divide-y divide-white/20 text-sm">
              {(dashboardData?.data?.recent_salary_slips || []).slice(0, 3).map((slip: any) => (
                <li key={slip.id} className="py-3 flex justify-between items-center">
                  <span className="truncate pr-3 font-medium text-gray-900 dark:text-white">
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
                    className="text-liquid-primary-purple hover:text-liquid-primary-purple-light font-medium transition-colors"
                  >
                    View
                  </button>
                </li>
            ))}
              {((dashboardData?.data?.recent_salary_slips || []).length || 0) === 0 && (
                <li className="text-gray-500 dark:text-gray-400 py-3">No salary slips</li>
              )}
            </ul>
          </div>
        </GlassCard>
      </div>
    </main>
  );
}
