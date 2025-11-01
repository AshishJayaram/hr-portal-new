"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { getCompanySettings, updateCompanySettings, getLeaveCategories, createLeaveCategory, updateLeaveCategory, deleteLeaveCategory } from "@/lib/api";
import { PayrollSettings, PayrollMode, defaultPayrollSettings, computePayslipFromCTC, ComponentSetting, calculateLOPAmount } from "@/lib/payroll";
import RoleGuard from "@/components/RoleGuard";
import { LeaveCategory } from "@/lib/api";
import { toast } from "sonner";
import { Plus } from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<'payroll' | 'leaves' | 'general'>('payroll');

  // Custom categories state
  const [newEarningKey, setNewEarningKey] = useState('');
  const [newEarningLabel, setNewEarningLabel] = useState('');
  const [newEarningMode, setNewEarningMode] = useState<PayrollMode>('FIXED');
  const [newEarningValue, setNewEarningValue] = useState(0);
  
  const [newDeductionKey, setNewDeductionKey] = useState('');
  const [newDeductionLabel, setNewDeductionLabel] = useState('');
  const [newDeductionMode, setNewDeductionMode] = useState<PayrollMode>('FIXED');
  const [newDeductionValue, setNewDeductionValue] = useState(0);

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

  // Custom category functions
  const addCustomEarning = () => {
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
    
    setSettings(updatedSettings);
    setNewEarningKey('');
    setNewEarningLabel('');
    setNewEarningMode('FIXED');
    setNewEarningValue(0);
  };

  const addCustomDeduction = () => {
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
    
    setSettings(updatedSettings);
    setNewDeductionKey('');
    setNewDeductionLabel('');
    setNewDeductionMode('FIXED');
    setNewDeductionValue(0);
  };

  const removeCustomEarning = (key: string) => {
    const updatedSettings = {
      ...settings,
      earnings: { ...settings.earnings },
      customEarnings: (settings.customEarnings || []).filter(cat => cat.key !== key)
    };
    delete updatedSettings.earnings[key];
    setSettings(updatedSettings);
  };

  const removeCustomDeduction = (key: string) => {
    const updatedSettings = {
      ...settings,
      deductions: { ...settings.deductions },
      customDeductions: (settings.customDeductions || []).filter(cat => cat.key !== key)
    };
    delete updatedSettings.deductions[key];
    setSettings(updatedSettings);
  };

  const deleteEarningCategory = (key: string) => {
    // Remove from earnings object
    const updatedEarnings = { ...settings.earnings };
    delete updatedEarnings[key];
    
    // Remove from customEarnings array if present
    const updatedCustomEarnings = (settings.customEarnings || []).filter(cat => cat.key !== key);
    
    setSettings({
      ...settings,
      earnings: updatedEarnings,
      customEarnings: updatedCustomEarnings
    });
  };

  const deleteDeductionCategory = (key: string) => {
    // Skip special deduction fields that shouldn't be deleted
    if (key === 'esiEnabled') return;
    
    // Remove from deductions object
    const updatedDeductions = { ...settings.deductions };
    delete updatedDeductions[key];
    
    // Remove from customDeductions array if present
    const updatedCustomDeductions = (settings.customDeductions || []).filter(cat => cat.key !== key);
    
    setSettings({
      ...settings,
      deductions: updatedDeductions,
      customDeductions: updatedCustomDeductions
    });
  };

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
          CTC Rules & Breakdown
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
          <h2 className="text-2xl font-bold text-primary">CTC Rules & Breakdown</h2>
          <p className="text-gray-400 mb-6">Configure how CTC is broken down into earnings and deductions, including standard components and custom categories.</p>

          {/* Unified CTC Breakdown Configuration */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Earnings Section */}
            <Card>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-green-600 dark:text-green-400">Earnings Configuration</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Import from Live Preview breakdown
                    const standardEarnings = [
                      { key: 'basic', label: 'Basic', mode: settings.earnings.basic.mode, value: settings.earnings.basic.value },
                      { key: 'hra', label: 'HRA', mode: settings.earnings.hra.mode, value: settings.earnings.hra.value },
                      { key: 'medical', label: 'Medical', mode: settings.earnings.medical.mode, value: settings.earnings.medical.value },
                      { key: 'conveyance', label: 'Conveyance', mode: settings.earnings.conveyance.mode, value: settings.earnings.conveyance.value },
                      { key: 'lta', label: 'LTA', mode: settings.earnings.lta.mode, value: settings.earnings.lta.value },
                      { key: 'specialAllowance', label: 'Special Allowance', mode: settings.earnings.specialAllowance.mode, value: settings.earnings.specialAllowance.value },
                    ];
                    // Filter out earnings that already exist in customEarnings
                    const existingKeys = new Set((settings.customEarnings || []).map(e => e.key));
                    const newEarnings = standardEarnings.filter(e => !existingKeys.has(e.key));
                    setSettings({
                      ...settings,
                      customEarnings: [...(settings.customEarnings || []), ...newEarnings]
                    });
                    toast.success(`Imported ${newEarnings.length} earnings from Live Preview`);
                  }}
                  className="flex items-center gap-2 text-green-600 border-green-500/30 hover:bg-green-500/10"
                >
                  <Plus className="h-4 w-4" />
                  Import from Preview
                </Button>
              </div>

              {/* Earning Categories List */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-green-600 dark:text-green-400">Earning Categories</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addCustomEarning}
                    className="flex items-center gap-2 text-green-600 border-green-500/30 hover:bg-green-500/10"
                  >
                    <Plus className="h-4 w-4" />
                    Add Category
                  </Button>
                </div>
                
                {/* Add New Earning Category */}
                <div className="p-3 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 mb-3">
                  <div className="grid grid-cols-4 gap-2">
                    <Input
                      placeholder="Key (e.g., bonus)"
                      value={newEarningKey}
                      onChange={(e) => setNewEarningKey(e.target.value)}
                      className="text-sm"
                    />
                    <Input
                      placeholder="Label (e.g., Performance Bonus)"
                      value={newEarningLabel}
                      onChange={(e) => setNewEarningLabel(e.target.value)}
                      className="text-sm"
                    />
                    <Select
                      value={newEarningMode}
                      onChange={(e) => setNewEarningMode(e.target.value as PayrollMode)}
                      options={[
                        { value: 'FIXED', label: 'Fixed' },
                        { value: 'PERCENT_OF_BASIC', label: '% Basic' },
                        { value: 'PERCENT_OF_CTC', label: '% CTC' },
                        { value: 'REMAINDER', label: 'Remainder' },
                      ]}
                      className="text-sm"
                    />
                    <div className="flex gap-1">
                      <Input
                        type="number"
                        placeholder="Value"
                        value={String(newEarningValue)}
                        onChange={(e) => setNewEarningValue(Number(e.target.value))}
                        disabled={newEarningMode === 'REMAINDER'}
                        className="text-sm flex-1"
                      />
                      <Button onClick={addCustomEarning} disabled={!newEarningKey || !newEarningLabel} size="sm">
                        Add
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Earning Categories List */}
                <div className="space-y-2">
                  {[
                    { key: 'basic', label: 'Basic', setting: settings.earnings.basic },
                    { key: 'hra', label: 'HRA', setting: settings.earnings.hra },
                    { key: 'medical', label: 'Medical', setting: settings.earnings.medical },
                    { key: 'conveyance', label: 'Conveyance', setting: settings.earnings.conveyance },
                    { key: 'lta', label: 'LTA', setting: settings.earnings.lta },
                    { key: 'specialAllowance', label: 'Special Allowance', setting: settings.earnings.specialAllowance },
                  ].map((item) => {
                    const isCustom = (settings.customEarnings || []).some(e => e.key === item.key);
                    return (
                      <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-green-600 dark:text-green-400 text-sm">{item.label}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Select
                              value={item.setting.mode}
                              onChange={(e) => setComponent((s) => s.earnings[item.key as keyof typeof s.earnings], 'mode', e.target.value)}
                              options={[
                                { value: 'FIXED', label: 'Fixed' },
                                { value: 'PERCENT_OF_BASIC', label: '% Basic' },
                                { value: 'PERCENT_OF_CTC', label: '% CTC' },
                                { value: 'REMAINDER', label: 'Remainder' },
                              ]}
                              className="text-xs"
                            />
                            <Input
                              type="number"
                              value={String(item.setting.value ?? '')}
                              onChange={(e) => setComponent((s) => s.earnings[item.key as keyof typeof s.earnings], 'value', Number(e.target.value))}
                              disabled={item.setting.mode === 'REMAINDER'}
                              className="text-xs"
                              placeholder="Value"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 ml-2">
                          <Button
                            onClick={() => {
                              // Reset to default
                              const defaults = defaultPayrollSettings.earnings[item.key as keyof typeof defaultPayrollSettings.earnings];
                              setComponent((s) => s.earnings[item.key as keyof typeof s.earnings], 'mode', defaults.mode);
                              setComponent((s) => s.earnings[item.key as keyof typeof s.earnings], 'value', defaults.value);
                            }}
                            variant="outline"
                            size="sm"
                            title="Reset to default"
                            className="text-xs"
                          >
                            Reset
                          </Button>
                          <Button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete "${item.label}"? This will remove it from all calculations.`)) {
                                deleteEarningCategory(item.key);
                              }
                            }}
                            className="bg-red-600 hover:bg-red-700"
                            size="sm"
                            title="Delete category"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Additional Earning Categories */}
                  {(settings.customEarnings || [])
                    .filter(cat => !['basic', 'hra', 'medical', 'conveyance', 'lta', 'specialAllowance'].includes(cat.key))
                    .map((category) => (
                    <div key={category.key} className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-green-600 dark:text-green-400 text-sm">{category.label}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Select
                            value={category.mode}
                            onChange={(e) => {
                              const updated = (settings.customEarnings || []).map(c => 
                                c.key === category.key ? { ...c, mode: e.target.value as PayrollMode } : c
                              );
                              setSettings({ ...settings, customEarnings: updated });
                            }}
                            options={[
                              { value: 'FIXED', label: 'Fixed' },
                              { value: 'PERCENT_OF_BASIC', label: '% Basic' },
                              { value: 'PERCENT_OF_CTC', label: '% CTC' },
                              { value: 'REMAINDER', label: 'Remainder' },
                            ]}
                            className="text-xs"
                          />
                          <Input
                            type="number"
                            value={String(category.value ?? '')}
                            onChange={(e) => {
                              const updated = (settings.customEarnings || []).map(c => 
                                c.key === category.key ? { ...c, value: Number(e.target.value) } : c
                              );
                              setSettings({ ...settings, customEarnings: updated });
                            }}
                            disabled={category.mode === 'REMAINDER'}
                            className="text-xs"
                            placeholder="Value"
                          />
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete "${category.label}"? This will remove it from all calculations.`)) {
                            deleteEarningCategory(category.key);
                          }
                        }}
                        className="bg-red-600 hover:bg-red-700 ml-2"
                        size="sm"
                        title="Delete category"
                      >
                        Delete
                      </Button>
                    </div>
                  ))}
                  {[
                    ...Object.keys(settings.earnings).filter(k => !['basic', 'hra', 'medical', 'conveyance', 'lta', 'specialAllowance'].includes(k)),
                    ...(settings.customEarnings || []).filter(c => !['basic', 'hra', 'medical', 'conveyance', 'lta', 'specialAllowance'].includes(c.key)).map(c => c.key)
                  ].length === 0 && (
                    <div className="text-center py-6 text-gray-400 text-sm">
                      <div className="mb-2">Earning categories shown above</div>
                      <div className="text-xs">Add more categories as needed</div>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Deductions Section */}
            <Card>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-red-600 dark:text-red-400">Deductions Configuration</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Import from Live Preview breakdown
                    const standardDeductions = [
                      { key: 'employeePF', label: 'Employee PF', mode: settings.deductions.employeePF.mode, value: settings.deductions.employeePF.value },
                      { key: 'professionalTax', label: 'Professional Tax', mode: settings.deductions.professionalTax.mode, value: settings.deductions.professionalTax.value },
                      { key: 'esi', label: 'ESI', mode: settings.deductions.esi.mode, value: settings.deductions.esi.value },
                    ];
                    // Filter out deductions that already exist in customDeductions
                    const existingKeys = new Set((settings.customDeductions || []).map(d => d.key));
                    const newDeductions = standardDeductions.filter(d => !existingKeys.has(d.key));
                    setSettings({
                      ...settings,
                      customDeductions: [...(settings.customDeductions || []), ...newDeductions]
                    });
                    toast.success(`Imported ${newDeductions.length} deductions from Live Preview`);
                  }}
                  className="flex items-center gap-2 text-red-600 border-red-500/30 hover:bg-red-500/10"
                >
                  <Plus className="h-4 w-4" />
                  Import from Preview
                </Button>
              </div>

              {/* Deduction Categories List */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-red-600 dark:text-red-400">Deduction Categories</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addCustomDeduction}
                    className="flex items-center gap-2 text-red-600 border-red-500/30 hover:bg-red-500/10"
                  >
                    <Plus className="h-4 w-4" />
                    Add Category
                  </Button>
                </div>
                
                {/* Add New Deduction Category */}
                <div className="p-3 rounded-lg bg-gradient-to-r from-red-500/10 to-rose-500/10 border border-red-500/20 mb-3">
                  <div className="grid grid-cols-4 gap-2">
                    <Input
                      placeholder="Key (e.g., advance)"
                      value={newDeductionKey}
                      onChange={(e) => setNewDeductionKey(e.target.value)}
                      className="text-sm"
                    />
                    <Input
                      placeholder="Label (e.g., Salary Advance)"
                      value={newDeductionLabel}
                      onChange={(e) => setNewDeductionLabel(e.target.value)}
                      className="text-sm"
                    />
                    <Select
                      value={newDeductionMode}
                      onChange={(e) => setNewDeductionMode(e.target.value as PayrollMode)}
                      options={[
                        { value: 'FIXED', label: 'Fixed' },
                        { value: 'PERCENT_OF_BASIC', label: '% Basic' },
                        { value: 'PERCENT_OF_CTC', label: '% CTC' },
                        { value: 'REMAINDER', label: 'Remainder' },
                      ]}
                      className="text-sm"
                    />
                    <div className="flex gap-1">
                      <Input
                        type="number"
                        placeholder="Value"
                        value={String(newDeductionValue)}
                        onChange={(e) => setNewDeductionValue(Number(e.target.value))}
                        disabled={newDeductionMode === 'REMAINDER'}
                        className="text-sm flex-1"
                      />
                      <Button onClick={addCustomDeduction} disabled={!newDeductionKey || !newDeductionLabel} size="sm">
                        Add
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Deduction Categories List */}
                <div className="space-y-2">
                  {[
                    { key: 'employeePF', label: 'Employee PF', setting: settings.deductions.employeePF, isSpecial: true },
                    { key: 'professionalTax', label: 'Professional Tax', setting: settings.deductions.professionalTax },
                    { key: 'esi', label: 'ESI', setting: settings.deductions.esi },
                  ].map((item) => {
                    const isCustom = (settings.customDeductions || []).some(d => d.key === item.key);
                    return (
                      <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-red-600 dark:text-red-400 text-sm">{item.label}</span>
                            {item.key === 'employeePF' && settings.deductions.employeePF.capAt1800 && (
                              <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400">Capped at ₹1800</span>
                            )}
                            {item.key === 'esi' && !settings.deductions.esiEnabled && (
                              <span className="text-xs px-2 py-0.5 rounded bg-gray-500/20 text-gray-400">Disabled</span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Select
                              value={item.setting.mode}
                              onChange={(e) => {
                                if (item.isSpecial && item.key === 'employeePF') {
                                  setSettings({
                                    ...settings,
                                    deductions: {
                                      ...settings.deductions,
                                      employeePF: { ...settings.deductions.employeePF, mode: e.target.value as PayrollMode }
                                    }
                                  });
                                } else {
                                  setComponent((s) => s.deductions[item.key as keyof typeof s.deductions] as ComponentSetting, 'mode', e.target.value);
                                }
                              }}
                              options={[
                                { value: 'FIXED', label: 'Fixed' },
                                { value: 'PERCENT_OF_BASIC', label: '% Basic' },
                                { value: 'PERCENT_OF_CTC', label: '% CTC' },
                                { value: 'REMAINDER', label: 'Remainder' },
                              ]}
                              className="text-xs"
                            />
                            <Input
                              type="number"
                              value={String((item.setting as ComponentSetting).value ?? '')}
                              onChange={(e) => {
                                if (item.isSpecial && item.key === 'employeePF') {
                                  setSettings({
                                    ...settings,
                                    deductions: {
                                      ...settings.deductions,
                                      employeePF: { ...settings.deductions.employeePF, value: Number(e.target.value) }
                                    }
                                  });
                                } else {
                                  setComponent((s) => s.deductions[item.key as keyof typeof s.deductions] as ComponentSetting, 'value', Number(e.target.value));
                                }
                              }}
                              disabled={(item.setting as ComponentSetting).mode === 'REMAINDER'}
                              className="text-xs"
                              placeholder="Value"
                            />
                          </div>
                          {item.key === 'employeePF' && (
                            <div className="mt-2">
                              <label className="flex items-center gap-2 text-xs">
                                <input
                                  type="checkbox"
                                  checked={settings.deductions.employeePF.capAt1800 || false}
                                  onChange={(e) => setSettings({
                                    ...settings,
                                    deductions: {
                                      ...settings.deductions,
                                      employeePF: { ...settings.deductions.employeePF, capAt1800: e.target.checked }
                                    }
                                  })}
                                  className="rounded"
                                />
                                <span>Cap at ₹1800</span>
                              </label>
                            </div>
                          )}
                          {item.key === 'esi' && (
                            <div className="mt-2">
                              <label className="flex items-center gap-2 text-xs">
                                <input
                                  type="checkbox"
                                  checked={settings.deductions.esiEnabled || false}
                                  onChange={(e) => setSettings({
                                    ...settings,
                                    deductions: {
                                      ...settings.deductions,
                                      esiEnabled: e.target.checked
                                    }
                                  })}
                                  className="rounded"
                                />
                                <span>Enable ESI</span>
                              </label>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 ml-2">
                          <Button
                            onClick={() => {
                              // Reset to default
                              const defaults = defaultPayrollSettings.deductions[item.key as keyof typeof defaultPayrollSettings.deductions];
                              if (item.key === 'employeePF') {
                                setSettings({
                                  ...settings,
                                  deductions: {
                                    ...settings.deductions,
                                    employeePF: defaults as any
                                  }
                                });
                              } else {
                                setComponent((s) => s.deductions[item.key as keyof typeof s.deductions] as ComponentSetting, 'mode', (defaults as ComponentSetting).mode);
                                setComponent((s) => s.deductions[item.key as keyof typeof s.deductions] as ComponentSetting, 'value', (defaults as ComponentSetting).value);
                              }
                            }}
                            variant="outline"
                            size="sm"
                            title="Reset to default"
                            className="text-xs"
                          >
                            Reset
                          </Button>
                          <Button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete "${item.label}"? This will remove it from all calculations.`)) {
                                deleteDeductionCategory(item.key);
                              }
                            }}
                            className="bg-red-600 hover:bg-red-700"
                            size="sm"
                            title="Delete category"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Additional Deduction Categories */}
                  {(settings.customDeductions || [])
                    .filter(cat => !['employeePF', 'professionalTax', 'esi'].includes(cat.key))
                    .map((category) => (
                    <div key={category.key} className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-red-600 dark:text-red-400 text-sm">{category.label}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Select
                            value={category.mode}
                            onChange={(e) => {
                              const updated = (settings.customDeductions || []).map(c => 
                                c.key === category.key ? { ...c, mode: e.target.value as PayrollMode } : c
                              );
                              setSettings({ ...settings, customDeductions: updated });
                            }}
                            options={[
                              { value: 'FIXED', label: 'Fixed' },
                              { value: 'PERCENT_OF_BASIC', label: '% Basic' },
                              { value: 'PERCENT_OF_CTC', label: '% CTC' },
                              { value: 'REMAINDER', label: 'Remainder' },
                            ]}
                            className="text-xs"
                          />
                          <Input
                            type="number"
                            value={String(category.value ?? '')}
                            onChange={(e) => {
                              const updated = (settings.customDeductions || []).map(c => 
                                c.key === category.key ? { ...c, value: Number(e.target.value) } : c
                              );
                              setSettings({ ...settings, customDeductions: updated });
                            }}
                            disabled={category.mode === 'REMAINDER'}
                            className="text-xs"
                            placeholder="Value"
                          />
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete "${category.label}"? This will remove it from all calculations.`)) {
                            deleteDeductionCategory(category.key);
                          }
                        }}
                        className="bg-red-600 hover:bg-red-700 ml-2"
                        size="sm"
                        title="Delete category"
                      >
                        Delete
                      </Button>
                    </div>
                  ))}
                  {[
                    ...Object.keys(settings.deductions).filter(k => !['employeePF', 'professionalTax', 'esi', 'esiEnabled'].includes(k)),
                    ...(settings.customDeductions || []).filter(c => !['employeePF', 'professionalTax', 'esi'].includes(c.key)).map(c => c.key)
                  ].length === 0 && (
                    <div className="text-center py-6 text-gray-400 text-sm">
                      <div className="mb-2">Deduction categories shown above</div>
                      <div className="text-xs">Add more categories as needed</div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Employer PF Configuration */}
          <Card>
            <h3 className="text-xl font-semibold mb-4 text-blue-600 dark:text-blue-400">Employer PF Configuration</h3>
            <p className="text-sm text-gray-400 mb-4">
              Configure employer contribution to Provident Fund (PF). Employer PF is part of CTC and includes EPS (Employee Pension Scheme) and EPF (Employee Provident Fund).
            </p>
            
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/10">
                <label className="block text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">
                  Employer PF Percentage of Basic
                </label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    value={String(settings.employerPF.employerPFPercentOfBasic)}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      setSettings({
                        ...settings,
                        employerPF: {
                          ...settings.employerPF,
                          employerPFPercentOfBasic: value
                        }
                      });
                    }}
                    min="0"
                    max="100"
                    step="0.01"
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-400">%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Total employer PF contribution (typically 12% of basic salary)
                </p>
              </div>

              <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/10">
                <label className="block text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">
                  EPS Percentage of Basic
                </label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    value={String(settings.employerPF.epsPercentOfBasic)}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      setSettings({
                        ...settings,
                        employerPF: {
                          ...settings.employerPF,
                          epsPercentOfBasic: value
                        }
                      });
                    }}
                    min="0"
                    max="100"
                    step="0.01"
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-400">%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Employee Pension Scheme contribution (typically 8.33% of basic salary)
                </p>
              </div>

              <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/10">
                <label className="block text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">
                  EPS Cap Amount
                </label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    value={String(settings.employerPF.epsCap)}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      setSettings({
                        ...settings,
                        employerPF: {
                          ...settings.employerPF,
                          epsCap: value
                        }
                      });
                    }}
                    min="0"
                    step="1"
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-400">₹</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Maximum EPS contribution (typically ₹1,250 per month)
                </p>
              </div>

              <div className="mt-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <h4 className="text-sm font-medium text-blue-600 dark:text-blue-300 mb-2">Calculation Preview</h4>
                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  <div>
                    Employer PF Total: ₹{breakdown.employer.totalPF.toLocaleString('en-IN', { maximumFractionDigits: 2 })} 
                    <span className="text-xs text-gray-400 ml-2">
                      ({settings.employerPF.employerPFPercentOfBasic}% of Basic: ₹{breakdown.earnings.basic.toLocaleString('en-IN')})
                    </span>
                  </div>
                  <div>
                    EPS: ₹{breakdown.employer.eps.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    <span className="text-xs text-gray-400 ml-2">
                      (min of {settings.employerPF.epsPercentOfBasic}% of Basic or ₹{settings.employerPF.epsCap.toLocaleString('en-IN')})
                    </span>
                  </div>
                  <div>
                    EPF: ₹{breakdown.employer.epf.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    <span className="text-xs text-gray-400 ml-2">
                      (Total PF - EPS)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* LOP Settings */}
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
                  {(() => {
                    // Use breakdown values for dynamic calculation
                    const exampleNetPay = breakdown.totals.netPay || 50000;
                    const exampleBasic = breakdown.earnings.basic || 25000;
                    let lopAmount = 0;
                    let calculationText = '';
                    
                    switch (settings.lop.calculationMethod) {
                      case 'NET_PAY_BY_DAYS':
                        lopAmount = calculateLOPAmount(1, exampleNetPay, exampleBasic, settings);
                        calculationText = `For 1 LOP day with ₹${exampleNetPay.toLocaleString('en-IN')} net pay: ₹${lopAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
                        break;
                      case 'BASIC_BY_DAYS':
                        lopAmount = calculateLOPAmount(1, exampleNetPay, exampleBasic, settings);
                        calculationText = `For 1 LOP day with ₹${exampleBasic.toLocaleString('en-IN')} basic salary: ₹${lopAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
                        break;
                      case 'FIXED_AMOUNT':
                        // Fixed amount is 1000 per day (from calculateLOPAmount function)
                        lopAmount = calculateLOPAmount(1, exampleNetPay, exampleBasic, settings);
                        calculationText = `For 1 LOP day (fixed amount): ₹${lopAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
                        break;
                      default:
                        calculationText = `For 1 LOP day: Calculate based on selected method`;
                    }
                    return `Example: ${calculationText}`;
                  })()}
                </div>
              </div>
            </div>
          </Card>

          <div className="flex gap-3">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>Save Settings</Button>
            <Button variant="outline" onClick={restoreDefaults}>Restore Defaults</Button>
          </div>

          <Card>
            <h2 className="text-xl font-semibold mb-4">Live Preview</h2>
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
