"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Card from "../../../../components/Card";

export default function AddEmployeePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const payload = {
      name: form.get("name"),
      email: form.get("email"),
      employeeId: form.get("employeeId"),
      department: form.get("department"),
      position: form.get("position"),
      role: form.get("role"),
      managerId: form.get("managerId") || null,
      hrId: form.get("hrId") || null,
      organizationId: form.get("organizationId"),
      isActive: true,
    };

    try {
      const res = await fetch("http://localhost:4000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to create employee");
      router.push("/employees"); // redirect to employees list
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Add Employee</h1>

      <Card title="Employee Details">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-red-400">{error}</p>}

          <input name="name" placeholder="Full Name" required className="w-full p-2 rounded bg-white/10" />
          <input name="email" type="email" placeholder="Email" required className="w-full p-2 rounded bg-white/10" />
          <input name="employeeId" placeholder="Employee ID" required className="w-full p-2 rounded bg-white/10" />
          <input name="department" placeholder="Department" required className="w-full p-2 rounded bg-white/10" />
          <input name="position" placeholder="Position" required className="w-full p-2 rounded bg-white/10" />

          {/* Role dropdown */}
          <select name="role" required className="w-full p-2 rounded bg-white/10">
            <option value="EMPLOYEE">Employee</option>
            <option value="MANAGER">Manager</option>
            <option value="HR">HR</option>
            <option value="ADMIN">Admin</option>
          </select>

          {/* Manager + HR IDs (only needed for Employees) */}
          <input name="managerId" placeholder="Manager ID (if employee)" className="w-full p-2 rounded bg-white/10" />
          <input name="hrId" placeholder="HR ID" required className="w-full p-2 rounded bg-white/10" />

          <input name="organizationId" placeholder="Organization ID" required className="w-full p-2 rounded bg-white/10" />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg text-white font-bold"
          >
            {loading ? "Adding..." : "Add Employee"}
          </button>
        </form>
      </Card>
    </div>
  );
}
