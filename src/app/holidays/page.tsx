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
      setFormData({ name: "", date: "" });
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
                    setFormData({ name: "", date: "" });
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

      <div className="space-y-3">
        {holidays
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .map((holiday) => (
          <Card key={holiday.id}>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="text-2xl">
                  {(() => {
                    const month = new Date(holiday.date).getMonth();
                    const day = new Date(holiday.date).getDate();
                    
                    // Holiday icons based on month and common holidays
                    if (month === 0 && day === 1) return "🎊"; // New Year
                    if (month === 1 && day === 14) return "💕"; // Valentine's
                    if (month === 2 && day === 8) return "👩"; // Women's Day
                    if (month === 3 && day === 1) return "🐣"; // April Fools/Easter-ish
                    if (month === 4 && day === 1) return "🌷"; // May Day
                    if (month === 6 && day === 4) return "🇺🇸"; // Independence Day
                    if (month === 9 && day === 31) return "🎃"; // Halloween
                    if (month === 10 && day === 25) return "🦃"; // Thanksgiving
                    if (month === 11 && day === 25) return "🎄"; // Christmas
                    if (month === 11 && day === 31) return "🎆"; // New Year's Eve
                    
                    // Default icons based on season
                    if (month >= 2 && month <= 4) return "🌸"; // Spring
                    if (month >= 5 && month <= 7) return "☀️"; // Summer
                    if (month >= 8 && month <= 10) return "🍂"; // Fall
                    return "❄️"; // Winter
                  })()}
                </div>
                <div>
                  <h3 className="font-semibold text-primary">{holiday.name}</h3>
                  <p className="text-sm text-secondary">
                    {new Date(holiday.date).toLocaleDateString('en-US', { 
                      weekday: 'long',
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
              <RoleGuard allowedRoles={["HR", "Admin"]}>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(holiday)}
                    className="p-2 text-blue-400 hover:text-blue-300 hover:bg-white/10 rounded transition-colors"
                    title="Edit holiday"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(holiday.id)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-white/10 rounded transition-colors"
                    title="Delete holiday"
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
