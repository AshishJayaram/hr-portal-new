"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { applyLeave } from "../lib/api";
import { calculateLeaveDays } from "../lib/leaveUtils";

export default function ApplyLeaveForm({ bankHolidays = [] }: { bankHolidays?: any[] }) {
  const [type, setType] = useState<"Sick" | "Casual" | "Professional">("Casual");
  const [reason, setReason] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startHalf, setStartHalf] = useState<"FULL" | "AM" | "PM">("FULL");
  const [endHalf, setEndHalf] = useState<"FULL" | "AM" | "PM">("FULL");
  const [calculatedDays, setCalculatedDays] = useState(0);

  const queryClient = useQueryClient();

  // 🧮 Auto-calculate leave days whenever dates/halves change
  useEffect(() => {
    if (startDate && (endDate || startDate)) {
      const days = calculateLeaveDays(
        startDate,
        endDate || startDate,
        startHalf,
        endHalf,
        bankHolidays
      );
      setCalculatedDays(days);
    } else {
      setCalculatedDays(0);
    }
  }, [startDate, endDate, startHalf, endHalf, bankHolidays]);

  // 🔄 Mutation
  const mutation = useMutation({
    mutationFn: applyLeave,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      setType("Casual");
      setReason("");
      setStartDate("");
      setEndDate("");
      setStartHalf("FULL");
      setEndHalf("FULL");
      setCalculatedDays(0);
    },
  });

  // Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      type,
      reason,
      from: startDate,
      to: endDate || startDate,
    });
  };

  return (
    <div className="bg-white/10 backdrop-blur rounded-xl shadow-md">
      <form onSubmit={handleSubmit} className="px-6 pt-6 pb-6 space-y-4">
        {/* Leave Type */}
        <div className="space-y-2">
          <label className="block text-sm mb-1">Leave Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full p-3 rounded bg-white/20 text-white"
          >
            <option value="Casual">Casual</option>
            <option value="Sick">Sick</option>
            <option value="Professional">Professional</option>
            <option value="PTO">PTO</option>
          </select>
        </div>

        {/* Dates + Half Days */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Start Date */}
          <div>
            <label className="block text-sm mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 rounded bg-white/20 text-white"
            />
            <select
              value={startHalf}
              onChange={(e) =>
                setStartHalf(e.target.value as "FULL" | "AM" | "PM")
              }
              className="w-full mt-2 p-2 rounded bg-white/20 text-white"
            >
              <option value="FULL">Full Day</option>
              <option value="AM">First Half</option>
              <option value="PM">Second Half</option>
            </select>
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2 rounded bg-white/20 text-white"
            />
            <select
              value={endHalf}
              onChange={(e) => setEndHalf(e.target.value as "FULL" | "AM" | "PM")}
              className="w-full mt-2 p-2 rounded bg-white/20 text-white"
            >
              <option value="FULL">Full Day</option>
              <option value="AM">First Half</option>
              <option value="PM">Second Half</option>
            </select>
          </div>
        </div>

        {/* Reason */}
        <div>
          <label className="block text-sm mb-1">Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full p-2 rounded bg-white/20 text-white"
            placeholder="Enter reason for leave..."
          />
        </div>

        {/* Calculated Days */}
        {calculatedDays > 0 && (
          <p className="text-sm text-gray-300">
            This leave will use{" "}
            <span className="font-semibold text-indigo-400">
              {calculatedDays}
            </span>{" "}
            day(s) after excluding weekends & bank holidays.
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-2 rounded font-semibold disabled:opacity-50"
        >
          {mutation.isPending ? "Submitting..." : "Submit Leave Request"}
        </button>
      </form>
    </div>
  );
}
