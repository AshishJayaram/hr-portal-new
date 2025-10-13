"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { getCompanySettings, updateCompanySettings, getLeaveCategories, createLeaveCategory, updateLeaveCategory, deleteLeaveCategory } from "@/lib/api";
import { PayrollSettings, PayrollMode, defaultPayrollSettings, computePayslipFromCTC } from "@/lib/payroll";
import RoleGuard from "@/components/RoleGuard";
import { LeaveCategory } from "@/lib/api";
import { toast } from "sonner";

function getCompanyId(): string {
  if (typeof window === 'undefined') return 'demo-company';
  return localStorage.getItem('companyId') || 'demo-company';
}

export default function CompanySettingsPage() {
  const companyId = getCompanyId();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["company-settings", companyId],
    queryFn: () => getCompanySettings(companyId),
  });
  const { data: leaveCategories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["leave-categories"],
    queryFn: () => getLeaveCategories(),
  });
  const [settings, setSettings] = useState<PayrollSettings>(defaultPayrollSettings);
  const [currency, setCurrency] = useState<string>('INR');
  const [annualCTC, setAnnualCTC] = useState<number>(1000000);
  const [lop, setLop] = useState<number>(0);
  const [tds, setTds] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'payroll' | 'leaves' | 'general' | 'categories'>('payroll');

  useEffect(() => {
    if (data?.data) {
      setSettings(data.data);
      // Extract currency from company settings if available
      if (data.data.currency) {
        setCurrency(data.data.currency);
      }
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => updateCompanySettings(companyId, settings, currency),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-settings", companyId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: (category: Partial<LeaveCategory>) => createLeaveCategory(category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-categories"] });
      queryClient.invalidateQueries({ queryKey: ["leave-allocations"] });
      queryClient.invalidateQueries({ queryKey: ["leave-balance"] });
      toast.success("Leave category added successfully!");
      // Refresh the page to show updated data
      setTimeout(() => window.location.reload(), 1000);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add leave category");
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, category }: { id: string; category: Partial<LeaveCategory> }) => updateLeaveCategory(id, category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-categories"] });
      queryClient.invalidateQueries({ queryKey: ["leave-allocations"] });
      queryClient.invalidateQueries({ queryKey: ["leave-balance"] });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => deleteLeaveCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-categories"] });
      queryClient.invalidateQueries({ queryKey: ["leave-allocations"] });
      queryClient.invalidateQueries({ queryKey: ["leave-balance"] });
    },
  });

  const breakdown = useMemo(() => computePayslipFromCTC(annualCTC, settings, { lopDays: lop, tdsOverride: tds }), [annualCTC, settings, lop, tds]);

  const setComponent = (path: (s: PayrollSettings) => { mode: PayrollMode; value?: number }, field: 'mode' | 'value', value: any) => {
    setSettings(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as PayrollSettings;
      const target = path(next) as any;
      target[field] = value;
      return next;
    });
  };

  const restoreDefaults = () => setSettings(defaultPayrollSettings);

  if (isLoading || categoriesLoading) return <div className="p-6">Loading...</div>;

  return (
    <RoleGuard allowedRoles={["HR", "Admin"]} fallback={<div className="p-6">You do not have permission to view company settings.</div>}>
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Company Settings</h1>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-white/5 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'general'
              ? 'bg-indigo-500 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10'
          }`}
        >
          General Settings
        </button>
        <button
          onClick={() => setActiveTab('payroll')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'payroll'
              ? 'bg-indigo-500 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10'
          }`}
        >
          Payroll Settings
        </button>
        <button
          onClick={() => setActiveTab('leaves')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'leaves'
              ? 'bg-indigo-500 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10'
          }`}
        >
          Leave Categories
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'categories'
              ? 'bg-indigo-500 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10'
          }`}
        >
          Payroll Categories
        </button>
      </div>

      {activeTab === 'general' && (
        <>
          <h2 className="text-2xl font-bold text-primary">General Settings</h2>
          
          <Card>
            <h3 className="text-xl font-semibold mb-4">Currency Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Default Currency
                </label>
                <Select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  options={[
                    { value: 'INR', label: 'Indian Rupee (₹)' },
                    { value: 'USD', label: 'US Dollar ($)' },
                    { value: 'EUR', label: 'Euro (€)' },
                    { value: 'GBP', label: 'British Pound (£)' },
                    { value: 'JPY', label: 'Japanese Yen (¥)' },
                    { value: 'CAD', label: 'Canadian Dollar (C$)' },
                    { value: 'AUD', label: 'Australian Dollar (A$)' },
                  ]}
                />
                <p className="text-xs text-gray-400 mt-2">
                  This will be used as the default currency for all monetary values across the system.
                </p>
              </div>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {saveMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </>
      )}

      {activeTab === 'payroll' && (
        <>
          <h2 className="text-2xl font-bold text-primary">Payroll Settings</h2>

      <Card>
        <h2 className="text-xl font-semibold mb-4">Earnings</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {(
            [
              { key: 'basic', label: 'Basic' },
              { key: 'hra', label: 'HRA' },
              { key: 'medical', label: 'Medical' },
              { key: 'conveyance', label: 'Conveyance' },
              { key: 'lta', label: 'LTA' },
              { key: 'specialAllowance', label: 'Special Allowance' },
            ] as const
          ).map(({ key, label }) => (
            <div key={key} className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-2">
              <div className="text-sm text-gray-300">{label}</div>
              <Select
                value={(settings.earnings as any)[key].mode}
                onChange={(e) => setComponent((s) => (s.earnings as any)[key], 'mode', e.target.value as PayrollMode)}
                options={[
                  { value: 'PERCENT_OF_CTC', label: 'Percent of CTC' },
                  { value: 'PERCENT_OF_BASIC', label: 'Percent of Basic' },
                  { value: 'FIXED', label: 'Fixed' },
                  { value: 'REMAINDER', label: 'Remainder' },
                ]}
              />
              <Input
                type="number"
                label="Value"
                value={String((settings.earnings as any)[key].value ?? '')}
                onChange={(e) => setComponent((s) => (s.earnings as any)[key], 'value', Number(e.target.value))}
                disabled={(settings.earnings as any)[key].mode === 'REMAINDER'}
              />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold mb-4">Employee Deductions</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-2">
            <div className="text-sm text-gray-300">Employee PF</div>
            <Select
              value={settings.deductions.employeePF.mode}
              onChange={(e) => setSettings({ ...settings, deductions: { ...settings.deductions, employeePF: { ...settings.deductions.employeePF, mode: e.target.value as PayrollMode } } })}
              options={[
                { value: 'PERCENT_OF_BASIC', label: 'Percent of Basic' },
                { value: 'PERCENT_OF_CTC', label: 'Percent of CTC' },
                { value: 'FIXED', label: 'Fixed' },
              ]}
            />
            <Input
              type="number"
              label="Value"
              value={String(settings.deductions.employeePF.value ?? '')}
              onChange={(e) => setSettings({ ...settings, deductions: { ...settings.deductions, employeePF: { ...settings.deductions.employeePF, value: Number(e.target.value) } } })}
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!settings.deductions.employeePF.capAt1800} onChange={(e) => setSettings({ ...settings, deductions: { ...settings.deductions, employeePF: { ...settings.deductions.employeePF, capAt1800: e.target.checked } } })} />
              Cap at ₹1,800
            </label>
          </div>
          <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-2">
            <div className="text-sm text-gray-300">Professional Tax</div>
            <Select
              value={settings.deductions.professionalTax.mode}
              onChange={(e) => setSettings({ ...settings, deductions: { ...settings.deductions, professionalTax: { ...settings.deductions.professionalTax, mode: e.target.value as PayrollMode } } })}
              options={[
                { value: 'FIXED', label: 'Fixed' },
                { value: 'PERCENT_OF_BASIC', label: 'Percent of Basic' },
                { value: 'PERCENT_OF_CTC', label: 'Percent of CTC' },
              ]}
            />
            <Input
              type="number"
              label="Value"
              value={String(settings.deductions.professionalTax.value ?? '')}
              onChange={(e) => setSettings({ ...settings, deductions: { ...settings.deductions, professionalTax: { ...settings.deductions.professionalTax, value: Number(e.target.value) } } })}
            />
          </div>
          <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-2">
            <div className="text-sm text-gray-300">ESI</div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={settings.deductions.esiEnabled} onChange={(e) => setSettings({ ...settings, deductions: { ...settings.deductions, esiEnabled: e.target.checked } })} />
              Enabled
            </label>
            <Select
              value={settings.deductions.esi.mode}
              onChange={(e) => setSettings({ ...settings, deductions: { ...settings.deductions, esi: { ...settings.deductions.esi, mode: e.target.value as PayrollMode } } })}
              options={[
                { value: 'FIXED', label: 'Fixed' },
                { value: 'PERCENT_OF_BASIC', label: 'Percent of Basic' },
                { value: 'PERCENT_OF_CTC', label: 'Percent of CTC' },
              ]}
            />
            <Input
              type="number"
              label="Value"
              value={String(settings.deductions.esi.value ?? '')}
              onChange={(e) => setSettings({ ...settings, deductions: { ...settings.deductions, esi: { ...settings.deductions.esi, value: Number(e.target.value) } } })}
              disabled={!settings.deductions.esiEnabled}
            />
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold mb-4">Employer PF (Read-only)</h2>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 rounded-lg bg-white/5 border border-white/10">Employer PF: 12% of Basic</div>
          <div className="p-4 rounded-lg bg-white/5 border border-white/10">EPS: 8.33% of Basic (cap ₹1,250)</div>
          <div className="p-4 rounded-lg bg-white/5 border border-white/10">EPF: Employer PF − EPS</div>
        </div>
      </Card>

      <div className="flex gap-3">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>Save Settings</Button>
        <Button variant="outline" onClick={restoreDefaults}>Restore Defaults</Button>
      </div>

      <Card>
        <h2 className="text-xl font-semibold mb-4">Preview</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <Input type="number" label="Annual CTC" value={String(annualCTC)} onChange={(e) => setAnnualCTC(Number(e.target.value))} />
            <div className="text-sm text-gray-400">Monthly CTC: ₹{breakdown.monthlyCTC.toLocaleString('en-IN')}</div>
            <Input type="number" label="LOP Days" value={String(lop)} onChange={(e) => setLop(Number(e.target.value))} />
            <Input type="number" label="TDS (override)" value={String(tds)} onChange={(e) => setTds(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <div className="font-semibold">Earnings</div>
            {Object.entries(breakdown.earnings).map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm"><span className="capitalize">{k}</span><span>₹{v.toLocaleString('en-IN')}</span></div>
            ))}
            <div className="flex justify-between text-sm border-t border-white/10 pt-2"><span>Total</span><span>₹{breakdown.totals.totalEarnings.toLocaleString('en-IN')}</span></div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="font-semibold mb-1">Deductions</div>
              <div className="flex justify-between text-sm"><span>Employee PF</span><span>₹{breakdown.deductions.empPF.toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between text-sm"><span>Professional Tax</span><span>₹{breakdown.deductions.professionalTax.toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between text-sm"><span>ESI</span><span>₹{breakdown.deductions.esi.toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between text-sm border-t border-white/10 pt-2"><span>Total</span><span>₹{breakdown.totals.totalDeductions.toLocaleString('en-IN')}</span></div>
            </div>
            <div>
              <div className="font-semibold mb-1">Employer PF</div>
              <div className="flex justify-between text-sm"><span>Total PF</span><span>₹{breakdown.employer.totalPF.toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between text-sm"><span>EPS</span><span>₹{breakdown.employer.eps.toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between text-sm"><span>EPF</span><span>₹{breakdown.employer.epf.toLocaleString('en-IN')}</span></div>
            </div>
            <div className="flex justify-between font-semibold"><span>Net Pay</span><span>₹{breakdown.totals.netPay.toLocaleString('en-IN')}</span></div>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold mb-4">LOP (Loss of Pay) Settings</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-2">
            <div className="text-sm text-gray-300">Calculation Method</div>
            <Select
              value={settings.lop.calculationMethod}
              onChange={(e) => setSettings({
                ...settings,
                lop: { ...settings.lop, calculationMethod: e.target.value as any }
              })}
              options={[
                { value: 'NET_PAY_BY_DAYS', label: 'Net Pay ÷ Days in Month' },
                { value: 'BASIC_BY_DAYS', label: 'Basic Salary ÷ Days in Month' },
                { value: 'FIXED_AMOUNT', label: 'Fixed Amount per Day' },
              ]}
            />
          </div>
          <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-2">
            <div className="text-sm text-gray-300">Default Days in Month</div>
            <Input
              type="number"
              value={settings.lop.defaultDaysInMonth}
              onChange={(e) => setSettings({
                ...settings,
                lop: { ...settings.lop, defaultDaysInMonth: parseInt(e.target.value) || 30 }
              })}
              min="28"
              max="31"
            />
          </div>
        </div>
        <div className="mt-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <h3 className="text-sm font-medium text-blue-600 dark:text-blue-300 mb-2">LOP Calculation Preview</h3>
          <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
            <div>Method: {settings.lop.calculationMethod === 'NET_PAY_BY_DAYS' ? 'Net Pay ÷ Days' : 
                          settings.lop.calculationMethod === 'BASIC_BY_DAYS' ? 'Basic ÷ Days' : 'Fixed Amount'}</div>
            <div>Days in Month: {settings.lop.defaultDaysInMonth}</div>
            <div className="text-xs text-gray-400 mt-2">
              Example: For 1 LOP day with ₹50,000 net pay: ₹{(50000 / settings.lop.defaultDaysInMonth).toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </Card>
        </>
      )}

      {activeTab === 'leaves' && (
        <>
          <h2 className="text-2xl font-bold text-primary">Leave Categories</h2>
          <LeaveCategoriesManager 
            categories={leaveCategories?.data || []}
            onCreate={createCategoryMutation.mutate}
            onUpdate={updateCategoryMutation.mutate}
            onDelete={deleteCategoryMutation.mutate}
            isLoading={createCategoryMutation.isPending || updateCategoryMutation.isPending || deleteCategoryMutation.isPending}
          />
        </>
      )}

      {activeTab === 'categories' && (
        <>
          <h2 className="text-2xl font-bold text-primary">Payroll Categories</h2>
          <PayrollCategoriesManager 
            settings={settings}
            onUpdate={setSettings}
            onSave={() => saveMutation.mutate()}
            isLoading={saveMutation.isPending}
          />
        </>
      )}
    </div>
    </RoleGuard>
  );
}

function LeaveCategoriesManager({ 
  categories, 
  onCreate, 
  onUpdate, 
  onDelete, 
  isLoading 
}: { 
  categories: LeaveCategory[];
  onCreate: (category: Partial<LeaveCategory>) => void;
  onUpdate: (params: { id: string; category: Partial<LeaveCategory> }) => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
}) {
  const [editingCategory, setEditingCategory] = useState<LeaveCategory | null>(null);
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    defaultDays: 1,
    maxDaysPerYear: 20,
    isActive: true,
  });

  const handleCreate = () => {
    if (newCategory.name && newCategory.defaultDays > 0) {
      onCreate(newCategory);
      setNewCategory({ name: '', description: '', defaultDays: 1, maxDaysPerYear: 20, isActive: true });
    }
  };

  const handleUpdate = () => {
    if (editingCategory) {
      onUpdate({ id: editingCategory.id, category: editingCategory });
      setEditingCategory(null);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this leave category?')) {
      onDelete(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Create New Category */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">Add New Leave Category</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <Input
            label="Category Name"
            value={newCategory.name}
            onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
            placeholder="e.g., Casual Leave"
            disabled={isLoading}
          />
          <Input
            label="Description"
            value={newCategory.description}
            onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
            placeholder="e.g., General purpose leave"
            disabled={isLoading}
          />
          <Input
            type="number"
            label="Default Days"
            value={String(newCategory.defaultDays)}
            onChange={(e) => {
              const value = parseInt(e.target.value) || 0;
              setNewCategory({ ...newCategory, defaultDays: value });
            }}
            placeholder="24"
            min="1"
            disabled={isLoading}
          />
          <Input
            type="number"
            label="Max Days Per Year"
            value={String(newCategory.maxDaysPerYear)}
            onChange={(e) => {
              const value = parseInt(e.target.value) || 20;
              setNewCategory({ ...newCategory, maxDaysPerYear: value });
            }}
            placeholder="20"
            min="1"
            disabled={isLoading}
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={newCategory.isActive}
              onChange={(e) => setNewCategory({ ...newCategory, isActive: e.target.checked })}
              disabled={isLoading}
            />
            <label htmlFor="isActive" className="text-sm">Active</label>
          </div>
        </div>
        <div className="mt-4">
          <Button 
            onClick={handleCreate} 
            disabled={isLoading || !newCategory.name.trim() || newCategory.defaultDays < 1}
            className="flex items-center gap-2"
          >
            {isLoading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            {isLoading ? "Adding Category..." : "Add Category"}
          </Button>
          {(!newCategory.name.trim() || newCategory.defaultDays < 1) && (
            <p className="text-sm text-gray-400 mt-2">
              Please fill in the category name and set default days to at least 1
            </p>
          )}
        </div>
      </Card>

      {/* Existing Categories */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">Existing Leave Categories</h3>
        <div className="space-y-4">
          {categories.map((category) => (
            <div key={category.id} className="p-4 rounded-lg bg-white/5 border border-white/10">
              {editingCategory?.id === category.id ? (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <Input
                      label="Category Name"
                      value={editingCategory.name}
                      onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                    />
                    <Input
                      label="Description"
                      value={editingCategory.description || ''}
                      onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                    />
                    <Input
                      type="number"
                      label="Default Days"
                      value={String(editingCategory.defaultDays)}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        setEditingCategory({ ...editingCategory, defaultDays: value });
                      }}
                      min="1"
                    />
                    <Input
                      type="number"
                      label="Max Days Per Year"
                      value={String(editingCategory.maxDaysPerYear)}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 20;
                        setEditingCategory({ ...editingCategory, maxDaysPerYear: value });
                      }}
                      min="1"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editingCategory.isActive}
                        onChange={(e) => setEditingCategory({ ...editingCategory, isActive: e.target.checked })}
                      />
                      <label className="text-sm">Active</label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleUpdate} 
                      disabled={isLoading || !editingCategory.name.trim() || editingCategory.defaultDays < 1}
                    >
                      Save
                    </Button>
                    <Button variant="outline" onClick={() => setEditingCategory(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-primary">{category.name}</h4>
                    <p className="text-sm text-secondary">{category.description}</p>
                    <div className="flex gap-4 mt-2 text-sm">
                      <span>Default Days: <strong>{category.defaultDays}</strong></span>
                      <span className={`px-2 py-1 rounded text-xs ${category.isActive ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400'}`}>
                        {category.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditingCategory(category)}>
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(category.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {categories.length === 0 && (
            <div className="text-center py-8 text-secondary">
              No leave categories configured yet.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function PayrollCategoriesManager({ 
  settings, 
  onUpdate, 
  onSave, 
  isLoading 
}: { 
  settings: PayrollSettings;
  onUpdate: (settings: PayrollSettings) => void;
  onSave: () => void;
  isLoading: boolean;
}) {
  const [newEarningKey, setNewEarningKey] = useState('');
  const [newEarningLabel, setNewEarningLabel] = useState('');
  const [newEarningMode, setNewEarningMode] = useState<PayrollMode>('FIXED');
  const [newEarningValue, setNewEarningValue] = useState(0);
  
  const [newDeductionKey, setNewDeductionKey] = useState('');
  const [newDeductionLabel, setNewDeductionLabel] = useState('');
  const [newDeductionMode, setNewDeductionMode] = useState<PayrollMode>('FIXED');
  const [newDeductionValue, setNewDeductionValue] = useState(0);

  const addEarningCategory = () => {
    if (!newEarningKey || !newEarningLabel) return;
    
    const updatedSettings = {
      ...settings,
      earnings: {
        ...settings.earnings,
        [newEarningKey]: {
          mode: newEarningMode,
          value: newEarningMode !== 'REMAINDER' ? newEarningValue : undefined
        }
      },
      customEarnings: [
        ...(settings.customEarnings || []),
        { key: newEarningKey, label: newEarningLabel, mode: newEarningMode, value: newEarningValue }
      ]
    };
    
    onUpdate(updatedSettings);
    setNewEarningKey('');
    setNewEarningLabel('');
    setNewEarningMode('FIXED');
    setNewEarningValue(0);
  };

  const addDeductionCategory = () => {
    if (!newDeductionKey || !newDeductionLabel) return;
    
    const updatedSettings = {
      ...settings,
      deductions: {
        ...settings.deductions,
        [newDeductionKey]: {
          mode: newDeductionMode,
          value: newDeductionMode !== 'REMAINDER' ? newDeductionValue : undefined
        }
      },
      customDeductions: [
        ...(settings.customDeductions || []),
        { key: newDeductionKey, label: newDeductionLabel, mode: newDeductionMode, value: newDeductionValue }
      ]
    };
    
    onUpdate(updatedSettings);
    setNewDeductionKey('');
    setNewDeductionLabel('');
    setNewDeductionMode('FIXED');
    setNewDeductionValue(0);
  };

  const removeEarningCategory = (key: string) => {
    const updatedSettings = {
      ...settings,
      earnings: { ...settings.earnings },
      customEarnings: (settings.customEarnings || []).filter(cat => cat.key !== key)
    };
    delete updatedSettings.earnings[key];
    onUpdate(updatedSettings);
  };

  const removeDeductionCategory = (key: string) => {
    const updatedSettings = {
      ...settings,
      deductions: { ...settings.deductions },
      customDeductions: (settings.customDeductions || []).filter(cat => cat.key !== key)
    };
    delete updatedSettings.deductions[key];
    onUpdate(updatedSettings);
  };

  return (
    <div className="space-y-6">
      {/* Earnings Categories */}
      <Card>
        <h3 className="text-xl font-semibold mb-4">Earnings Categories</h3>
        
        {/* Add New Earning Category */}
        <div className="p-4 rounded-lg bg-white/5 border border-white/10 mb-4">
          <h4 className="font-medium mb-3">Add New Earning Category</h4>
          <div className="grid md:grid-cols-4 gap-3">
            <Input
              placeholder="Key (e.g., bonus)"
              value={newEarningKey}
              onChange={(e) => setNewEarningKey(e.target.value)}
            />
            <Input
              placeholder="Label (e.g., Performance Bonus)"
              value={newEarningLabel}
              onChange={(e) => setNewEarningLabel(e.target.value)}
            />
            <Select
              value={newEarningMode}
              onChange={(e) => setNewEarningMode(e.target.value as PayrollMode)}
              options={[
                { value: 'FIXED', label: 'Fixed' },
                { value: 'PERCENT_OF_BASIC', label: '% of Basic' },
                { value: 'PERCENT_OF_CTC', label: '% of CTC' },
              ]}
            />
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Value"
                value={String(newEarningValue)}
                onChange={(e) => setNewEarningValue(Number(e.target.value))}
                disabled={newEarningMode === 'REMAINDER'}
              />
              <Button onClick={addEarningCategory} disabled={!newEarningKey || !newEarningLabel}>
                Add
              </Button>
            </div>
          </div>
        </div>

        {/* Existing Custom Earnings */}
        <div className="space-y-2">
          {(settings.customEarnings || []).map((category) => (
            <div key={category.key} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
              <div>
                <div className="font-medium">{category.label}</div>
                <div className="text-sm text-gray-400">
                  {category.mode} {category.value ? `(${category.value})` : ''}
                </div>
              </div>
              <Button
                onClick={() => removeEarningCategory(category.key)}
                className="bg-rose-600 hover:bg-rose-700"
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Deductions Categories */}
      <Card>
        <h3 className="text-xl font-semibold mb-4">Deductions Categories</h3>
        
        {/* Add New Deduction Category */}
        <div className="p-4 rounded-lg bg-white/5 border border-white/10 mb-4">
          <h4 className="font-medium mb-3">Add New Deduction Category</h4>
          <div className="grid md:grid-cols-4 gap-3">
            <Input
              placeholder="Key (e.g., advance)"
              value={newDeductionKey}
              onChange={(e) => setNewDeductionKey(e.target.value)}
            />
            <Input
              placeholder="Label (e.g., Salary Advance)"
              value={newDeductionLabel}
              onChange={(e) => setNewDeductionLabel(e.target.value)}
            />
            <Select
              value={newDeductionMode}
              onChange={(e) => setNewDeductionMode(e.target.value as PayrollMode)}
              options={[
                { value: 'FIXED', label: 'Fixed' },
                { value: 'PERCENT_OF_BASIC', label: '% of Basic' },
                { value: 'PERCENT_OF_CTC', label: '% of CTC' },
              ]}
            />
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Value"
                value={String(newDeductionValue)}
                onChange={(e) => setNewDeductionValue(Number(e.target.value))}
                disabled={newDeductionMode === 'REMAINDER'}
              />
              <Button onClick={addDeductionCategory} disabled={!newDeductionKey || !newDeductionLabel}>
                Add
              </Button>
            </div>
          </div>
        </div>

        {/* Existing Custom Deductions */}
        <div className="space-y-2">
          {(settings.customDeductions || []).map((category) => (
            <div key={category.key} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
              <div>
                <div className="font-medium">{category.label}</div>
                <div className="text-sm text-gray-400">
                  {category.mode} {category.value ? `(${category.value})` : ''}
                </div>
              </div>
              <Button
                onClick={() => removeDeductionCategory(category.key)}
                className="bg-rose-600 hover:bg-rose-700"
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={onSave}
          disabled={isLoading}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          {isLoading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}


