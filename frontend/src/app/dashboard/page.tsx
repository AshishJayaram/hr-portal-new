"use client";

import { useQuery } from "@tanstack/react-query";
import { getDashboardStats, getLeaveBalance, getDocuments, getSalarySlips, getLeaves, getCurrentUser, getHolidays } from "../../lib/api";
import Loader from "../../components/Loader";
import LeaveBalanceCard from "../../components/LeaveBalanceCard";
import Calendar from "../../components/Calendar";
import Card from "@/components/ui/Card";
import { motion } from "framer-motion";
import RoleGuard from "../../components/RoleGuard";
import Link from "next/link";

export default function DashboardPage() {
  const user = getCurrentUser();
  const userId = user?.id || "u1";

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ["stats"],
    queryFn: getDashboardStats,
  });

  const { data: balance, isLoading: loadingBalance } = useQuery({
    queryKey: ["leave-balance", userId],
    queryFn: () => getLeaveBalance(userId),
  });

  const { data: leaves, isLoading: loadingLeaves } = useQuery({
    queryKey: ["leaves", "dashboard"],
    queryFn: () => getLeaves({ userId: userId }),
  });

  const { data: docs, isLoading: loadingDocs } = useQuery({
    queryKey: ["documents", "dashboard", userId],
    queryFn: () => getDocuments({ userId: userId }),
  });

  const { data: slips, isLoading: loadingSlips } = useQuery({
    queryKey: ["slips", "dashboard", userId],
    queryFn: () => getSalarySlips({ userId: userId }),
  });

  const { data: holidays, isLoading: loadingHolidays } = useQuery({
    queryKey: ["holidays", "dashboard"],
    queryFn: () => getHolidays(),
  });

  if (loadingStats || loadingBalance || loadingLeaves || loadingDocs || loadingSlips || loadingHolidays)
    return <Loader />;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Dashboard</h1>


      {/* Leave Balances */}
      <LeaveBalanceCard balance={balance?.data || stats?.data?.leave_balances || []} />

      {/* Events & Notices */}
      <Card title="Upcoming Events & Notices">
        <div className="space-y-3">
          {(holidays?.data || stats?.data?.upcoming_holidays || [])
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
                    <h4 className="font-medium text-primary">{event.name}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      event.type === 'holiday' ? 'bg-red-500/20 text-red-400' :
                      event.type === 'event' ? 'bg-blue-500/20 text-blue-400' :
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
          {(holidays?.data || stats?.data?.upcoming_holidays || []).filter((h: any) => {
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

      <div className="space-y-6">
        {/* Calendar or List (responsive) */}
        <Card title="Upcoming Leaves & Holidays">
          <div className="hidden sm:block">
            <Calendar
              events={[
                ...(leaves?.data || stats?.data?.recent_leaves || []).map((l: any) => ({
                  title: l.type,
                  start: new Date(l.from),
                  end: new Date(l.to),
                  color: "#3b82f6",
                })),
                ...(holidays?.data || stats?.data?.upcoming_holidays || [])
                  .filter((h: any) => h.isCalendarEvent !== false && h.date)
                  .map((h: any) => ({
                    title: h.name,
                    start: new Date(h.date),
                    end: new Date(h.date),
                    color: h.color || (h.type === 'holiday' ? "#ef4444" : h.type === 'event' ? "#3b82f6" : "#10b981"),
                  })),
              ]}
            />
          </div>
          <div className="sm:hidden space-y-3">
            {[
              ...(leaves?.data || stats?.data?.recent_leaves || []).map((l: any) => ({
                id: `leave-${l.id}`,
                dateLabel: new Date(l.from).toLocaleDateString(),
                range: l.from === l.to ? null : `${new Date(l.from).toLocaleDateString()} - ${new Date(l.to).toLocaleDateString()}`,
                title: l.type,
                color: 'bg-indigo-500',
              })),
              ...(holidays?.data || [])
                .filter((h: any) => h.isCalendarEvent !== false && h.date)
                .map((h: any) => ({
                  id: `holiday-${h.id}`,
                  dateLabel: new Date(h.date).toLocaleDateString(),
                  range: null,
                  title: `${h.type === 'holiday' ? 'Holiday' : h.type === 'event' ? 'Event' : 'Notice'}: ${h.name}`,
                  color: h.type === 'holiday' ? 'bg-red-500' : h.type === 'event' ? 'bg-blue-500' : 'bg-green-500',
                })),
            ]
              .filter((e) => new Date(e.dateLabel) >= new Date(new Date().toDateString()))
              .slice(0, 10)
              .map((e) => (
                <div key={e.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className={`w-2 h-8 rounded ${e.color}`} />
                  <div>
                    <div className="text-sm text-gray-300">{e.title}</div>
                    <div className="text-xs text-gray-400">{e.range || e.dateLabel}</div>
                  </div>
                </div>
              ))}
          </div>
        </Card>

        {/* Recent Payslips */}
        <Card title="Recent Payslips">
        <ul className="divide-y divide-gray-700">
          {(slips?.data || []).slice(0, 3).map((s: any) => (
            <li key={s.id} className="py-2 flex justify-between items-center">
              <span>
                {s.month}/{s.year}
              </span>
              <button
                onClick={async () => {
                  try {
                    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/salary-slips/${s.id}/download`, {
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
                    console.error('Failed to download salary slip:', error);
                  }
                }}
                className="text-green-400 hover:underline"
              >
                Download
              </button>
            </li>
          ))}
          {(slips?.data?.length || 0) === 0 && (
            <li className="text-gray-400">No payslips</li>
          )}
        </ul>
      </Card>

        {/* Recent Documents - compact */}
        <Card title="Recent Documents" className="p-4">
          <ul className="divide-y divide-gray-700 text-sm">
            {(docs?.data || stats?.data?.recent_documents || []).slice(0, 3).map((doc: any) => (
              <li key={doc.id} className="py-2 flex justify-between items-center">
                <span className="truncate pr-3">{doc.title}</span>
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
                        window.open(data.fileUrl, '_blank');
                      }
                    } catch (error) {
                      console.error('Failed to download document:', error);
                    }
                  }}
                  className="text-indigo-400 hover:underline"
                >
                  View
                </button>
              </li>
            ))}
            {((docs?.data || stats?.data?.recent_documents || []).length || 0) === 0 && (
              <li className="text-gray-400">No documents</li>
            )}
          </ul>
        </Card>

        {/* Recent Salary Slips - compact */}
        <Card title="Recent Salary Slips" className="p-4">
          <ul className="divide-y divide-gray-700 text-sm">
            {(slips?.data || stats?.data?.recent_salary_slips || []).slice(0, 3).map((slip: any) => (
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
                      console.error('Failed to download salary slip:', error);
                    }
                  }}
                  className="text-indigo-400 hover:underline"
                >
                  View
                </button>
              </li>
            ))}
            {((slips?.data || stats?.data?.recent_salary_slips || []).length || 0) === 0 && (
              <li className="text-gray-400">No salary slips</li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
