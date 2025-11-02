"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getHolidays, getAvailableHolidayYears, createHoliday, updateHoliday, deleteHoliday, Holiday, canManageHolidays } from "@/lib/api";
import RoleGuard from "@/components/RoleGuard";
import Card from "@/components/ui/Card";
import Loader from "@/components/ui/Loader";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";

export default function HolidaysPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [typeFilter, setTypeFilter] = useState<"all" | "holiday" | "event" | "notice">("all");
  const [formData, setFormData] = useState({
    name: "",
    startDate: "",
    endDate: "",
    type: "holiday" as "holiday" | "event" | "notice",
    description: "",
    isCalendarEvent: true,
    color: "#ef4444",
    isMultiDay: false,
  });

  // Fetch available years once
  const { data: availableYears = [] } = useQuery({
    queryKey: ["available-holiday-years"],
    queryFn: async () => {
      const response = await getAvailableHolidayYears();
      return response.data;
    },
    staleTime: 300000, // Cache for 5 minutes since years don't change often
  });

  // Use React Query for automatic data fetching and caching
  const { data: holidays = [], isLoading: loading, error } = useQuery({
    queryKey: ["holidays", selectedYear],
    queryFn: async () => {
      const response = await getHolidays({ year: selectedYear });
      return response.data;
    },
    refetchOnWindowFocus: true, // Auto-refresh when window gains focus
    staleTime: 30000, // Consider data stale after 30 seconds
  });

  // Create holiday mutation
  const createHolidayMutation = useMutation({
    mutationFn: createHoliday,
    onSuccess: () => {
      // Invalidate and refetch holidays data
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      queryClient.invalidateQueries({ queryKey: ["holidays", selectedYear] });
      queryClient.invalidateQueries({ queryKey: ["available-holiday-years"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["holidays", "dashboard"] });
      setShowForm(false);
      setEditingHoliday(null);
      setFormData({ name: "", startDate: "", endDate: "", type: "holiday", description: "", isCalendarEvent: true, color: "#ef4444", isMultiDay: false });
      // Show success message
      alert("Holiday/Event created successfully!");
    },
    onError: (error: any) => {
      // Failed to create holiday
    },
  });

  // Update holiday mutation
  const updateHolidayMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateHoliday(id, data),
    onSuccess: () => {
      // Invalidate and refetch holidays data
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      queryClient.invalidateQueries({ queryKey: ["holidays", selectedYear] });
      queryClient.invalidateQueries({ queryKey: ["available-holiday-years"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["holidays", "dashboard"] });
      setShowForm(false);
      setEditingHoliday(null);
      setFormData({ name: "", startDate: "", endDate: "", type: "holiday", description: "", isCalendarEvent: true, color: "#ef4444", isMultiDay: false });
      // Show success message
      alert("Holiday/Event updated successfully!");
    },
    onError: (error: any) => {
      // Failed to update holiday
    },
  });

  // Delete holiday mutation
  const deleteHolidayMutation = useMutation({
    mutationFn: deleteHoliday,
    onSuccess: () => {
      // Invalidate and refetch holidays data
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      queryClient.invalidateQueries({ queryKey: ["holidays", selectedYear] });
      queryClient.invalidateQueries({ queryKey: ["available-holiday-years"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["holidays", "dashboard"] });
      // Show success message
      alert("Holiday/Event deleted successfully!");
    },
    onError: (error: any) => {
      // Failed to delete holiday
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prepare the data for submission
    const { startDate, endDate, isMultiDay, ...baseData } = formData;
    const submitData = {
      ...baseData,
      date: isMultiDay 
        ? `${startDate} to ${endDate}`
        : startDate,
    };
    
    if (editingHoliday) {
      updateHolidayMutation.mutate({ id: editingHoliday.id, data: submitData });
    } else {
      createHolidayMutation.mutate(submitData);
    }
  };

  const handleEdit = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    
    // Parse the holiday date to determine if it's multi-day
    let startDate = "";
    let endDate = "";
    let isMultiDay = false;
    
    if (holiday.dateRange) {
      // Multi-day event using dateRange field
      const [start, end] = holiday.dateRange.split(" to ");
      startDate = start.trim();
      endDate = end.trim();
      isMultiDay = true;
    } else if (holiday.date) {
      // Single day event
      startDate = holiday.date;
      endDate = holiday.date;
      isMultiDay = false;
    }
    
    setFormData({
      name: holiday.name,
      startDate: startDate,
      endDate: endDate,
      type: holiday.type || "holiday",
      description: holiday.description || "",
      isCalendarEvent: holiday.isCalendarEvent ?? true,
      color: holiday.color || "#ef4444",
      isMultiDay: isMultiDay,
    });
    setShowForm(true);
  };

  const handleDelete = async (holidayId: string) => {
    if (!confirm("Are you sure you want to delete this holiday?")) return;
    deleteHolidayMutation.mutate(holidayId);
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Holidays, Events & Notices</h1>
        <RoleGuard allowedRoles={["HR", "Admin"]}>
          <button
            onClick={() => {
              setEditingHoliday(null);
              setShowForm(true);
            }}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700"
          >
            Add Holiday/Event/Notice
          </button>
        </RoleGuard>
      </div>

      {/* Year Selector for Financial Year */}
      <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <label htmlFor="year-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Financial Year:
            </label>
            <Select
              id="year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              options={availableYears.length > 0 ? availableYears.map((year) => {
                const financialYearLabel = `${year} (Apr ${year.toString().slice(-2)} - Mar ${(year + 1).toString().slice(-2)})`;
                return {
                  value: year.toString(),
                  label: financialYearLabel
                };
              }) : [new Date().getFullYear()].map((year) => {
                const financialYearLabel = `${year} (Apr ${year.toString().slice(-2)} - Mar ${(year + 1).toString().slice(-2)})`;
                return {
                  value: year.toString(),
                  label: financialYearLabel
                };
              })}
            />
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing holidays and events for FY {selectedYear}
          </div>
        </div>
      </div>

      {/* Type Filter */}
      <div className="bg-white/5 dark:bg-white/10 rounded-lg p-4 border border-card">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-primary mr-2">Filter:</span>
            <button
              onClick={() => setTypeFilter("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                typeFilter === "all"
                  ? "bg-indigo-500 text-white"
                  : "bg-white/5 dark:bg-white/10 text-secondary hover:bg-white/10 dark:hover:bg-white/20"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setTypeFilter("holiday")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                typeFilter === "holiday"
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : "bg-white/5 dark:bg-white/10 text-secondary hover:bg-white/10 dark:hover:bg-white/20"
              }`}
            >
              Holidays
            </button>
            <button
              onClick={() => setTypeFilter("event")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                typeFilter === "event"
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "bg-white/5 dark:bg-white/10 text-secondary hover:bg-white/10 dark:hover:bg-white/20"
              }`}
            >
              Events
            </button>
            <button
              onClick={() => setTypeFilter("notice")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                typeFilter === "notice"
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-white/5 dark:bg-white/10 text-secondary hover:bg-white/10 dark:hover:bg-white/20"
              }`}
            >
              Notices
            </button>
          </div>
          <div className="text-sm text-secondary">
            {(() => {
              const filteredCount = holidays.filter((holiday) => {
                if (typeFilter === "all") return true;
                return holiday.type === typeFilter;
              }).length;
              const totalCount = holidays.length;
              return typeFilter === "all" 
                ? `Showing all ${totalCount} items`
                : `Showing ${filteredCount} of ${totalCount} items`;
            })()}
          </div>
        </div>
      </div>

      {(error || createHolidayMutation.error || updateHolidayMutation.error || deleteHolidayMutation.error) && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
          {error?.message ||
           createHolidayMutation.error?.message ||
           updateHolidayMutation.error?.message ||
           deleteHolidayMutation.error?.message}
        </div>
      )}

      <RoleGuard allowedRoles={["HR", "Admin"]}>
        {showForm && (
          <Card>
            <h2 className="text-xl font-semibold mb-4">
              {editingHoliday ? "Edit Holiday/Event/Notice" : "Add Holiday/Event/Notice"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                <Select
                  label="Type"
                  value={formData.type}
                  onChange={(e) => {
                    const newType = e.target.value as "holiday" | "event" | "notice";
                    setFormData({ 
                      ...formData, 
                      type: newType,
                      startDate: newType === 'notice' ? '' : formData.startDate, // Clear date for notices
                      endDate: newType === 'notice' ? '' : formData.endDate,
                      color: newType === "holiday" ? "#ef4444" : newType === "event" ? "#ec4899" : "#8b5cf6"
                    });
                  }}
                  options={[
                    { value: "holiday", label: "Holiday" },
                    { value: "event", label: "Event" },
                    { value: "notice", label: "Notice" }
                  ]}
                />
              </div>

              {/* Multi-day Event Checkbox - More Prominent */}
              <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="isMultiDay"
                    checked={formData.isMultiDay}
                    onChange={(e) => {
                      const isMultiDay = e.target.checked;
                      setFormData({ 
                        ...formData, 
                        isMultiDay,
                        endDate: isMultiDay ? formData.endDate : formData.startDate // Set end date to start date if single day
                      });
                    }}
                    className="w-4 h-4 rounded text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500 focus:ring-2"
                    disabled={formData.type === 'notice'}
                  />
                  <label htmlFor="isMultiDay" className="text-sm font-medium text-gray-200 cursor-pointer">
                    📅 Multi-day Event
                  </label>
                  <span className="text-xs text-gray-400">
                    {formData.isMultiDay ? "Select start and end dates" : "Select single date"}
                  </span>
                </div>
              </div>

              {/* Calendar Event Checkbox */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isCalendarEvent"
                  checked={formData.isCalendarEvent}
                  onChange={(e) => setFormData({ ...formData, isCalendarEvent: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500 focus:ring-2"
                />
                <label htmlFor="isCalendarEvent" className="text-sm font-medium text-gray-200">
                  Show on Calendar
                </label>
              </div>
              
              {/* Date Fields */}
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label={formData.isMultiDay ? "Start Date" : "Date"}
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => {
                    const startDate = e.target.value;
                    setFormData({ 
                      ...formData, 
                      startDate,
                      endDate: formData.isMultiDay ? formData.endDate : startDate // Auto-set end date if single day
                    });
                  }}
                  required={formData.type !== 'notice'}
                />
                {formData.isMultiDay && (
                  <Input
                    label="End Date"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required={formData.isMultiDay}
                  />
                )}
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
                  loading={createHolidayMutation.isPending || updateHolidayMutation.isPending}
                >
                  {editingHoliday ? "Update" : "Create"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingHoliday(null);
                    setFormData({ name: "", startDate: "", endDate: "", type: "holiday", description: "", isCalendarEvent: true, color: "#ef4444", isMultiDay: false });
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
          .filter((holiday) => {
            if (typeFilter === "all") return true;
            return holiday.type === typeFilter;
          })
          .sort((a, b) => {
            // Notices without dates go to the end
            const aDate = a.date || a.dateRange?.split(' to ')[0];
            const bDate = b.date || b.dateRange?.split(' to ')[0];
            if (!aDate && !bDate) return 0;
            if (!aDate) return 1;
            if (!bDate) return -1;
            return new Date(aDate).getTime() - new Date(bDate).getTime();
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
                    
                    const displayDate = holiday.date || holiday.dateRange?.split(' to ')[0];
                    if (!displayDate) return "📢"; // Default for notices without dates
                    
                    const month = new Date(displayDate).getMonth();
                    const day = new Date(displayDate).getDate();
                    
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
                      holiday.type === 'notice' ? 'bg-green-500/20 text-green-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {holiday.type || 'holiday'}
                    </span>
                  </div>
                  {(holiday.date || holiday.dateRange) && (
                    <p className="text-sm text-secondary mb-1">
                      {holiday.dateRange ? (
                        // Multi-day range
                        (() => {
                          const [start, end] = holiday.dateRange.split(" to ");
                          const startDate = new Date(start.trim());
                          const endDate = new Date(end.trim());
                          return `${startDate.toLocaleDateString('en-US', { 
                            weekday: 'short',
                            month: 'short', 
                            day: 'numeric' 
                          })} - ${endDate.toLocaleDateString('en-US', { 
                            weekday: 'short',
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}`;
                        })()
                      ) : (
                        // Single day
                        new Date(holiday.date!).toLocaleDateString('en-US', { 
                          weekday: 'long',
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })
                      )}
                    </p>
                  )}
                  {!holiday.date && !holiday.dateRange && holiday.type === 'notice' && (
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
                    className="p-2 text-blue-400 hover:text-blue-300 dark:text-blue-500 dark:hover:text-blue-400 hover:bg-white/10 dark:hover:bg-blue-500/10 rounded transition-colors"
                    title="Edit holiday"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(holiday.id)}
                    disabled={deleteHolidayMutation.isPending}
                    className="p-2 text-red-400 hover:text-red-300 dark:text-red-500 dark:hover:text-red-400 hover:bg-white/10 dark:hover:bg-red-500/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete holiday"
                  >
                    {deleteHolidayMutation.isPending ? "⏳" : "🗑️"}
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
