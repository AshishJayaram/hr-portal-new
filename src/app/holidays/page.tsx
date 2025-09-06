"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getHolidays, createHoliday, updateHoliday, deleteHoliday, Holiday, canManageHolidays } from "@/lib/api";
import RoleGuard from "@/components/RoleGuard";
import Card from "@/components/ui/Card";
import Loader from "@/components/ui/Loader";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";

export default function HolidaysPage() {
  const queryClient = useQueryClient();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    date: "",
    type: "holiday" as "holiday" | "event" | "notice",
    description: "",
    isCalendarEvent: true,
    color: "#ef4444",
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
      setFormData({ name: "", date: "", type: "holiday", description: "", isCalendarEvent: true, color: "#ef4444" });
      // Invalidate all related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setFormData({
      name: holiday.name,
      date: holiday.date || "",
      type: holiday.type || "holiday",
      description: holiday.description || "",
      isCalendarEvent: holiday.isCalendarEvent ?? true,
      color: holiday.color || "#ef4444",
    });
    setShowForm(true);
  };

  const handleDelete = async (holidayId: string) => {
    if (!confirm("Are you sure you want to delete this holiday?")) return;
    try {
      await deleteHoliday(holidayId);
      // Invalidate all related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Holidays & Events</h1>
        <RoleGuard allowedRoles={["HR", "Admin"]}>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700"
          >
            Add Event/Notice
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
              {editingHoliday ? "Edit Event/Notice" : "Add Event/Notice"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                <Input
                  label="Date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required={formData.type !== 'notice'}
                />
                <Select
                  label="Type"
                  value={formData.type}
                  onChange={(e) => {
                    const newType = e.target.value as "holiday" | "event" | "notice";
                    setFormData({ 
                      ...formData, 
                      type: newType,
                      date: newType === 'notice' ? '' : formData.date, // Clear date for notices
                      color: newType === "holiday" ? "#ef4444" : newType === "event" ? "#3b82f6" : "#10b981"
                    });
                  }}
                  options={[
                    { value: "holiday", label: "Holiday" },
                    { value: "event", label: "Event" },
                    { value: "notice", label: "Notice" }
                  ]}
                />
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isCalendarEvent"
                    checked={formData.isCalendarEvent}
                    onChange={(e) => setFormData({ ...formData, isCalendarEvent: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="isCalendarEvent" className="text-sm font-medium">
                    Show on Calendar
                  </label>
                </div>
              </div>
              
              <Input
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description..."
              />
              
              <div className="flex gap-2">
                <Button
                  type="submit"
                  loading={false}
                >
                  {editingHoliday ? "Update" : "Create"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingHoliday(null);
                    setFormData({ name: "", date: "", type: "holiday", description: "", isCalendarEvent: true, color: "#ef4444" });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}
      </RoleGuard>

      <div className="space-y-3">
        {holidays
          .sort((a, b) => {
            // Notices without dates go to the end
            if (!a.date && !b.date) return 0;
            if (!a.date) return 1;
            if (!b.date) return -1;
            return new Date(a.date).getTime() - new Date(b.date).getTime();
          })
          .map((holiday) => (
          <Card key={holiday.id}>
            <div className="flex justify-between items-start">
              <div className="flex items-start gap-3">
                <div className="text-2xl">
                  {(() => {
                    const type = holiday.type || 'holiday';
                    if (type === 'event') return "📅";
                    if (type === 'notice') return "📢";
                    
                    if (!holiday.date) return "📢"; // Default for notices without dates
                    
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
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-primary">{holiday.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      holiday.type === 'holiday' ? 'bg-red-500/20 text-red-400' :
                      holiday.type === 'event' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {holiday.type || 'holiday'}
                    </span>
                  </div>
                  {holiday.date && (
                    <p className="text-sm text-secondary mb-1">
                      {new Date(holiday.date).toLocaleDateString('en-US', { 
                        weekday: 'long',
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  )}
                  {!holiday.date && holiday.type === 'notice' && (
                    <p className="text-sm text-secondary mb-1">📢 Ongoing Notice</p>
                  )}
                  {holiday.description && (
                    <p className="text-sm text-gray-400">{holiday.description}</p>
                  )}
                  {!holiday.isCalendarEvent && (
                    <p className="text-xs text-orange-400 mt-1">📌 Notice only (not on calendar)</p>
                  )}
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
