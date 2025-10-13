"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { applyLeave, getLeaveBalance, getCurrentUser, getHolidays, getUsers, hasRole } from "../lib/api";
import { calculateLeaveDays } from "../lib/leaveUtils";
import { toast } from "sonner";

export default function ApplyLeaveForm({ bankHolidays = [], forUserId, showApplyForField = false }: { bankHolidays?: any[], forUserId?: string, showApplyForField?: boolean }) {
  const [type, setType] = useState<string>("");
  const [reason, setReason] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startHalf, setStartHalf] = useState<"FULL" | "AM" | "PM">("FULL");
  const [endHalf, setEndHalf] = useState<"FULL" | "AM" | "PM">("FULL");
  const [calculatedDays, setCalculatedDays] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState(forUserId || "");

  const queryClient = useQueryClient();
  const currentUser = getCurrentUser();
  const canApplyForOthers = hasRole(["HR", "Admin"]);

  // Fetch users if HR/Admin
  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: () => getUsers(),
    enabled: canApplyForOthers,
  });

  // Fetch leave balance to get available leave categories
  const { data: leaveBalance } = useQuery({
    queryKey: ["leave-balance", selectedUserId || currentUser?.id],
    queryFn: () => getLeaveBalance(selectedUserId || currentUser?.id || ""),
    enabled: !!(selectedUserId || currentUser?.id),
  });

  // Fetch holidays for leave calculation
  const { data: holidays } = useQuery({
    queryKey: ["holidays"],
    queryFn: () => getHolidays(),
  });

  // Get available leave types (categories with allocations + LOP)
  const availableLeaveTypes = [
    ...(leaveBalance?.data || []).map((balance: any) => balance.type),
    "LOP" // Always include Loss of Pay
  ].filter((type, index, arr) => arr.indexOf(type) === index); // Remove duplicates

  // Set default type when available types change
  useEffect(() => {
    if (availableLeaveTypes.length > 0 && !type) {
      setType(availableLeaveTypes[0]);
    }
  }, [availableLeaveTypes, type]);

  // 🔧 Auto-adjust half-day selections when dates change
  useEffect(() => {
    if (startDate && endDate && startDate === endDate) {
      // Same day: prevent invalid combinations
      if (startHalf === "PM" && endHalf === "AM") {
        // Invalid: Second half start + First half end on same day
        // Auto-correct to Full Day + Full Day
        setStartHalf("FULL");
        setEndHalf("FULL");
      }
    }
  }, [startDate, endDate, startHalf, endHalf]);

  // 🧮 Auto-calculate leave days whenever dates/halves change
  useEffect(() => {
    if (startDate && (endDate || startDate)) {
      // Combine bank holidays and fetched holidays
      // Only include actual holidays, not events or notices
      const allHolidays = [
        ...bankHolidays,
        ...(holidays?.data || [])
          .filter((h: any) => h.type === "holiday") // Only include holidays, not events or notices
          .map((h: any) => ({
            title: "Holiday",
            start: h.date,
          }))
      ];
      
      const days = calculateLeaveDays(
        startDate,
        endDate || startDate,
        startHalf,
        endHalf,
        allHolidays
      );
      setCalculatedDays(days);
    } else {
      setCalculatedDays(0);
    }
  }, [startDate, endDate, startHalf, endHalf, bankHolidays, holidays]);

  // 🔄 Mutation
  const mutation = useMutation({
    mutationFn: applyLeave,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      queryClient.invalidateQueries({ queryKey: ["leave-balance"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setType(availableLeaveTypes[0] || "");
      setReason("");
      setStartDate("");
      setEndDate("");
      setStartHalf("FULL");
      setEndHalf("FULL");
      setCalculatedDays(0);
      if (canApplyForOthers) {
        setSelectedUserId("");
      }
      toast.success("Leave request submitted successfully!");
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to submit leave request";
      toast.error(errorMessage);
    },
  });

  // Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate dates
    if (endDate && new Date(endDate) < new Date(startDate)) {
      alert("End date cannot be before start date");
      return;
    }
    
    mutation.mutate({
      type: type as any, // Type comes from dynamic leave categories
      reason,
      from: startDate,
      to: endDate || startDate,
      userId: selectedUserId || currentUser?.id,
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-card dark:bg-white/10 dark:border-white/10">
      <form onSubmit={handleSubmit} className="px-6 pt-6 pb-6 space-y-4">
        {/* Employee Selection for HR/Admin - Only show when explicitly requested */}
        {canApplyForOthers && showApplyForField && (
          <div className="space-y-2">
            <label className="block text-sm mb-1 text-primary">Apply Leave For</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full p-3 rounded border border-card bg-gray-100 text-gray-900 dark:border-white/20 dark:bg-white/10 dark:text-white"
              required
            >
              <option value="">Select Employee</option>
              {users?.data?.map((user: any) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Leave Type */}
        <div className="space-y-2">
          <label className="block text-sm mb-1 text-primary">Leave Type</label>
          {availableLeaveTypes.length === 0 ? (
            <div className="w-full p-3 rounded border border-card bg-gray-100 text-gray-500 dark:border-white/20 dark:bg-gray-800 dark:text-gray-400">
              No leave categories available. Please contact HR to set up your leave allocations.
            </div>
          ) : (
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full p-3 rounded border border-card bg-white text-gray-900 dark:border-white/20 dark:bg-white/10 dark:text-white"
            >
              {availableLeaveTypes.map((leaveType) => (
                <option key={leaveType} value={leaveType}>
                  {leaveType}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Dates + Half Days */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Start Date */}
          <div>
            <label className="block text-sm mb-1 text-primary">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 rounded border border-card bg-white text-gray-900 dark:border-white/20 dark:bg-white/10 dark:text-white"
            />
            <select
              value={startHalf}
              onChange={(e) =>
                setStartHalf(e.target.value as "FULL" | "AM" | "PM")
              }
              className="w-full mt-2 p-2 rounded border border-card bg-white text-gray-900 dark:border-white/20 dark:bg-white/10 dark:text-white"
            >
              <option value="FULL">Full Day</option>
              <option value="AM">First Half</option>
              <option value="PM" disabled={!!(startDate && endDate && startDate === endDate)}>Second Half</option>
            </select>
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm mb-1 text-primary">End Date</label>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2 rounded border border-card bg-white text-gray-900 dark:border-white/20 dark:bg-white/10 dark:text-white"
            />
            <select
              value={endHalf}
              onChange={(e) => setEndHalf(e.target.value as "FULL" | "AM" | "PM")}
              className="w-full mt-2 p-2 rounded border border-card bg-white text-gray-900 dark:border-white/20 dark:bg-white/10 dark:text-white"
            >
              <option value="FULL">Full Day</option>
              <option value="AM" disabled={!!(startDate && endDate && startDate === endDate)}>First Half</option>
              <option value="PM">Second Half</option>
            </select>
          </div>
        </div>

        {/* Reason */}
        <div>
          <label className="block text-sm mb-1 text-primary">Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full p-2 rounded border border-card bg-white text-gray-900 dark:border-white/20 dark:bg-white/10 dark:text-white"
            placeholder="Enter reason for leave..."
          />
        </div>

        {/* Calculated Days */}
        {calculatedDays > 0 && (
          <p className="text-sm text-secondary">
            This leave will use{" "}
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              {calculatedDays}
            </span>{" "}
            day(s) after excluding weekends & bank holidays.
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={mutation.isPending || availableLeaveTypes.length === 0 || !type}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded font-semibold disabled:opacity-50"
        >
          {mutation.isPending ? "Submitting..." : "Submit Leave Request"}
        </button>
      </form>
    </div>
  );
}
