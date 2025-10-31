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
import { Plus, Trash2 } from "lucide-react";

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

  const removeStandardEarning = (key: 'basic' | 'hra' | 'medical' | 'conveyance' | 'lta' | 'specialAllowance') => {
    const updatedSettings = {
      ...settings,
      earnings: {
        ...settings.earnings,
        [key]: { mode: 'FIXED' as PayrollMode, value: 0 }
      }
    };
    setSettings(updatedSettings);
  };

  const removeStandardDeduction = (key: 'employeePF' | 'professionalTax' | 'esi') => {
    if (key === 'employeePF') {
      const updatedSettings = {
        ...settings,
        deductions: {
          ...settings.deductions,
          employeePF: { mode: 'FIXED' as PayrollMode, value: 0, capAt1800: false }
        }
      };
      setSettings(updatedSettings);
    } else if (key === 'esi') {
      const updatedSettings = {
        ...settings,
        deductions: {
          ...settings.deductions,
          esi: { mode: 'FIXED' as PayrollMode, value: 0 },
          esiEnabled: false
        }
      };
      setSettings(updatedSettings);
    } else {
      const updatedSettings = {
        ...settings,
        deductions: {
          ...settings.deductions,
          [key]: { mode: 'FIXED' as PayrollMode, value: 0 }
        }
      };
      setSettings(updatedSettings);
    }
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
                  onClick={addCustomEarning}
                  className="flex items-center gap-2 text-green-600 border-green-500/30 hover:bg-green-500/10"
                >
                  <Plus className="h-4 w-4" />
                  Add Category
                </Button>
              </div>
              
              {/* Add New Earning Category */}
              <div className="p-3 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 mb-4">
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

              {/* All Earnings (Standard + Custom) */}
              <div className="space-y-3">
                  {/* Basic Salary */}
                  <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                    <div className="flex items-start justify-between gap-2">
                      <div className="grid grid-cols-3 gap-2 flex-1">
                        <div className="font-medium text-sm text-green-600 dark:text-green-400">Basic Salary</div>
                        <Select
                          value={settings.earnings.basic.mode}
                          onChange={(e) => setComponent((s) => s.earnings.basic, 'mode', e.target.value as PayrollMode)}
                          options={[
                            { value: 'PERCENT_OF_CTC', label: '% CTC' },
                            { value: 'PERCENT_OF_BASIC', label: '% Basic' },
                            { value: 'FIXED', label: 'Fixed' },
                          ]}
                          className="text-sm"
                        />
                        <Input
                          type="number"
                          value={settings.earnings.basic.value ? String(settings.earnings.basic.value) : ''}
                          onChange={(e) => setComponent((s) => s.earnings.basic, 'value', Number(e.target.value))}
                          disabled={settings.earnings.basic.mode === 'REMAINDER'}
                          className="text-sm"
                          placeholder="Value"
                        />
                      </div>
                      <Button
                        onClick={() => removeStandardEarning('basic')}
                        variant="outline"
                        size="sm"
                        className="bg-red-600/10 border-red-500/30 hover:bg-red-600/20 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* HRA */}
                  <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                    <div className="flex items-start justify-between gap-2">
                      <div className="grid grid-cols-3 gap-2 flex-1">
                        <div className="font-medium text-sm text-green-600 dark:text-green-400">HRA</div>
                        <Select
                          value={settings.earnings.hra.mode}
                          onChange={(e) => setComponent((s) => s.earnings.hra, 'mode', e.target.value as PayrollMode)}
                          options={[
                            { value: 'PERCENT_OF_CTC', label: '% CTC' },
                            { value: 'PERCENT_OF_BASIC', label: '% Basic' },
                            { value: 'FIXED', label: 'Fixed' },
                          ]}
                          className="text-sm"
                        />
                        <Input
                          type="number"
                          value={settings.earnings.hra.value ? String(settings.earnings.hra.value) : ''}
                          onChange={(e) => setComponent((s) => s.earnings.hra, 'value', Number(e.target.value))}
                          disabled={settings.earnings.hra.mode === 'REMAINDER'}
                          className="text-sm"
                          placeholder="Value"
                        />
                      </div>
                      <Button
                        onClick={() => removeStandardEarning('hra')}
                        variant="outline"
                        size="sm"
                        className="bg-red-600/10 border-red-500/30 hover:bg-red-600/20 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Medical */}
                  <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                    <div className="flex items-start justify-between gap-2">
                      <div className="grid grid-cols-3 gap-2 flex-1">
                        <div className="font-medium text-sm text-green-600 dark:text-green-400">Medical</div>
                        <Select
                          value={settings.earnings.medical.mode}
                          onChange={(e) => setComponent((s) => s.earnings.medical, 'mode', e.target.value as PayrollMode)}
                          options={[
                            { value: 'PERCENT_OF_CTC', label: '% CTC' },
                            { value: 'PERCENT_OF_BASIC', label: '% Basic' },
                            { value: 'FIXED', label: 'Fixed' },
                          ]}
                          className="text-sm"
                        />
                        <Input
                          type="number"
                          value={settings.earnings.medical.value ? String(settings.earnings.medical.value) : ''}
                          onChange={(e) => setComponent((s) => s.earnings.medical, 'value', Number(e.target.value))}
                          disabled={settings.earnings.medical.mode === 'REMAINDER'}
                          className="text-sm"
                          placeholder="Value"
                        />
                      </div>
                      <Button
                        onClick={() => removeStandardEarning('medical')}
                        variant="outline"
                        size="sm"
                        className="bg-red-600/10 border-red-500/30 hover:bg-red-600/20 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Conveyance */}
                  <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                    <div className="flex items-start justify-between gap-2">
                      <div className="grid grid-cols-3 gap-2 flex-1">
                        <div className="font-medium text-sm text-green-600 dark:text-green-400">Conveyance</div>
                        <Select
                          value={settings.earnings.conveyance.mode}
                          onChange={(e) => setComponent((s) => s.earnings.conveyance, 'mode', e.target.value as PayrollMode)}
                          options={[
                            { value: 'PERCENT_OF_CTC', label: '% CTC' },
                            { value: 'PERCENT_OF_BASIC', label: '% Basic' },
                            { value: 'FIXED', label: 'Fixed' },
                          ]}
                          className="text-sm"
                        />
                        <Input
                          type="number"
                          value={settings.earnings.conveyance.value ? String(settings.earnings.conveyance.value) : ''}
                          onChange={(e) => setComponent((s) => s.earnings.conveyance, 'value', Number(e.target.value))}
                          disabled={settings.earnings.conveyance.mode === 'REMAINDER'}
                          className="text-sm"
                          placeholder="Value"
                        />
                      </div>
                      <Button
                        onClick={() => removeStandardEarning('conveyance')}
                        variant="outline"
                        size="sm"
                        className="bg-red-600/10 border-red-500/30 hover:bg-red-600/20 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* LTA */}
                  <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                    <div className="flex items-start justify-between gap-2">
                      <div className="grid grid-cols-3 gap-2 flex-1">
                        <div className="font-medium text-sm text-green-600 dark:text-green-400">LTA</div>
                        <Select
                          value={settings.earnings.lta.mode}
                          onChange={(e) => setComponent((s) => s.earnings.lta, 'mode', e.target.value as PayrollMode)}
                          options={[
                            { value: 'PERCENT_OF_CTC', label: '% CTC' },
                            { value: 'PERCENT_OF_BASIC', label: '% Basic' },
                            { value: 'FIXED', label: 'Fixed' },
                          ]}
                          className="text-sm"
                        />
                        <Input
                          type="number"
                          value={settings.earnings.lta.value ? String(settings.earnings.lta.value) : ''}
                          onChange={(e) => setComponent((s) => s.earnings.lta, 'value', Number(e.target.value))}
                          disabled={settings.earnings.lta.mode === 'REMAINDER'}
                          className="text-sm"
                          placeholder="Value"
                        />
                      </div>
                      <Button
                        onClick={() => removeStandardEarning('lta')}
                        variant="outline"
                        size="sm"
                        className="bg-red-600/10 border-red-500/30 hover:bg-red-600/20 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Special Allowance */}
                  <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                    <div className="flex items-start justify-between gap-2">
                      <div className="grid grid-cols-3 gap-2 flex-1">
                        <div className="font-medium text-sm text-green-600 dark:text-green-400">Special Allowance</div>
                        <Select
                          value={settings.earnings.specialAllowance.mode}
                          onChange={(e) => setComponent((s) => s.earnings.specialAllowance, 'mode', e.target.value as PayrollMode)}
                          options={[
                            { value: 'REMAINDER', label: 'Remainder' },
                            { value: 'PERCENT_OF_CTC', label: '% CTC' },
                            { value: 'PERCENT_OF_BASIC', label: '% Basic' },
                            { value: 'FIXED', label: 'Fixed' },
                          ]}
                          className="text-sm"
                        />
                        <Input
                          type="number"
                          value={settings.earnings.specialAllowance.value ? String(settings.earnings.specialAllowance.value) : ''}
                          onChange={(e) => setComponent((s) => s.earnings.specialAllowance, 'value', Number(e.target.value))}
                          disabled={settings.earnings.specialAllowance.mode === 'REMAINDER'}
                          className="text-sm"
                          placeholder="Value"
                        />
                      </div>
                      <Button
                        onClick={() => removeStandardEarning('specialAllowance')}
                        variant="outline"
                        size="sm"
                        className="bg-red-600/10 border-red-500/30 hover:bg-red-600/20 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Custom Earnings */}
                {(settings.customEarnings || []).map((category) => (
                  <div key={category.key} className="p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                    <div className="flex items-start justify-between gap-2">
                      <div className="grid grid-cols-3 gap-2 flex-1">
                        <div className="font-medium text-sm text-green-600 dark:text-green-400">{category.label}</div>
                        <Select
                          value={category.mode}
                          onChange={(e) => {
                            const updatedSettings = {
                              ...settings,
                              earnings: {
                                ...settings.earnings,
                                [category.key]: {
                                  ...settings.earnings[category.key],
                                  mode: e.target.value as PayrollMode
                                }
                              },
                              customEarnings: (settings.customEarnings || []).map(ce => 
                                ce.key === category.key ? { ...ce, mode: e.target.value as PayrollMode } : ce
                              )
                            };
                            setSettings(updatedSettings);
                          }}
                          options={[
                            { value: 'FIXED', label: 'Fixed' },
                            { value: 'PERCENT_OF_BASIC', label: '% Basic' },
                            { value: 'PERCENT_OF_CTC', label: '% CTC' },
                          ]}
                          className="text-sm"
                        />
                        <Input
                          type="number"
                          value={category.value ? String(category.value) : ''}
                          onChange={(e) => {
                            const updatedSettings = {
                              ...settings,
                              earnings: {
                                ...settings.earnings,
                                [category.key]: {
                                  ...settings.earnings[category.key],
                                  value: Number(e.target.value)
                                }
                              },
                              customEarnings: (settings.customEarnings || []).map(ce => 
                                ce.key === category.key ? { ...ce, value: Number(e.target.value) } : ce
                              )
                            };
                            setSettings(updatedSettings);
                          }}
                          disabled={category.mode === 'REMAINDER'}
                          className="text-sm"
                          placeholder="Value"
                        />
                      </div>
                      <Button
                        onClick={() => removeCustomEarning(category.key)}
                        variant="outline"
                        size="sm"
                        className="bg-red-600/10 border-red-500/30 hover:bg-red-600/20 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Deductions Section */}
            <Card>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-red-600 dark:text-red-400">Deductions Configuration</h3>
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
              <div className="p-3 rounded-lg bg-gradient-to-r from-red-500/10 to-rose-500/10 border border-red-500/20 mb-4">
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

              {/* All Deductions (Standard + Custom) */}
              <div className="space-y-3">
                  {/* Employee PF */}
                  <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                    <div className="flex items-start justify-between gap-2">
                      <div className="grid grid-cols-3 gap-2 flex-1">
                        <div className="font-medium text-sm text-red-600 dark:text-red-400">Employee PF</div>
                        <Select
                          value={settings.deductions.employeePF.mode}
                          onChange={(e) => setSettings({
                            ...settings,
                            deductions: {
                              ...settings.deductions,
                              employeePF: {
                                ...settings.deductions.employeePF,
                                mode: e.target.value as PayrollMode
                              }
                            }
                          })}
                          options={[
                            { value: 'PERCENT_OF_BASIC', label: '% Basic' },
                            { value: 'PERCENT_OF_CTC', label: '% CTC' },
                            { value: 'FIXED', label: 'Fixed' },
                          ]}
                          className="text-sm"
                        />
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            value={settings.deductions.employeePF.value ? String(settings.deductions.employeePF.value) : ''}
                            onChange={(e) => setSettings({
                              ...settings,
                              deductions: {
                                ...settings.deductions,
                                employeePF: {
                                  ...settings.deductions.employeePF,
                                  value: Number(e.target.value)
                                }
                              }
                            })}
                            className="text-sm flex-1"
                            placeholder="Value"
                          />
                          <label className="flex items-center gap-1 text-xs text-gray-400">
                            <input
                              type="checkbox"
                              checked={settings.deductions.employeePF.capAt1800 || false}
                              onChange={(e) => setSettings({
                                ...settings,
                                deductions: {
                                  ...settings.deductions,
                                  employeePF: {
                                    ...settings.deductions.employeePF,
                                    capAt1800: e.target.checked
                                  }
                                }
                              })}
                            />
                            Cap ₹1800
                          </label>
                        </div>
                      </div>
                      <Button
                        onClick={() => removeStandardDeduction('employeePF')}
                        variant="outline"
                        size="sm"
                        className="bg-red-600/10 border-red-500/30 hover:bg-red-600/20 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Professional Tax */}
                  <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                    <div className="flex items-start justify-between gap-2">
                      <div className="grid grid-cols-3 gap-2 flex-1">
                        <div className="font-medium text-sm text-red-600 dark:text-red-400">Professional Tax</div>
                        <Select
                          value={settings.deductions.professionalTax.mode}
                          onChange={(e) => setSettings({
                            ...settings,
                            deductions: {
                              ...settings.deductions,
                              professionalTax: {
                                ...settings.deductions.professionalTax,
                                mode: e.target.value as PayrollMode
                              }
                            }
                          })}
                          options={[
                            { value: 'FIXED', label: 'Fixed' },
                            { value: 'PERCENT_OF_BASIC', label: '% Basic' },
                            { value: 'PERCENT_OF_CTC', label: '% CTC' },
                          ]}
                          className="text-sm"
                        />
                        <Input
                          type="number"
                          value={settings.deductions.professionalTax.value ? String(settings.deductions.professionalTax.value) : ''}
                          onChange={(e) => setSettings({
                            ...settings,
                            deductions: {
                              ...settings.deductions,
                              professionalTax: {
                                ...settings.deductions.professionalTax,
                                value: Number(e.target.value)
                              }
                            }
                          })}
                          className="text-sm"
                          placeholder="Value"
                        />
                      </div>
                      <Button
                        onClick={() => removeStandardDeduction('professionalTax')}
                        variant="outline"
                        size="sm"
                        className="bg-red-600/10 border-red-500/30 hover:bg-red-600/20 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* ESI */}
                  <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                    <div className="flex items-start justify-between gap-2">
                      <div className="grid grid-cols-3 gap-2 flex-1">
                        <div className="font-medium text-sm text-red-600 dark:text-red-400">ESI</div>
                        <Select
                          value={settings.deductions.esi.mode}
                          onChange={(e) => setSettings({
                            ...settings,
                            deductions: {
                              ...settings.deductions,
                              esi: {
                                ...settings.deductions.esi,
                                mode: e.target.value as PayrollMode
                              }
                            }
                          })}
                          options={[
                            { value: 'FIXED', label: 'Fixed' },
                            { value: 'PERCENT_OF_BASIC', label: '% Basic' },
                            { value: 'PERCENT_OF_CTC', label: '% CTC' },
                          ]}
                          className="text-sm"
                        />
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            value={settings.deductions.esi.value ? String(settings.deductions.esi.value) : ''}
                            onChange={(e) => setSettings({
                              ...settings,
                              deductions: {
                                ...settings.deductions,
                                esi: {
                                  ...settings.deductions.esi,
                                  value: Number(e.target.value)
                                }
                              }
                            })}
                            className="text-sm flex-1"
                            placeholder="Value"
                          />
                          <label className="flex items-center gap-1 text-xs text-gray-400">
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
                            />
                            Enabled
                          </label>
                        </div>
                      </div>
                      <Button
                        onClick={() => removeStandardDeduction('esi')}
                        variant="outline"
                        size="sm"
                        className="bg-red-600/10 border-red-500/30 hover:bg-red-600/20 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Custom Deductions */}
                {(settings.customDeductions || []).map((category) => (
                  <div key={category.key} className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                    <div className="flex items-start justify-between gap-2">
                      <div className="grid grid-cols-3 gap-2 flex-1">
                        <div className="font-medium text-sm text-red-600 dark:text-red-400">{category.label}</div>
                        <Select
                          value={category.mode}
                          onChange={(e) => {
                            const updatedSettings = {
                              ...settings,
                              deductions: {
                                ...settings.deductions,
                                [category.key]: {
                                  ...(settings.deductions[category.key] as any),
                                  mode: e.target.value as PayrollMode
                                }
                              },
                              customDeductions: (settings.customDeductions || []).map(cd => 
                                cd.key === category.key ? { ...cd, mode: e.target.value as PayrollMode } : cd
                              )
                            };
                            setSettings(updatedSettings);
                          }}
                          options={[
                            { value: 'FIXED', label: 'Fixed' },
                            { value: 'PERCENT_OF_BASIC', label: '% Basic' },
                            { value: 'PERCENT_OF_CTC', label: '% CTC' },
                          ]}
                          className="text-sm"
                        />
                        <Input
                          type="number"
                          value={category.value ? String(category.value) : ''}
                          onChange={(e) => {
                            const updatedSettings = {
                              ...settings,
                              deductions: {
                                ...settings.deductions,
                                [category.key]: {
                                  ...(settings.deductions[category.key] as any),
                                  value: Number(e.target.value)
                                }
                              },
                              customDeductions: (settings.customDeductions || []).map(cd => 
                                cd.key === category.key ? { ...cd, value: Number(e.target.value) } : cd
                              )
                            };
                            setSettings(updatedSettings);
                          }}
                          disabled={category.mode === 'REMAINDER'}
                          className="text-sm"
                          placeholder="Value"
                        />
                      </div>
                      <Button
                        onClick={() => removeCustomDeduction(category.key)}
                        variant="outline"
                        size="sm"
                        className="bg-red-600/10 border-red-500/30 hover:bg-red-600/20 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

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
                  Example: For 1 LOP day with ₹50,000 net pay: ₹{(50000 / settings.lop.defaultDaysInMonth).toLocaleString('en-IN')}
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
            
            {/* Input Controls */}
            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <Input type="number" label="Annual CTC" value={String(annualCTC)} onChange={(e) => setAnnualCTC(Number(e.target.value))} />
              <div className="flex flex-col justify-end">
                <div className="text-sm text-gray-400">Monthly CTC: {currency === 'INR' ? '₹' : '$'}{breakdown.monthlyCTC.toLocaleString('en-IN')}</div>
              </div>
              <Input type="number" label="LOP Days" value={String(lop)} onChange={(e) => setLop(Number(e.target.value))} />
              <Input type="number" label="TDS (override)" value={String(tds)} onChange={(e) => setTds(Number(e.target.value))} />
            </div>

            {/* Breakdown Display - Matching CTC Rules Structure */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Earnings Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-green-600 dark:text-green-400">Earnings</h3>
                </div>
                <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/10 space-y-2">
                  {/* Standard Earnings from breakdown */}
                  {Object.entries(breakdown.earnings).map(([k, v]) => {
                    // Find if this is a custom earning or standard
                    const isCustom = settings.customEarnings?.some(ce => ce.key === k);
                    const customEarning = settings.customEarnings?.find(ce => ce.key === k);
                    const label = customEarning?.label || k.charAt(0).toUpperCase() + k.slice(1).replace(/([A-Z])/g, ' $1').trim();
                    
                    if (v > 0) {
                      return (
                        <div key={k} className="flex justify-between text-sm">
                          <span className="text-gray-300">{label}</span>
                          <span className="text-green-400">{currency === 'INR' ? '₹' : '$'}{v.toLocaleString('en-IN')}</span>
                        </div>
                      );
                    }
                    return null;
                  })}
                  
                  {/* Custom Earnings that might not be in breakdown yet */}
                  {(settings.customEarnings || []).filter(ce => !Object.keys(breakdown.earnings).includes(ce.key)).map((category) => (
                    <div key={category.key} className="flex justify-between text-sm">
                      <span className="text-gray-300">{category.label}</span>
                      <span className="text-gray-400">{currency === 'INR' ? '₹' : '$'}0</span>
                    </div>
                  ))}
                  
                  <div className="flex justify-between text-sm border-t border-green-500/20 pt-2 mt-2">
                    <span className="font-semibold">Total Earnings</span>
                    <span className="font-semibold text-green-400">{currency === 'INR' ? '₹' : '$'}{breakdown.totals.totalEarnings.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Deductions Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">Deductions</h3>
                </div>
                <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/10 space-y-2">
                  {/* Standard Deductions */}
                  {breakdown.deductions.empPF > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Employee PF</span>
                      <span className="text-red-400">{currency === 'INR' ? '₹' : '$'}{breakdown.deductions.empPF.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {breakdown.deductions.professionalTax > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Professional Tax</span>
                      <span className="text-red-400">{currency === 'INR' ? '₹' : '$'}{breakdown.deductions.professionalTax.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {breakdown.deductions.esi > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">ESI</span>
                      <span className="text-red-400">{currency === 'INR' ? '₹' : '$'}{breakdown.deductions.esi.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {breakdown.deductions.tds > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">TDS</span>
                      <span className="text-red-400">{currency === 'INR' ? '₹' : '$'}{breakdown.deductions.tds.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  
                  {/* Custom Deductions */}
                  {(settings.customDeductions || []).map((category) => {
                    // Check if custom deduction value is in breakdown (would need payroll computation update)
                    // For now, show it as 0
                    return (
                      <div key={category.key} className="flex justify-between text-sm">
                        <span className="text-gray-300">{category.label}</span>
                        <span className="text-gray-400">{currency === 'INR' ? '₹' : '$'}0</span>
                      </div>
                    );
                  })}
                  
                  <div className="flex justify-between text-sm border-t border-red-500/20 pt-2 mt-2">
                    <span className="font-semibold">Total Deductions</span>
                    <span className="font-semibold text-red-400">{currency === 'INR' ? '₹' : '$'}{breakdown.totals.totalDeductions.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Employer PF Section */}
                <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/10 space-y-2">
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">Employer Contributions</h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Total PF</span>
                    <span className="text-blue-400">{currency === 'INR' ? '₹' : '$'}{breakdown.employer.totalPF.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">EPS</span>
                    <span className="text-blue-400">{currency === 'INR' ? '₹' : '$'}{breakdown.employer.eps.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">EPF</span>
                    <span className="text-blue-400">{currency === 'INR' ? '₹' : '$'}{breakdown.employer.epf.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Net Pay */}
                <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-primary">Net Pay</span>
                    <span className="text-lg font-bold text-indigo-400">{currency === 'INR' ? '₹' : '$'}{breakdown.totals.netPay.toLocaleString('en-IN')}</span>
                  </div>
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
