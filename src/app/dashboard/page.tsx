"use client";

import { useQuery } from "@tanstack/react-query";
import { getDashboardStats, getLeaveBalance, getDocuments, getSalarySlips, getLeaves } from "../../lib/api";
import Loader from "../../components/Loader";
import LeaveBalanceCard from "../../components/LeaveBalanceCard";
import Calendar from "../../components/Calendar";
import Card from "../../components/Card";

export default function DashboardPage() {
  const userId = "u1"; // later from session

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
    queryFn: () => getLeaves({ scope: "self" }),
  });

  const { data: docs, isLoading: loadingDocs } = useQuery({
    queryKey: ["documents", "dashboard"],
    queryFn: () => getDocuments({ limit: "3" }),
  });

  const { data: slips, isLoading: loadingSlips } = useQuery({
    queryKey: ["slips", userId],
    queryFn: () => getSalarySlips(userId),
  });

  if (loadingStats || loadingBalance || loadingLeaves || loadingDocs || loadingSlips)
    return <Loader />;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {/* Leave Balances */}
      <LeaveBalanceCard balance={balance?.data || {}} />

      <div className="grid md:grid-cols-2 gap-6">
        {/* Calendar */}
        <Card title="Upcoming Leaves">
          <Calendar
            events={(leaves?.data || []).map((l: any) => ({
              title: l.type,
              start: new Date(l.startDate),
              end: new Date(l.endDate),
              color: "#3b82f6",
            }))}
          />
        </Card>

        {/* Recent Documents */}
        <Card title="Recent Documents">
          <ul className="divide-y divide-gray-700">
            {(docs?.data || []).slice(0, 3).map((doc: any) => (
              <li key={doc.id} className="py-2 flex justify-between items-center">
                <span>{doc.title}</span>
                <a
                  href={doc.filePath}
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
                {s.month}/{s.year} – Net: ₹{s.netSalary}
              </span>
              <a
                href={s.filePath}
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
