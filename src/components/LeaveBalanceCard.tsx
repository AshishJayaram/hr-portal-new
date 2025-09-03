"use client";

import { LeaveBalance } from "@/lib/api";

export default function LeaveBalanceCard({ balance }: { balance: LeaveBalance[] }) {
  if (!balance || balance.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">No leave balance information available</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
      {balance.map((item) => (
        <div
          key={item.type}
          className="bg-white/10 p-4 rounded-xl shadow-md text-center hover:bg-white/15 transition-colors"
        >
          <h3 className="font-semibold text-gray-200 capitalize">{item.type}</h3>
          <p className="text-2xl font-bold text-indigo-400">
            {item.remaining}
          </p>
          <p className="text-sm text-gray-400">
            {item.used} used of {item.total}
          </p>
        </div>
      ))}
    </div>
  );
}
