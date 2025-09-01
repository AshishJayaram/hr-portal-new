"use client";

import { useQuery } from "@tanstack/react-query";
import { getLeaves, getLeaveBalance } from "../../lib/api";
import Loader from "../../components/Loader";
import LeaveBalanceCard from "../../components/LeaveBalanceCard";
import ApplyLeaveForm from "../../components/ApplyLeaveForm";

export default function LeavesPage() {
  const userId = "u1"; // later from session

  const { data: leaves, isLoading: loadingLeaves } = useQuery({
    queryKey: ["leaves"],
    queryFn: () => getLeaves({ scope: "self+team" }),
  });

  const { data: balance, isLoading: loadingBalance } = useQuery({
    queryKey: ["leave-balance", userId],
    queryFn: () => getLeaveBalance(userId),
  });

  if (loadingLeaves || loadingBalance) return <Loader />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Leaves</h1>

      <LeaveBalanceCard balance={balance?.data || {}} />

      <ApplyLeaveForm />
    </div>
  );
}
