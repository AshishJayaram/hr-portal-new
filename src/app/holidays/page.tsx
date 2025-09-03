"use client";

import { useState, useEffect } from "react";
import { getHolidays, createHoliday, updateHoliday, deleteHoliday, Holiday, canManageHolidays } from "@/lib/api";
import RoleGuard from "@/components/RoleGuard";
import Card from "@/components/ui/Card";
import Loader from "@/components/ui/Loader";

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    date: "",
    description: "",
  });

  useEffect(() => {
    loadHolidays();
  }, []);

  const loadHolidays = async () => {
    try {
      setLoading(true);
      const response = await getHolidays();
      setHolidays(response.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingHoliday) {
        await updateHoliday(editingHoliday.id, formData);
      } else {
        await createHoliday(formData);
      }
      setShowForm(false);
      setEditingHoliday(null);
      setFormData({ name: "", date: "", description: "" });
      loadHolidays();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setFormData({
      name: holiday.name,
      date: holiday.date,
      description: holiday.description || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (holidayId: string) => {
    if (!confirm("Are you sure you want to delete this holiday?")) return;
    try {
      await deleteHoliday(holidayId);
      loadHolidays();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Holidays</h1>
        <RoleGuard allowedRoles={["HR", "Admin"]}>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700"
          >
            Add Holiday
          </button>
        </RoleGuard>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      <RoleGuard allowedRoles={["HR", "Admin"]}>
        {showForm && (
          <Card>
            <h2 className="text-xl font-semibold mb-4">
              {editingHoliday ? "Edit Holiday" : "Add Holiday"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 rounded bg-white/10 border border-white/20"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full p-2 rounded bg-white/10 border border-white/20"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 rounded bg-white/10 border border-white/20"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded"
                >
                  {editingHoliday ? "Update" : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingHoliday(null);
                    setFormData({ name: "", date: "", description: "" });
                  }}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded"
                >
                  Cancel
                </button>
              </div>
            </form>
          </Card>
        )}
      </RoleGuard>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {holidays.map((holiday) => (
          <Card key={holiday.id}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">{holiday.name}</h3>
                <p className="text-sm text-gray-400">
                  {new Date(holiday.date).toLocaleDateString()}
                </p>
                {holiday.description && (
                  <p className="text-sm text-gray-300 mt-1">{holiday.description}</p>
                )}
              </div>
              <RoleGuard allowedRoles={["HR", "Admin"]}>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(holiday)}
                    className="p-1 text-blue-400 hover:text-blue-300"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(holiday.id)}
                    className="p-1 text-red-400 hover:text-red-300"
                  >
                    🗑️
                  </button>
                </div>
              </RoleGuard>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
