"use client";

import { LeaveBalance, LeaveAllocation } from "@/lib/api";
import Card from "./ui/Card";
import { motion } from "framer-motion";

export default function LeaveBalanceCard({ balance }: { balance: LeaveBalance[] }) {
  if (!balance || balance.length === 0) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((s) => (
          <Card key={s} className="animate-pulse">
            <div className="h-4 w-24 bg-white/10 rounded mb-3" />
            <div className="h-8 w-16 bg-white/15 rounded mb-2" />
            <div className="h-3 w-32 bg-white/10 rounded" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
      {balance.map((item, idx) => {
        // Handle both legacy LeaveBalance and new LeaveAllocation formats
        const isAllocation = 'categoryName' in item;
        const type = isAllocation ? (item as LeaveAllocation).categoryName : (item as any).type;
        const remaining = isAllocation ? (item as LeaveAllocation).remainingDays : (item as any).remaining;
        const used = isAllocation ? (item as LeaveAllocation).usedDays : (item as any).used;
        const total = isAllocation ? (item as LeaveAllocation).totalDays : (item as any).total;
        
        return (
          <motion.div
            key={isAllocation ? (item as LeaveAllocation).categoryId : (item as any).type}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05, duration: 0.25 }}
          >
            <Card className="text-center hover:shadow-xl hover:-translate-y-0.5 transition-all">
              <h3 className="font-semibold text-primary capitalize">{type}</h3>
              <p className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-purple-400">
                {remaining}
              </p>
              <p className="text-sm text-secondary">
                {used} used of {total}
              </p>
              {isAllocation && (
                <p className="text-xs text-muted mt-1">
                  Year: {(item as LeaveAllocation).year}
                </p>
              )}
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
