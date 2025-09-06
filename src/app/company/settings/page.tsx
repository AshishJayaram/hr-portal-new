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
  const [annualCTC, setAnnualCTC] = useState<number>(1000000);
  const [lop, setLop] = useState<number>(0);
  const [tds, setTds] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'payroll' | 'leaves'>('payroll');

  useEffect(() => {
    if (data?.data) setSettings(data.data);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => updateCompanySettings(companyId, settings),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["company-settings", companyId] }),
  });

  const createCategoryMutation = useMutation({
    mutationFn: (category: Partial<LeaveCategory>) => createLeaveCategory(category),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leave-categories"] }),
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, category }: { id: string; category: Partial<LeaveCategory> }) => updateLeaveCategory(id, category),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leave-categories"] }),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => deleteLeaveCategory(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leave-categories"] }),
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
      <div className="flex space-x-1 bg-white/5 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('payroll')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'payroll'
              ? 'bg-white/10 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Payroll Settings
        </button>
        <button
          onClick={() => setActiveTab('leaves')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'leaves'
              ? 'bg-white/10 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Leave Categories
        </button>
      </div>

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
    defaultDays: 0,
    isActive: true,
  });

  const handleCreate = () => {
    if (newCategory.name && newCategory.defaultDays > 0) {
      onCreate(newCategory);
      setNewCategory({ name: '', description: '', defaultDays: 0, isActive: true });
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
          />
          <Input
            label="Description"
            value={newCategory.description}
            onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
            placeholder="e.g., General purpose leave"
          />
          <Input
            type="number"
            label="Default Days"
            value={String(newCategory.defaultDays)}
            onChange={(e) => setNewCategory({ ...newCategory, defaultDays: Number(e.target.value) })}
            placeholder="24"
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={newCategory.isActive}
              onChange={(e) => setNewCategory({ ...newCategory, isActive: e.target.checked })}
            />
            <label htmlFor="isActive" className="text-sm">Active</label>
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={handleCreate} disabled={isLoading || !newCategory.name || newCategory.defaultDays <= 0}>
            Add Category
          </Button>
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
                      onChange={(e) => setEditingCategory({ ...editingCategory, defaultDays: Number(e.target.value) })}
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
                    <Button onClick={handleUpdate} disabled={isLoading}>Save</Button>
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
                      <span className={`px-2 py-1 rounded text-xs ${category.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
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


