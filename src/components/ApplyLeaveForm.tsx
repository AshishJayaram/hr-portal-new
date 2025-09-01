"use client";

import { useState } from "react";
import { applyLeave } from "../lib/api";

export default function ApplyLeaveForm() {
  const [form, setForm] = useState({
    type: "ANNUAL",
    startDate: "",
    endDate: "",
    reason: "",
  });

  const handleChange = (e: any) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    await applyLeave(form);
    alert("Leave Applied!");
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white/10 p-6 rounded-xl space-y-4">
      <h2 className="text-xl font-bold">Apply for Leave</h2>
      <select name="type" onChange={handleChange} value={form.type} className="w-full p-2 rounded bg-white/20">
        <option value="ANNUAL">Annual</option>
        <option value="SICK">Sick</option>
        <option value="PERSONAL">Personal</option>
        <option value="CASUAL">Casual</option>
      </select>
      <input type="date" name="startDate" onChange={handleChange} className="w-full p-2 rounded bg-white/20" />
      <input type="date" name="endDate" onChange={handleChange} className="w-full p-2 rounded bg-white/20" />
      <textarea name="reason" placeholder="Reason" onChange={handleChange} className="w-full p-2 rounded bg-white/20" />
      <button type="submit" className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-2 rounded">
        Apply Leave
      </button>
    </form>
  );
}
