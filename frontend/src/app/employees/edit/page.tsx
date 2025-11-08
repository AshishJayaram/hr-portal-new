"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUser, updateUser, toCanonicalRole, getCompanySettings, getLeaveCategories, getLeaveAllocations, updateLeaveAllocation, createLeaveAllocation, deleteLeaveAllocation, getLeaveBalance, getLeaves } from "@/lib/api";
import { useFilteredUsers } from "@/hooks/useUsersCache";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useMemo, Suspense } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Loader from "@/components/ui/Loader";
import { computePayslipFromCTC } from "@/lib/payroll";
import { toast } from "sonner";
import { LeaveCategory, LeaveAllocation } from "@/lib/api";
import { formatCurrency, getDefaultCurrency } from "@/lib/currency";

export default function EditEmployeePage() {
  return (
    <Suspense fallback={<Loader />}>
      <EditEmployeePageContent />
    </Suspense>
  );
}

function EditEmployeePageContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') || '';
  return <EditEmployeeForm id={id} />;
}

function EditEmployeeForm({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    designation: "",
    role: "Employee" as "Employee" | "HR" | "Admin" | "God",
    department: "",
    manager_id: "",
    employee_id: "",
    ctc: "",
    joining_date: "",
    birthday: "",
    hike_cycle_months: "",
    last_hike_date: "",
  });
  const [originalJoiningDate, setOriginalJoiningDate] = useState<string>("");
  const [originalBirthday, setOriginalBirthday] = useState<string>("");
  const [transferReports, setTransferReports] = useState(false);
  const [originalManagerId, setOriginalManagerId] = useState("");
  const [managerQuery, setManagerQuery] = useState("");
  const [selectedManagerName, setSelectedManagerName] = useState("");
  const [leaveAllocations, setLeaveAllocations] = useState<Record<string, number>>({});
  const [leaveApplicable, setLeaveApplicable] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'details' | 'leaves' | 'ctc'>('details');
  const [ctcData, setCtcData] = useState({
    annualCTC: 0,
    lopDays: 0,
    tdsOverride: 0,
  });

  const { data: user, isLoading } = useQuery({
    queryKey: ["user", id],
    queryFn: () => getUser(id),
  });

  // Use global users cache and filter managers
  const { users: allUsers } = useFilteredUsers();
  
  const managers = useMemo(() => {
    const filtered = allUsers.filter((u: any) => 
      !managerQuery || 
      u.name?.toLowerCase().includes(managerQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(managerQuery.toLowerCase())
    );
    return { data: filtered };
  }, [allUsers, managerQuery]);

  const companyId = typeof window !== 'undefined' ? (localStorage.getItem('companyId') || 'demo-company') : 'demo-company';
  const { data: companySettings } = useQuery({
    queryKey: ["company-settings", companyId],
    queryFn: () => getCompanySettings(companyId),
    staleTime: 300000, // Cache for 5 minutes
  });

  const { data: leaveCategories } = useQuery({
    queryKey: ["leave-categories"],
    queryFn: () => getLeaveCategories(),
    staleTime: 300000, // Cache for 5 minutes
  });

  const { data: currentAllocations } = useQuery({
    queryKey: ["leave-allocations", id],
    queryFn: () => getLeaveAllocations(id),
    enabled: !!id,
    staleTime: 60000, // Cache for 1 minute
  });

  const { data: leaveBalance } = useQuery({
    queryKey: ["leave-balance", id],
    queryFn: () => getLeaveBalance(id),
    enabled: !!id,
    staleTime: 60000, // Cache for 1 minute
  });

  useEffect(() => {
    if (user?.data) {
      const managerId = (user.data as any).managerId || (user.data as any).manager_id || "";
      
      // Helper function to parse and format date for input
      const parseDateForInput = (dateValue: any): string => {
        if (!dateValue) return "";
        try {
          const dateStr = String(dateValue).trim();
          let date: Date;
          if (dateStr.includes('T') || dateStr.includes(' ')) {
            const cleanDateStr = dateStr.split(' ')[0].split('T')[0];
            date = new Date(cleanDateStr + 'T00:00:00');
          } else {
            date = new Date(dateStr + 'T00:00:00');
          }
          if (isNaN(date.getTime())) {
            return "";
          }
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        } catch (e) {
          return "";
        }
      };

      // Helper function to format date for display
      const formatDateForDisplay = (dateValue: any): string => {
        if (!dateValue) return "";
        try {
          const dateStr = String(dateValue).trim();
          let date: Date;
          if (dateStr.includes('T') || dateStr.includes(' ')) {
            const cleanDateStr = dateStr.split(' ')[0].split('T')[0];
            date = new Date(cleanDateStr + 'T00:00:00');
          } else {
            date = new Date(dateStr + 'T00:00:00');
          }
          if (isNaN(date.getTime())) {
            return "";
          }
          return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        } catch (e) {
          return "";
        }
      };

      // Access joining_date and birthday with fallback to raw data
      const rawUser = user.data as any;
      const joiningDateValue = user.data.joining_date ?? rawUser.joining_date ?? rawUser.JoiningDate ?? null;
      const birthdayValue = user.data.birthday ?? rawUser.birthday ?? rawUser.Birthday ?? null;
      
      const joiningDateInput = parseDateForInput(joiningDateValue);
      const birthdayInput = parseDateForInput(birthdayValue);
      
      setOriginalJoiningDate(formatDateForDisplay(joiningDateValue));
      setOriginalBirthday(formatDateForDisplay(birthdayValue));
      
      setFormData({
        name: user.data.name || "",
        username: user.data.name || user.data.email || "",
        email: user.data.email || "",
        designation: user.data.designation || "",
        role: user.data.role,
        department: user.data.department || "",
        manager_id: managerId,
        employee_id: user.data.employee_id || "",
        ctc: user.data.ctc || "",
        joining_date: joiningDateInput,
        birthday: birthdayInput,
        hike_cycle_months: (user.data as any).hike_cycle_months ? String((user.data as any).hike_cycle_months) : "",
        last_hike_date: (user.data as any).last_hike_date ? parseDateForInput((user.data as any).last_hike_date) : "",
      });
      
      // Store original manager ID for comparison
      setOriginalManagerId(managerId);
      
      // Set manager query to show current manager
      if (managerId && (user.data as any).manager?.name) {
        setManagerQuery(`${(user.data as any).manager.name} (Employee ID: ${(user.data as any).manager?.employee_id})`);
        setSelectedManagerName((user.data as any).manager.name);
      }
      
      // Initialize CTC data
      if (user.data.ctc) {
        setCtcData({
          annualCTC: parseFloat(user.data.ctc) || 0,
          lopDays: 0,
          tdsOverride: 0,
        });
      }
    }
  }, [user]);

  // Initialize leave allocations from current data
  useEffect(() => {
    if (currentAllocations?.data && leaveCategories?.data) {
      const allocations: Record<string, number> = {};
      const applicable: Record<string, boolean> = {};
      
      // Create a set of active category IDs for filtering
      const activeCategoryIds = new Set(
        leaveCategories.data
          .filter((cat: LeaveCategory) => cat.isActive)
          .map((cat: LeaveCategory) => cat.id)
      );
      
      // Only initialize allocations for categories that still exist and are active
      currentAllocations.data.forEach((allocation: LeaveAllocation) => {
        const categoryId = String(allocation.categoryId);
        // Only include if category still exists and is active
        if (activeCategoryIds.has(categoryId)) {
          allocations[categoryId] = allocation.totalDays;
          applicable[categoryId] = allocation.totalDays > 0;
        }
      });
      
      // Set default applicable state for active categories not yet allocated
      leaveCategories.data
        .filter((category: LeaveCategory) => category.isActive)
        .forEach((category: LeaveCategory) => {
          if (!(category.id in applicable)) {
            applicable[category.id] = false;
          }
        });
      
      setLeaveAllocations(allocations);
      setLeaveApplicable(applicable);
    }
  }, [currentAllocations, leaveCategories]);

  const mutation = useMutation({
    mutationFn: (body: any) => updateUser(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["user", id] });
      queryClient.invalidateQueries({ queryKey: ["team"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Employee updated successfully");
      router.push("/employees");
    },
    onError: (error: any) => {
      // Employee update failed
      toast.error(error.message || "Failed to update employee");
    },
  });

  const leaveAllocationMutation = useMutation({
    mutationFn: async () => {
      
      if (!leaveCategories?.data) {
        // Missing leave categories data, returning early
        return;
      }
      
      // If no current allocations, that's okay - we'll create new ones
      const currentAllocationsData = currentAllocations?.data || [];
      
      const currentYear = new Date().getFullYear();
      const promises: Promise<any>[] = [];
      
      // Create a set of active category IDs for filtering
      const activeCategoryIds = new Set(
        leaveCategories.data
          .filter((cat: LeaveCategory) => cat.isActive)
          .map((cat: LeaveCategory) => cat.id)
      );
      
      // Track processed categories to avoid duplicates
      const processedCategories = new Set<string>();
      
      // First, clean up orphaned allocations (allocations for categories that no longer exist or are inactive)
      // These are allocations in the database for categories that have been deleted or deactivated
      currentAllocationsData.forEach((allocation: LeaveAllocation) => {
        const allocationCategoryId = String(allocation.categoryId);
        const category = leaveCategories.data.find((c: LeaveCategory) => c.id === allocationCategoryId);
        
        // If category doesn't exist or is inactive, delete the orphaned allocation
        if (!category || !category.isActive) {
          promises.push(deleteLeaveAllocation(id, allocation.id).catch(() => {
            // Failed to delete orphaned allocation - continue with other operations
          }));
        }
      });
      
      // Update existing allocations or create new ones
      // Only process allocations for categories that currently exist and are active
      Object.entries(leaveAllocations).forEach(([categoryId, days]) => {
        // Skip if category doesn't exist or is not active
        if (!activeCategoryIds.has(categoryId)) {
          return;
        }
        
        // Skip if already processed
        if (processedCategories.has(categoryId)) {
          return;
        }
        processedCategories.add(categoryId);
        
        const isApplicable = leaveApplicable[categoryId];
        const existingAllocation = currentAllocationsData.find(
          (a: LeaveAllocation) => String(a.categoryId) === String(categoryId) && a.year === currentYear
        );
        
        // Verify the category for the existing allocation still exists and is active
        const categoryForExistingAllocation = existingAllocation 
          ? leaveCategories.data.find((c: LeaveCategory) => c.id === String(existingAllocation.categoryId))
          : null;
        
        if (existingAllocation) {
          // If the category for this allocation no longer exists or is inactive, delete the allocation
          if (!categoryForExistingAllocation || !categoryForExistingAllocation.isActive) {
            // Delete allocation for deleted/inactive category
            promises.push(deleteLeaveAllocation(id, existingAllocation.id).catch(() => {
              // Failed to delete allocation - continue with other operations
            }));
            return; // Skip processing this allocation further
          }
          
          // Existing allocation found - UPDATE only
          if (isApplicable && Number(days) > 0) {
            // Update existing allocation
            promises.push(updateLeaveAllocation(id, existingAllocation.id, {
              totalDays: Number(days),
              usedDays: existingAllocation.usedDays, // Keep existing used days
            }));
          } else {
            // Delete allocation if not applicable or days is 0
            promises.push(deleteLeaveAllocation(id, existingAllocation.id));
          }
        } else if (isApplicable && Number(days) > 0) {
          // No existing allocation - CREATE only
          const category = leaveCategories.data.find((c: LeaveCategory) => c.id === categoryId);
          if (category && category.isActive) {
            promises.push(createLeaveAllocation(id, {
              categoryId,
              categoryName: category.name,
              totalDays: Number(days),
              usedDays: 0,
              remainingDays: Number(days),
              year: currentYear,
            }));
          }
        }
      });
      
      // Execute all promises and collect any errors
      const results = await Promise.allSettled(promises);
      
      // Check for errors
      const errors = results
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map(result => result.reason?.message || result.reason?.error?.message || String(result.reason) || 'Unknown error');
      
      if (errors.length > 0) {
        // If some operations failed, throw an error with details
        throw new Error(errors.join('; '));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-allocations", id] });
      queryClient.invalidateQueries({ queryKey: ["leave-balance", id] });
      queryClient.invalidateQueries({ queryKey: ["leave-balance"] });
      queryClient.invalidateQueries({ queryKey: ["approved-leaves-raw", id] });
      toast.success("Leave allocations updated successfully");
    },
    onError: (error: any) => {
      const errorMessage = error?.message || error?.error?.message || "Failed to update leave allocations";
      toast.error(errorMessage);
    },
  });

  const ctcMutation = useMutation({
    mutationFn: (ctcValue: number) => updateUser(id, { ctc: ctcValue.toString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", id] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["team"] });
      queryClient.invalidateQueries({ queryKey: ["salary-slips"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("CTC updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update CTC");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();


    // Prevent self-assignment as manager and circular references
    if (formData.manager_id && String(formData.manager_id) === String(id)) {
      toast.error("An employee cannot be assigned as their own manager");
      return;
    }

    // Additional validation will be handled by the backend to prevent circular references

    const payload = {
      name: formData.name,
      username: formData.username,
      email: formData.email,
      designation: formData.designation,
      role: toCanonicalRole(formData.role),
      department: formData.department,
      manager_id: formData.manager_id ? String(formData.manager_id) : undefined, // Convert to string to match backend
      employee_id: formData.employee_id || undefined,
      joining_date: formData.joining_date || undefined,
      birthday: formData.birthday || "",
      hike_cycle_months: formData.hike_cycle_months ? Number(formData.hike_cycle_months) : undefined,
      last_hike_date: formData.last_hike_date || undefined,
      transfer_reports: formData.manager_id !== originalManagerId ? transferReports : undefined, // Only include if manager changed
    };

    mutation.mutate(payload);
  };

  // Show loader while any critical data is loading
  const isDataLoading = isLoading || 
    (id && !user?.data) || 
    (id && !leaveCategories?.data);

  if (isDataLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader />
        <div className="text-center">
          <p className="text-lg font-medium text-gray-600 dark:text-gray-300">
            Loading Employee Data
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Fetching employee details, leave allocations, and balance information...
          </p>
        </div>
      </div>
    );
  }

  if (!user?.data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Employee not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Employee</h1>
        <Button
          variant="outline"
          onClick={() => router.back()}
        >
          Back
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-white/5 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('details')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'details'
              ? 'bg-indigo-500 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10'
          }`}
        >
          Employee Details
        </button>
        <button
          onClick={() => setActiveTab('leaves')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'leaves'
              ? 'bg-indigo-500 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10'
          }`}
        >
          Leave Allocations
        </button>
        <button
          onClick={() => setActiveTab('ctc')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'ctc'
              ? 'bg-indigo-500 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10'
          }`}
        >
          CTC Management
        </button>
      </div>

      {activeTab === 'details' && (
        <>
          <Card>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Input
                  label="Full Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                <Input
                  label="Username (name or email)"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                />
                <Input
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
                <Input
                  label="Designation"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  placeholder="e.g., Software Engineer, Manager"
                />
                <Select
                  label="Role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  options={[
                    { value: "Employee", label: "Employee" },
                    { value: "HR", label: "HR" },
                  ]}
                />
            <Input
              label="Department"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            />
            <Input
              label="Employee ID"
              value={formData.employee_id}
              onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
              placeholder="e.g., EMP001"
            />
            <Input
              label={originalJoiningDate 
                ? `Joining Date (Current: ${originalJoiningDate})`
                : "Joining Date"}
              type="date"
              value={formData.joining_date}
              onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
            />
            <Input
              label={originalBirthday 
                ? `Birthday (Current: ${originalBirthday})`
                : "Birthday"}
              type="date"
              value={formData.birthday}
              onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
            />
            <Input
              label="Hike Cycle (months)"
              type="number"
              min="1"
              value={formData.hike_cycle_months}
              onChange={(e) => setFormData({ ...formData, hike_cycle_months: e.target.value })}
              placeholder="e.g., 12 for annual hike"
            />
            <Input
              label="Last Hike Date"
              type="date"
              value={formData.last_hike_date}
              onChange={(e) => setFormData({ ...formData, last_hike_date: e.target.value })}
            />
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm">Manager (search and select)</label>
                    {formData.manager_id && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, manager_id: "" });
                          setManagerQuery("");
                          setSelectedManagerName("");
                        }}
                        className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-500 dark:hover:text-rose-300"
                      >
                        Clear Manager
                      </button>
                    )}
                  </div>
                  <Input 
                    value={managerQuery} 
                    onChange={(e) => setManagerQuery(e.target.value)} 
                    onFocus={() => {
                      if (managerQuery.length === 0) {
                        setManagerQuery(" "); // Trigger showing all users
                      }
                    }}
                    placeholder="Click to see all users or search by name..." 
                  />
                  {formData.manager_id && (
                    <div className="mt-2 p-2 bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/20 rounded text-emerald-600 dark:text-emerald-400 text-sm">
                      ✓ Selected: {selectedManagerName || `Manager ID: ${formData.manager_id}`}
                    </div>
                  )}
                  {formData.manager_id && String(formData.manager_id) === String(id) && (
                    <div className="mt-2 p-2 bg-rose-100 dark:bg-rose-500/10 border border-rose-300 dark:border-rose-500/20 rounded text-rose-600 dark:text-rose-400 text-sm">
                      ⚠️ An employee cannot be assigned as their own manager
                    </div>
                  )}
                  {(managerQuery.length > 0 || managers?.data) && (
                    <div className="mt-2 max-h-48 overflow-y-auto border border-card dark:border-white/10 rounded-lg bg-card dark:bg-white/10 shadow-lg">
                      {(managers?.data || [])
                        .filter((u: any) => String(u.id) !== String(id)) // Exclude current employee
                        .map((u: any) => (
                        <button
                          type="button"
                          key={u.id}
                          className={`w-full text-left px-3 py-2 hover:bg-white/10 dark:hover:bg-white/20 text-primary dark:text-white transition-colors ${String(formData.manager_id) === String(u.id) ? 'bg-indigo-500/20 dark:bg-indigo-500/30 border-l-4 border-indigo-500' : ''}`}
                          onClick={() => {
                            setFormData({ ...formData, manager_id: String(u.id) });
                            setManagerQuery(`${u.name} (Employee ID: ${u.employee_id})`);
                            setSelectedManagerName(u.name); 
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span>{u.name}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Employee ID: {u.employee_id} • {u.role}</span>
                          </div>
                          {u.designation && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{u.designation}</div>}
                        </button>
                      ))}
                      {(!managers?.data || managers.data.filter((u: any) => String(u.id) !== String(id)).length === 0) && (
                        <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No matching users found. Try typing to search...</div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Transfer Reports Option */}
                {formData.manager_id !== originalManagerId && formData.manager_id && (
                  <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id="transfer-reports"
                        checked={transferReports}
                        onChange={(e) => setTransferReports(e.target.checked)}
                        className="mt-1 rounded"
                      />
                      <div className="flex-1">
                        <label htmlFor="transfer-reports" className="block text-sm font-medium text-blue-600 dark:text-blue-400">
                          Transfer Reports to New Manager
                        </label>
                        <p className="text-xs text-blue-500 dark:text-blue-300 mt-1">
                          If this employee has direct reports, they will be transferred to the new manager. 
                          This ensures continuity in the reporting structure.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  loading={mutation.isPending}
                  disabled={!!(formData.manager_id && String(formData.manager_id) === String(id))}
                >
                  Update Employee
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </>
      )}

      {activeTab === 'leaves' && (
        <div className="space-y-6">
          <LeaveBalanceManager
            leaveBalance={leaveBalance?.data || []}
            userId={id}
            currentAllocations={currentAllocations?.data || []}
          />
          <LeaveAllocationManager
            categories={leaveCategories?.data || []}
            allocations={leaveAllocations}
            applicable={leaveApplicable}
            currentAllocations={currentAllocations?.data || []}
            onAllocationChange={setLeaveAllocations}
            onApplicableChange={setLeaveApplicable}
            onSave={leaveAllocationMutation.mutate}
            isLoading={leaveAllocationMutation.isPending}
          />
        </div>
      )}

      {activeTab === 'ctc' && (
        <CTCManager
          ctcData={ctcData}
          onCtcDataChange={setCtcData}
          onSave={ctcMutation.mutate}
          isLoading={ctcMutation.isPending}
          companySettings={companySettings?.data}
        />
      )}
    </div>
  );
}

function LeaveAllocationManager({
  categories,
  allocations,
  applicable,
  currentAllocations,
  onAllocationChange,
  onApplicableChange,
  onSave,
  isLoading,
}: {
  categories: LeaveCategory[];
  allocations: Record<string, number>;
  applicable: Record<string, boolean>;
  currentAllocations: LeaveAllocation[];
  onAllocationChange: (allocations: Record<string, number>) => void;
  onApplicableChange: (applicable: Record<string, boolean>) => void;
  onSave: () => void;
  isLoading: boolean;
}) {
  return (
    <Card>
      <h3 className="text-lg font-semibold mb-4">Leave Allocations</h3>
      <div className="space-y-4">
        {categories.filter(category => category.isActive).map((category) => {
          const currentAllocation = currentAllocations.find(
            (a: LeaveAllocation) => a.categoryId === category.id
          );
          const usedDays = currentAllocation?.usedDays || 0;
          const totalDays = allocations[category.id] || 0;
          const isApplicable = applicable[category.id] || false;
          
          return (
            <div key={category.id} className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id={`applicable-${category.id}`}
                      checked={isApplicable}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        onApplicableChange({ ...applicable, [category.id]: checked });
                        // If not applicable, set days to 0
                        if (!checked) {
                          onAllocationChange({ ...allocations, [category.id]: 0 });
                        } else if (allocations[category.id] === 0) {
                          // If becoming applicable and currently 0, set to default
                          onAllocationChange({ ...allocations, [category.id]: category.defaultDays });
                        }
                      }}
                      className="rounded"
                    />
                    <h4 className={`font-semibold ${isApplicable ? 'text-primary' : 'text-muted'}`}>
                      {category.name}
                    </h4>
                    {!isApplicable && (
                      <span className="text-xs text-rose-600 dark:text-rose-400 ml-2">Not Applicable</span>
                    )}
                  </div>
                  <p className="text-sm text-secondary">{category.description}</p>
                </div>
                <div className="text-right text-sm">
                  <div className="text-muted">Used: {usedDays} days</div>
                  <div className="text-muted">Remaining: {Math.max(0, totalDays - usedDays)} days</div>
                  <div className="text-muted">Default: {category.defaultDays} days</div>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Total Days Allocated
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max={category.maxDaysPerYear}
                    value={String(totalDays)}
                    onChange={(e) => {
                      const value = Number(e.target.value) || 0;
                      onAllocationChange({ ...allocations, [category.id]: value });
                    }}
                    placeholder={String(category.defaultDays)}
                    disabled={!isApplicable}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Category Default
                  </label>
                  <Input
                    type="number"
                    value={String(category.defaultDays)}
                    disabled
                    className="bg-gray-100 dark:bg-gray-800"
                  />
                </div>
              </div>
              
              {totalDays > category.maxDaysPerYear && (
                <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-400">
                    ⚠️ Allocation ({totalDays} days) exceeds the maximum allowed for this category ({category.maxDaysPerYear} days).
                  </p>
                </div>
              )}
              
              {usedDays > 0 && (
                <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    ⚠️ This employee has already used {usedDays} days. 
                    Reducing total allocation may affect their remaining balance.
                  </p>
                </div>
              )}
            </div>
          );
        })}
        
        {categories.filter(category => category.isActive).length === 0 && (
          <div className="text-center py-8 text-secondary">
            No active leave categories configured.
          </div>
        )}
      </div>
      
      <div className="mt-6 flex gap-3">
        <Button 
          onClick={onSave} 
          loading={isLoading}
          disabled={categories.some(category => 
            category.isActive && 
            applicable[category.id] && 
            allocations[category.id] > category.maxDaysPerYear
          )}
        >
          Save Leave Allocations
        </Button>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Reset Changes
        </Button>
      </div>
    </Card>
  );
}

function LeaveBalanceManager({ leaveBalance, userId, currentAllocations }: { leaveBalance: any[]; userId?: string; currentAllocations?: LeaveAllocation[] }) {
  // Check if there are any allocated leaves
  const hasAllocations = currentAllocations && currentAllocations.length > 0 && currentAllocations.some(a => (a.totalDays || 0) > 0);
  
  // Fetch approved leaves directly from API to get raw days field
  const { data: approvedLeavesRaw } = useQuery({
    queryKey: ["approved-leaves-raw", userId],
    queryFn: async () => {
      if (!userId) return { data: [] };
      const params = new URLSearchParams({ userId, status: "approved" });
      const response = await fetch(`/api/leaves?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Organization-ID': localStorage.getItem('organizationId') || '',
        },
      });
      const raw = await response.json();
      return raw?.data || raw || [];
    },
    enabled: !!userId,
    staleTime: 60000,
  });
  
  // Filter for LOP leaves and calculate total LOP days from raw API response
  const lopLeaves = Array.isArray(approvedLeavesRaw) ? approvedLeavesRaw.filter((leave: any) => {
    const leaveType = leave.type || leave.Type || '';
    return String(leaveType).toUpperCase() === 'LOP';
  }) : [];
  
  // Calculate total LOP days from approved LOP leaves
  const totalLOPDays = lopLeaves.reduce((sum: number, leave: any) => {
    // Access days from raw API response
    const days = leave.days || leave.Days || 0;
    const daysNum = typeof days === 'number' ? days : parseFloat(String(days)) || 0;
    return sum + daysNum;
  }, 0);

  return (
    <Card>
      <h3 className="text-lg font-semibold mb-4">Current Leave Balance</h3>
      {leaveBalance.length === 0 && !hasAllocations ? (
        <div className="text-center py-8 text-gray-400">
          <p className="text-lg font-medium mb-2">No leaves allocated</p>
          {totalLOPDays > 0 && (
            <p className="text-sm mt-2">
              LOPs taken: <span className="font-semibold text-yellow-600 dark:text-yellow-400">{totalLOPDays} day{totalLOPDays !== 1 ? 's' : ''}</span>
            </p>
          )}
          {totalLOPDays === 0 && (
            <p className="text-sm mt-2">Leave allocations need to be set up first</p>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {leaveBalance.map((balance: any, index: number) => (
            <div key={index} className="p-4 rounded-lg bg-white/5 border border-white/10">
              <h4 className="font-semibold text-primary mb-2">{balance.type}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total:</span>
                  <span className="font-medium">{balance.total} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Used:</span>
                  <span className="font-medium text-yellow-600 dark:text-yellow-400">{balance.used} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Remaining:</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">{balance.remaining} days</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function CTCManager({
  ctcData,
  onCtcDataChange,
  onSave,
  isLoading,
  companySettings,
}: {
  ctcData: { annualCTC: number; lopDays: number; tdsOverride: number };
  onCtcDataChange: (data: { annualCTC: number; lopDays: number; tdsOverride: number }) => void;
  onSave: (ctcValue: number) => void;
  isLoading: boolean;
  companySettings: any;
}) {
  const handleSave = () => {
    onSave(ctcData.annualCTC);
  };

  const breakdown = companySettings ? computePayslipFromCTC(ctcData.annualCTC, companySettings, { 
    lopDays: ctcData.lopDays, 
    tdsOverride: ctcData.tdsOverride 
  }) : null;

  return (
    <Card>
      <h3 className="text-lg font-semibold mb-4">CTC Management</h3>
      
      <div className="space-y-6">
        {/* CTC Input Section */}
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              Annual CTC ({getDefaultCurrency() === 'INR' ? '₹' : '$'})
            </label>
            <Input
              type="number"
              min="0"
              value={String(ctcData.annualCTC)}
              onChange={(e) => onCtcDataChange({
                ...ctcData,
                annualCTC: Number(e.target.value) || 0
              })}
              placeholder="Enter annual CTC"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              LOP Days
            </label>
            <Input
              type="number"
              min="0"
              max="31"
              value={String(ctcData.lopDays)}
              onChange={(e) => onCtcDataChange({
                ...ctcData,
                lopDays: Number(e.target.value) || 0
              })}
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              TDS Override (Yearly) ({getDefaultCurrency() === 'INR' ? '₹' : '$'})
            </label>
            <Input
              type="number"
              min="0"
              value={String(ctcData.tdsOverride)}
              onChange={(e) => onCtcDataChange({
                ...ctcData,
                tdsOverride: Number(e.target.value) || 0
              })}
              placeholder="0"
            />
          </div>
        </div>

        {/* CTC Breakdown Preview */}
        {breakdown && companySettings && (
          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <h4 className="font-semibold text-primary mb-4">CTC Breakdown Preview</h4>
            <div className="mb-4 p-3 bg-indigo-500/10 border border-indigo-500/20 dark:border-indigo-500/30 rounded-lg">
              <p className="text-sm text-secondary dark:text-gray-400">
                <strong className="text-primary dark:text-white">Note:</strong> All amounts shown below are <strong className="text-primary dark:text-white">Monthly</strong> (except Annual CTC).
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <div className="text-sm text-secondary">
                  Annual CTC: {formatCurrency(ctcData.annualCTC, getDefaultCurrency())}
                </div>
                <div className="text-sm text-secondary">
                  Monthly CTC: {formatCurrency(breakdown.monthlyCTC, getDefaultCurrency())}
                </div>
                {ctcData.lopDays > 0 && (
                  <div className="text-sm text-yellow-600 dark:text-yellow-400">
                    LOP Days: {ctcData.lopDays}
                  </div>
                )}
                {ctcData.tdsOverride > 0 && (
                  <div className="text-sm text-blue-600 dark:text-blue-400">
                    TDS Override (Yearly): {formatCurrency(ctcData.tdsOverride, getDefaultCurrency())}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="font-semibold">Earnings</div>
                {Object.entries(breakdown.earnings).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="capitalize">{k}</span>
                    <span>{formatCurrency(v, getDefaultCurrency())}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm border-t border-white/10 pt-2">
                  <span>Total</span>
                  <span>{formatCurrency(breakdown.totals.totalEarnings, getDefaultCurrency())}</span>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="font-semibold mb-1">Deductions</div>
                  <div className="flex justify-between text-sm">
                    <span>Employee PF</span>
                    <span>{formatCurrency(breakdown.deductions.empPF, getDefaultCurrency())}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Professional Tax</span>
                    <span>{formatCurrency(breakdown.deductions.professionalTax, getDefaultCurrency())}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>ESI</span>
                    <span>{formatCurrency(breakdown.deductions.esi, getDefaultCurrency())}</span>
                  </div>
                  {breakdown.deductions.tds > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>TDS</span>
                      <span>{formatCurrency(breakdown.deductions.tds, getDefaultCurrency())}</span>
                    </div>
                  )}
                  {(breakdown.deductions.lop ?? 0) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>LOP</span>
                      <span>{formatCurrency(breakdown.deductions.lop ?? 0, getDefaultCurrency())}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm border-t border-white/10 pt-2">
                    <span>Total</span>
                    <span>{formatCurrency(breakdown.totals.totalDeductions, getDefaultCurrency())}</span>
                  </div>
                </div>
                <div>
                  <div className="font-semibold mb-1">Employer PF</div>
                  <div className="flex justify-between text-sm">
                    <span>Total PF</span>
                    <span>{formatCurrency(breakdown.employer.totalPF, getDefaultCurrency())}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>EPS</span>
                    <span>{formatCurrency(breakdown.employer.eps, getDefaultCurrency())}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>EPF</span>
                    <span>{formatCurrency(breakdown.employer.epf, getDefaultCurrency())}</span>
                  </div>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Net Pay</span>
                  <span>{formatCurrency(breakdown.totals.netPay, getDefaultCurrency())}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button onClick={handleSave} loading={isLoading} disabled={ctcData.annualCTC <= 0 || !companySettings}>
            Save CTC
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Reset Changes
          </Button>
        </div>
        
        {!companySettings && (
          <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              ⚠️ Company settings are not available. CTC breakdown cannot be calculated.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
