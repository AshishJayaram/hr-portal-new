"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Card from "../../../../components/Card";
import Loader from "../../../../components/Loader";

export default function EditEmployeePage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [employee, setEmployee] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchEmployee() {
      try {
        const res = await fetch(`http://localhost:4000/api/users/${id}`, {
          credentials: "include",
        });
        const data = await res.json();
        setEmployee(data.data);
      } catch (err: any) {
        setError("Failed to load employee");
      } finally {
        setLoading(false);
      }
    }
    fetchEmployee();
  }, [id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const payload = {
      department: form.get("department"),
      position: form.get("position"),
      role: form.get("role"),
      managerId: form.get("managerId") || null,
      hrId: form.get("hrId") || null,
    };

    try {
      const res = await fetch(`http://localhost:4000/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update employee");
      router.push("/employees");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loader />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Edit Employee</h1>

      <Card title="Update Employee Details">
        {error && <p className="text-red-400">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            value={employee.email}
            readOnly
            className="w-full p-2 rounded bg-gray-800 text-gray-400"
          />
          <input
            defaultValue={employee.department}
            name="department"
            placeholder="Department"
            className="w-full p-2 rounded bg-white/10"
          />
          <input
            defaultValue={employee.position}
            name="position"
            placeholder="Position"
            className="w-full p-2 rounded bg-white/10"
          />

          <select
            defaultValue={employee.role}
            name="role"
            className="w-full p-2 rounded bg-white/10"
          >
            <option value="EMPLOYEE">Employee</option>
            <option value="MANAGER">Manager</option>
            <option value="HR">HR</option>
            <option value="ADMIN">Admin</option>
          </select>

          <input
            defaultValue={employee.managerId || ""}
            name="managerId"
            placeholder="Manager ID"
            className="w-full p-2 rounded bg-white/10"
          />
          <input
            defaultValue={employee.hrId || ""}
            name="hrId"
            placeholder="HR ID"
            className="w-full p-2 rounded bg-white/10"
          />

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg text-white font-bold"
          >
            {saving ? "Saving..." : "Update Employee"}
          </button>
        </form>
      </Card>
    </div>
  );
}
