"use client";

import { useState } from "react";
import React from "react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { createUser, toCanonicalRole, getUsers, getLeaveCategories, createLeaveAllocation, updateUser } from "@/lib/api";
import { getCompanySettings } from "@/lib/api";
import { computePayslipFromCTC } from "@/lib/payroll";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LeaveCategory, LeaveAllocation } from "@/lib/api";
import Loader from "@/components/ui/Loader";

export default function AddEmployeePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    username: "",
    password: "",
    name: "",
    email: "",
    designation: "",
    department: "HR",
    role: "Employee",
    manager_id: "",
  });
  const [managerQuery, setManagerQuery] = useState("");
  const [selectedManagerName, setSelectedManagerName] = useState("");
  const [activeTab, setActiveTab] = useState<'details' | 'leaves' | 'ctc'>('details');
  const [maxStep, setMaxStep] = useState<number>(0); // 0: details, 1: leaves, 2: ctc
  const [ctcData, setCtcData] = useState({ annualCTC: 0, lopDays: 0, tdsOverride: 0 });
  const [leaveAllocations, setLeaveAllocations] = useState<Record<string, number>>({});
  const [leaveApplicable, setLeaveApplicable] = useState<Record<string, boolean>>({});
  const companyId = typeof window !== 'undefined' ? (localStorage.getItem('companyId') || 'demo-company') : 'demo-company';
  const { data: companySettings, isLoading: companySettingsLoading } = useQuery({
    queryKey: ["company-settings", companyId],
    queryFn: () => getCompanySettings(companyId),
  });
  const { data: leaveCategories, isLoading: leaveCategoriesLoading } = useQuery({
    queryKey: ["leave-categories"],
    queryFn: () => getLeaveCategories(),
  });

  const stepIndex = (tab: 'details' | 'leaves' | 'ctc') => (tab === 'details' ? 0 : tab === 'leaves' ? 1 : 2);
  const goToTab = (tab: 'details' | 'leaves' | 'ctc') => {
    const idx = stepIndex(tab);
    if (idx <= maxStep) setActiveTab(tab);
  };
  const canProceedDetails = () => form.username.trim().length > 0 && form.password.trim().length > 0;
  const nextFromDetails = () => {
    if (!canProceedDetails()) return;
    setActiveTab('leaves');
    setMaxStep((m) => Math.max(m, 1));
  };
  const nextFromLeaves = () => {
    setActiveTab('ctc');
    setMaxStep((m) => Math.max(m, 2));
  };
  const backFromLeaves = () => setActiveTab('details');
  const backFromCTC = () => setActiveTab('leaves');
  const createEmployee = () => mutation.mutate({ ...form, leaveAllocations });

  const mutation = useMutation({
    mutationFn: async (body: any) => {
      const user = await createUser({
        username: body.username,
        password: body.password,
        name: body.name,
        email: body.email,
        designation: body.designation,
        department: body.department,
        role: toCanonicalRole(body.role),
        manager_id: body.manager_id ? String(body.manager_id) : undefined, // Convert to string
        ctc: Number(ctcData.annualCTC) || 0, // Include CTC in initial user creation
      });
      
      // Create leave allocations for the new user
      if (user.data?.id && leaveCategories?.data) {
        const currentYear = new Date().getFullYear();
        const allocationPromises = Object.entries(body.leaveAllocations || {}).map(([categoryId, days]) => {
          const category = leaveCategories.data.find(c => c.id === categoryId);
          const isApplicable = body.leaveApplicable?.[categoryId] || false;
          if (category && isApplicable && Number(days) >= 0) {
            return createLeaveAllocation(user.data.id, {
              categoryId,
              categoryName: category.name,
              totalDays: Number(days),
              year: currentYear,
            });
          }
          return Promise.resolve();
        });
        await Promise.all(allocationPromises);
      }
      
      return user;
    },
    onSuccess: () => {
      toast.success("Employee created with leave allocations");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["team"] });
      queryClient.invalidateQueries({ queryKey: ["leave-allocations"] });
      queryClient.invalidateQueries({ queryKey: ["leave-balance"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      router.push("/employees");
    },
    onError: (err: any) => toast.error(err.message || "Failed to create employee"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ ...form, leaveAllocations, leaveApplicable });
  };

  // Initialize leave allocations with default values
  React.useEffect(() => {
    if (leaveCategories?.data && Object.keys(leaveAllocations).length === 0) {
      const defaultAllocations: Record<string, number> = {};
      const defaultApplicable: Record<string, boolean> = {};
      leaveCategories.data.forEach(category => {
        if (category.isActive) {
          defaultAllocations[category.id] = category.defaultDays;
          defaultApplicable[category.id] = category.defaultDays > 0; // Set applicable based on default days
        }
      });
      setLeaveAllocations(defaultAllocations);
      setLeaveApplicable(defaultApplicable);
    }
  }, [leaveCategories]); // Removed leaveAllocations from dependencies to prevent infinite loop

  if (companySettingsLoading || leaveCategoriesLoading) return <Loader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Add Employee</h1>
        <Button
          variant="outline"
          onClick={() => router.back()}
        >
          Back
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-white/5 p-1 rounded-lg">
        <button 
          onClick={() => goToTab('details')} 
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'details'
              ? 'bg-white/10 text-white'
              : stepIndex('details') <= maxStep 
                ? 'text-gray-200 hover:text-white' 
                : 'text-gray-500 cursor-not-allowed'
          }`}
        >
          Employee Details
        </button>
        <button 
          onClick={() => goToTab('leaves')} 
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'leaves'
              ? 'bg-white/10 text-white'
              : stepIndex('leaves') <= maxStep 
                ? 'text-gray-200 hover:text-white' 
                : 'text-gray-500 cursor-not-allowed'
          }`}
        >
          Leave Allocations
        </button>
        <button 
          onClick={() => goToTab('ctc')} 
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'ctc'
              ? 'bg-white/10 text-white'
              : stepIndex('ctc') <= maxStep 
                ? 'text-gray-200 hover:text-white' 
                : 'text-gray-500 cursor-not-allowed'
          }`}
        >
          CTC Management
        </button>
      </div>

      {activeTab === 'details' && (
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Input label="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              <Input label="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
              <Input label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              <Input label="Designation" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="e.g., Software Engineer, Manager" />
              <Input label="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
              <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} options={[{ value: "Employee", label: "Employee" },{ value: "Manager", label: "Manager" },{ value: "HR", label: "HR" }]} />
            </div>
            <div>
              <label className="block text-sm mb-2">Manager (search and select)</label>
              <Input value={managerQuery} onChange={(e) => setManagerQuery(e.target.value)} placeholder="Search by name or ID..." />
              <ManagerSearch query={managerQuery} onSelect={(id, name) => { setForm({ ...form, manager_id: String(id) }); setSelectedManagerName(name); setManagerQuery(`${name} (ID: ${id})`); }} selectedId={form.manager_id} />
            </div>
            <div className="flex gap-3 justify-between">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="button" onClick={nextFromDetails} disabled={!canProceedDetails()}>Next</Button>
            </div>
          </form>
        </Card>
      )}

      {activeTab === 'leaves' && (
        <LeaveAllocationAddManager
          categories={leaveCategories?.data || []}
          allocations={leaveAllocations}
          applicable={leaveApplicable}
          onAllocationChange={setLeaveAllocations}
          onApplicableChange={setLeaveApplicable}
          onBack={backFromLeaves}
          onNext={nextFromLeaves}
        />
      )}

      {activeTab === 'ctc' && (
        <CTCAddManager 
          ctcData={ctcData} 
          onCtcDataChange={setCtcData} 
          companySettings={companySettings?.data}
          onBack={backFromCTC}
          onCreate={createEmployee}
          isLoading={mutation.isPending}
          canCreate={canProceedDetails()}
        />
      )}
    </div>
  );
}

function ManagerSearch({ query, onSelect, selectedId }: { query: string; onSelect: (id: string, name: string) => void; selectedId?: string }) {
  const { data } = useQuery({
    queryKey: ["users", query],
    queryFn: () => getUsers(query ? { q: query } : {}),
  });
  const users = data?.data || [];
  return (
    <div className="mt-2 max-h-48 overflow-y-auto border border-white/10 rounded">
      {users.map((u: any) => (
        <button
          type="button"
          key={u.id}
          className={`w-full text-left px-3 py-2 hover:bg-white/10 ${selectedId === String(u.id) ? 'bg-white/5' : ''}`}
          onClick={() => onSelect(String(u.id), u.name)}
        >
          {u.name} <span className="text-xs text-gray-400">(ID: {u.id})</span>
        </button>
      ))}
      {users.length === 0 && (
        <div className="px-3 py-2 text-sm text-gray-400">No users</div>
      )}
    </div>
  );
}

function LeaveAllocationAddManager({
  categories,
  allocations,
  applicable,
  onAllocationChange,
  onApplicableChange,
  onBack,
  onNext,
}: {
  categories: LeaveCategory[];
  allocations: Record<string, number>;
  applicable: Record<string, boolean>;
  onAllocationChange: (allocations: Record<string, number>) => void;
  onApplicableChange: (applicable: Record<string, boolean>) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <Card>
      <h3 className="text-lg font-semibold mb-4">Leave Allocations</h3>
      <div className="space-y-4">
        {categories.filter(category => category.isActive).map((category) => {
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
                      <span className="text-xs text-red-400 ml-2">Not Applicable</span>
                    )}
                  </div>
                  <p className="text-sm text-secondary">{category.description}</p>
                </div>
                <div className="text-right text-sm">
                  <div className="text-muted">Default: {category.defaultDays} days</div>
                  <div className="text-muted">Max per year: {category.maxDaysPerYear} days</div>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Total Days to Allocate
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max={category.maxDaysPerYear}
                    value={String(totalDays)}
                    onChange={(e) => {
                      const value = Number(e.target.value) || 0;
                      onAllocationChange({ ...allocations, [category.id]: value });
                      // If setting to 0, uncheck applicable
                      if (value === 0) {
                        onApplicableChange({ ...applicable, [category.id]: false });
                      } else {
                        // If setting to > 0, check applicable
                        onApplicableChange({ ...applicable, [category.id]: true });
                      }
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
            </div>
          );
        })}
        
        {categories.filter(category => category.isActive).length === 0 && (
          <div className="text-center py-8 text-secondary">
            No active leave categories configured.
          </div>
        )}
      </div>
      
      <div className="mt-6 flex justify-between gap-3">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext}>
          Next
        </Button>
      </div>
    </Card>
  );
}

function CTCAddManager({
  ctcData,
  onCtcDataChange,
  companySettings,
  onBack,
  onCreate,
  isLoading,
  canCreate,
}: {
  ctcData: { annualCTC: number; lopDays: number; tdsOverride: number };
  onCtcDataChange: (data: { annualCTC: number; lopDays: number; tdsOverride: number }) => void;
  companySettings: any;
  onBack: () => void;
  onCreate: () => void;
  isLoading: boolean;
  canCreate: boolean;
}) {
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
              Annual CTC (₹)
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
              TDS Override (₹)
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
        {breakdown && (
          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <h4 className="font-semibold text-primary mb-4">CTC Breakdown Preview</h4>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <div className="text-sm text-secondary">
                  Annual CTC: ₹{ctcData.annualCTC.toLocaleString('en-IN')}
                </div>
                <div className="text-sm text-secondary">
                  Monthly CTC: ₹{breakdown.monthlyCTC.toLocaleString('en-IN')}
                </div>
                {ctcData.lopDays > 0 && (
                  <div className="text-sm text-yellow-400">
                    LOP Days: {ctcData.lopDays}
                  </div>
                )}
                {ctcData.tdsOverride > 0 && (
                  <div className="text-sm text-blue-400">
                    TDS Override: ₹{ctcData.tdsOverride.toLocaleString('en-IN')}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="font-semibold text-primary">Earnings</div>
                {Object.entries(breakdown.earnings).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="capitalize">{k}</span>
                    <span>₹{v.toLocaleString('en-IN')}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm border-t border-card pt-2">
                  <span>Total</span>
                  <span>₹{breakdown.totals.totalEarnings.toLocaleString('en-IN')}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="font-semibold text-primary">Deductions</div>
                <div className="flex justify-between text-sm">
                  <span>Employee PF</span>
                  <span>₹{breakdown.deductions.empPF.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Professional Tax</span>
                  <span>₹{breakdown.deductions.professionalTax.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>ESI</span>
                  <span>₹{breakdown.deductions.esi.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between font-semibold text-primary border-t border-card pt-2">
                  <span>Net Pay</span>
                  <span className="text-green-600 dark:text-green-400">₹{breakdown.totals.netPay.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between gap-3">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={onCreate} loading={isLoading} disabled={!canCreate}>
            Create Employee
          </Button>
        </div>
      </div>
    </Card>
  );
}
