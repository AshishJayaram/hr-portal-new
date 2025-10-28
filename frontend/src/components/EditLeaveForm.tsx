"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { updateLeave, getLeaveBalance, getCurrentUser, getHolidays } from "../lib/api";
import { calculateLeaveDays } from "../lib/leaveUtils";
import { toast } from "sonner";
import Button from "./ui/Button";

interface EditLeaveFormProps {
  leave: any;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function EditLeaveForm({ leave, onClose, onSuccess }: EditLeaveFormProps) {
  const [type, setType] = useState<string>(leave.type || "");
  const [reason, setReason] = useState(leave.reason || "");
  const [startDate, setStartDate] = useState(() => {
    if (leave.from) {
      const dateStr = String(leave.from);
      // Handle both timestamp and date-only formats
      const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0];
      return cleanDate;
    }
    return "";
  });
  const [endDate, setEndDate] = useState(() => {
    if (leave.to) {
      const dateStr = String(leave.to);
      // Handle both timestamp and date-only formats
      const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0];
      return cleanDate;
    }
    return "";
  });
  const [startHalf, setStartHalf] = useState<"FULL" | "AM" | "PM">(leave.startHalf || "FULL");
  const [endHalf, setEndHalf] = useState<"FULL" | "AM" | "PM">(leave.endHalf || "FULL");
  const [calculatedDays, setCalculatedDays] = useState(leave.days || 0);

  const queryClient = useQueryClient();
  const currentUser = getCurrentUser();

  // Fetch leave balance to get available leave categories
  const { data: leaveBalance } = useQuery({
    queryKey: ["leave-balance", currentUser?.id],
    queryFn: () => getLeaveBalance(currentUser?.id || ""),
    enabled: !!currentUser?.id,
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

  // Auto-calculate leave days whenever dates/halves change
  useEffect(() => {
    if (startDate && (endDate || startDate)) {
      // Combine bank holidays and fetched holidays
      const allHolidays = [
        ...(holidays?.data || []).map((h: any) => ({
          title: h.type === "holiday" ? "Holiday" : "BH",
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
  }, [startDate, endDate, startHalf, endHalf, holidays]);

  // Update leave mutation
  const mutation = useMutation({
    mutationFn: (data: any) => updateLeave(leave.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      queryClient.invalidateQueries({ queryKey: ["leave-balance"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Leave updated successfully");
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update leave");
    },
  });

  // Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate dates
    if (endDate && new Date(endDate) < new Date(startDate)) {
      toast.error("End date cannot be before start date");
      return;
    }

    const updateData: any = {};

    // Only include changed fields
    if (type !== leave.type) updateData.type = type;
    if (reason !== leave.reason) updateData.reason = reason;
    if (startDate !== (leave.from ? leave.from.split('T')[0] : "")) {
      updateData.from_date = new Date(startDate).toISOString();
    }
    if (endDate !== (leave.to ? leave.to.split('T')[0] : "")) {
      updateData.to_date = new Date(endDate).toISOString();
    }
    if (startHalf !== (leave.startHalf || "FULL")) updateData.start_half = startHalf;
    if (endHalf !== (leave.endHalf || "FULL")) updateData.end_half = endHalf;

    // Only submit if there are changes
    if (Object.keys(updateData).length === 0) {
      toast.info("No changes to save");
      return;
    }

    mutation.mutate(updateData);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-card dark:bg-white/10 dark:border-white/10">
      <div className="px-6 pt-6 pb-2">
        <h3 className="text-lg font-semibold text-primary mb-4">Edit Leave Request</h3>
      </div>
      
      <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
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
              <option value="PM">Second Half</option>
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
              <option value="AM">First Half</option>
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

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={mutation.isPending}
            disabled={availableLeaveTypes.length === 0 || !type}
            className="flex-1"
          >
            {mutation.isPending ? "Updating..." : "Update Leave"}
          </Button>
        </div>
      </form>
    </div>
  );
}
