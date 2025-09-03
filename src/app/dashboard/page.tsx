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
    queryKey: ["documents", "dashboard"],
    queryFn: () => getDocuments({ limit: "3" }),
  });

  const { data: slips, isLoading: loadingSlips } = useQuery({
    queryKey: ["slips", userId],
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

      {/* Stats Overview - HR/Admin only */}
      <RoleGuard allowedRoles={["HR", "Admin"]}>
        <div className="grid md:grid-cols-4 gap-4">
          {[
            { label: "Total Employees", value: stats?.data?.totalEmployees || 0, color: "text-indigo-400", href: "/employees" },
            { label: "Pending Leaves", value: stats?.data?.pendingLeaves || 0, color: "text-yellow-400", href: "/leaves" },
            { label: "Approved Leaves", value: stats?.data?.approvedLeaves || 0, color: "text-green-400", href: "/leaves" },
            { label: "Total Documents", value: stats?.data?.totalDocuments || 0, color: "text-purple-400", href: "/documents" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link href={s.href} className="block">
                <Card className="text-center hover:-translate-y-0.5 transition-transform cursor-pointer">
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-sm text-gray-400">{s.label}</div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </RoleGuard>

      {/* Leave Balances */}
      <LeaveBalanceCard balance={balance?.data || []} />

      <div className="grid md:grid-cols-2 gap-6">
        {/* Calendar or List (responsive) */}
        <Card title="Upcoming Leaves & Holidays">
          <div className="hidden sm:block">
            <Calendar
              events={[
                ...(leaves?.data || []).map((l: any) => ({
                  title: l.type,
                  start: new Date(l.from),
                  end: new Date(l.to),
                  color: "#3b82f6",
                })),
                ...(holidays?.data || []).map((h: any) => ({
                  title: `Holiday: ${h.name}`,
                  start: new Date(h.date),
                  end: new Date(h.date),
                  color: "#ef4444",
                })),
              ]}
            />
          </div>
          <div className="sm:hidden space-y-3">
            {[
              ...(leaves?.data || []).map((l: any) => ({
                id: `leave-${l.id}`,
                dateLabel: new Date(l.from).toLocaleDateString(),
                range: l.from === l.to ? null : `${new Date(l.from).toLocaleDateString()} - ${new Date(l.to).toLocaleDateString()}`,
                title: l.type,
                color: 'bg-indigo-500',
              })),
              ...(holidays?.data || []).map((h: any) => ({
                id: `holiday-${h.id}`,
                dateLabel: new Date(h.date).toLocaleDateString(),
                range: null,
                title: `Holiday: ${h.name}`,
                color: 'bg-red-500',
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

        {/* Recent Documents */}
        <Card title="Recent Documents">
          <ul className="divide-y divide-gray-700">
            {(docs?.data || []).slice(0, 3).map((doc: any) => (
              <li key={doc.id} className="py-2 flex justify-between items-center">
                <span>{doc.title}</span>
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  className="text-indigo-400 hover:underline"
                >
                  View
                </a>
              </li>
            ))}
            {(docs?.data?.length || 0) === 0 && (
              <li className="text-gray-400">No documents</li>
            )}
          </ul>
        </Card>
      </div>

      {/* Recent Payslips */}
      <Card title="Recent Payslips">
        <ul className="divide-y divide-gray-700">
          {(slips?.data || []).slice(0, 3).map((s: any) => (
            <li key={s.id} className="py-2 flex justify-between items-center">
              <span>
                {s.month}/{s.year}
              </span>
              <a
                href={s.fileUrl}
                target="_blank"
                className="text-green-400 hover:underline"
              >
                Download
              </a>
            </li>
          ))}
          {(slips?.data?.length || 0) === 0 && (
            <li className="text-gray-400">No payslips</li>
          )}
        </ul>
      </Card>
    </div>
  );
}
