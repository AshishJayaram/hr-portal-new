"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getLeaves,
  getLeaveBalance,
  updateUser, // keep if you already have
  applyLeave,
} from "../../lib/api";
import Loader from "../../components/Loader";
import LeaveBalanceCard from "../../components/LeaveBalanceCard";
import ApplyLeaveForm from "../../components/ApplyLeaveForm";

export default function LeavesPage() {
  const userId = "u1"; // TODO: replace with session later
  const queryClient = useQueryClient();

  // Fetch leave requests
  const { data: leaves, isLoading: loadingLeaves } = useQuery({
    queryKey: ["leaves"],
    queryFn: () => getLeaves({ scope: "self" }), // only self for applied list
  });

  // Fetch leave balance
  const { data: balance, isLoading: loadingBalance } = useQuery({
    queryKey: ["leave-balance", userId],
    queryFn: () => getLeaveBalance(userId),
  });

  // Cancel leave mutation
  const cancelLeave = useMutation({
    mutationFn: async (leaveId: string) =>
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/leaves/${leaveId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ status: "CANCELLED" }),
      }).then((res) => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
    },
  });

  if (loadingLeaves || loadingBalance) return <Loader />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Leaves</h1>

      {/* Leave Balances */}
      <LeaveBalanceCard balance={balance?.data || {}} />

      {/* Apply Leave Form */}
      <ApplyLeaveForm />

      {/* Applied Leaves List */}
      <div className="bg-white/10 backdrop-blur rounded-xl p-6 shadow-md">
        <h2 className="text-xl font-semibold mb-4">My Leave Requests</h2>
        {(!leaves?.data || leaves.data.length === 0) && (
          <p className="text-gray-400">No leave requests yet.</p>
        )}

        {leaves?.data?.length > 0 && (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-600 text-sm text-gray-300">
                <th className="p-2">Type</th>
                <th className="p-2">Dates</th>
                <th className="p-2">Reason</th>
                <th className="p-2">Status</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaves.data.map((leave: any) => (
                <tr
                  key={leave.id}
                  className="border-b border-gray-700 hover:bg-white/5"
                >
                  <td className="p-2">{leave.type}</td>
                  <td className="p-2">
                    {new Date(leave.startDate).toLocaleDateString()} →{" "}
                    {new Date(leave.endDate).toLocaleDateString()}
                  </td>
                  <td className="p-2">{leave.reason}</td>
                  <td
                    className={`p-2 font-semibold ${
                      leave.status === "APPROVED"
                        ? "text-green-400"
                        : leave.status === "REJECTED"
                        ? "text-red-400"
                        : "text-yellow-400"
                    }`}
                  >
                    {leave.status}
                  </td>
                  <td className="p-2 space-x-2">
                    {leave.status === "PENDING" && (
                      <>
                        <button
                          onClick={() => cancelLeave.mutate(leave.id)}
                          className="px-3 py-1 text-sm rounded bg-red-500/80 hover:bg-red-600 text-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() =>
                            alert("TODO: open edit leave form modal")
                          }
                          className="px-3 py-1 text-sm rounded bg-indigo-500/80 hover:bg-indigo-600 text-white"
                        >
                          Edit
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
