"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getDashboardStats, getCurrentUser } from "../../lib/api";
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

  // Debug logging
  console.log("Dashboard Debug:", {
    user,
    userId,
    userRole,
    localStorageUser: typeof window !== "undefined" ? localStorage.getItem("user") : "N/A"
  });

  // Single API call for all dashboard data
  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ["dashboard-data"],
    queryFn: getDashboardStats,
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
    
    // Debug dashboard data
    console.log("Dashboard data debug:", {
      recentLeaves: dashboardData?.data?.recent_leaves,
      userId,
      userRole
    });
    
    // Add holidays
    events.push(...(dashboardData?.data?.upcoming_holidays || [])
      .filter((h: any) => h.isCalendarEvent !== false && (h.date || h.date_range))
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
        } else {
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
      console.log("Employee leave filtering debug:", {
        userId,
        userIdType: typeof userId,
        leaves: leaves.map((l: any) => ({ 
          id: l.id, 
          user_id: l.user_id, 
          user_id_type: typeof l.user_id,
          type: l.type, 
          status: l.status 
        })),
        filteredLeaves: leaves.filter((l: any) => String(l.user_id) === String(userId))
      });
      
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
            .slice(0, 2)
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
                      'bg-green-500/20 text-green-400'
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
              .filter((e) => new Date(e.start) >= new Date(new Date().toDateString()))
              .slice(0, 10)
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
                  className="text-indigo-400 hover:text-indigo-300 text-sm font-medium ml-2 flex-shrink-0"
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
