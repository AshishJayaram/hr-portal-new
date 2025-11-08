"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { getCompanySettings, updateCompanySettings, getLeaveCategories, createLeaveCategory, updateLeaveCategory, deleteLeaveCategory, getUsers, getDesignations, getDepartments } from "@/lib/api";
import { PayrollSettings, PayrollMode, defaultPayrollSettings, computePayslipFromCTC, ComponentSetting, calculateLOPAmount, calculateOvertimePay, ConditionType, CategoryCondition } from "@/lib/payroll";
import RoleGuard from "@/components/RoleGuard";
import { LeaveCategory } from "@/lib/api";
import { toast } from "sonner";
import { Plus, ChevronDown, ChevronUp, Trash2 } from "lucide-react";

function getCompanyId(): string {
  if (typeof window === 'undefined') return 'demo-company';
  // Use organizationId which is set during login, fallback to companyId for compatibility
  return localStorage.getItem('organizationId') || localStorage.getItem('companyId') || 'demo-company';
}

export default function CompanySettingsPage() {
  const [currentCompanyId, setCurrentCompanyId] = useState<string>(() => getCompanyId());
  const companyId = getCompanyId();
  
  // Autosave refs (declared early for use in companyId change detection)
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoad = useRef(true);
  const queryClient = useQueryClient();
  
  // Detect companyId changes and reset state
  useEffect(() => {
    const checkCompanyId = () => {
      const latestCompanyId = getCompanyId();
      if (latestCompanyId !== currentCompanyId) {
        const oldCompanyId = currentCompanyId;
        console.log('[Company Settings] Organization changed:', { from: oldCompanyId, to: latestCompanyId });
        setCurrentCompanyId(latestCompanyId);
        // Reset settings to default when switching organizations
        setSettings(defaultPayrollSettings);
        setCurrency('INR');
        // Reset autosave state
        isInitialLoad.current = true;
        // Clear any pending autosave
        if (autosaveTimeoutRef.current) {
          clearTimeout(autosaveTimeoutRef.current);
          autosaveTimeoutRef.current = null;
        }
        // Invalidate old company's settings cache
        if (oldCompanyId && oldCompanyId !== latestCompanyId) {
          queryClient.removeQueries({ queryKey: ["company-settings", oldCompanyId] });
          console.log('[Company Settings] Cleared cache for old organization:', oldCompanyId);
        }
      }
    };
    
    // Check immediately
    checkCompanyId();
    
    // Listen for storage changes (when companyId is updated in another tab/window)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'companyId') {
        checkCompanyId();
      }
    };
    
    // Listen for custom storage events (when companyId is updated in same window)
    const handleCustomStorageChange = () => {
      checkCompanyId();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('companyIdChanged', handleCustomStorageChange);
    
    // Check when window gains focus (user might have switched org in another tab)
    const handleFocus = () => checkCompanyId();
    window.addEventListener('focus', handleFocus);
    
    // Also check periodically (every 5 seconds) in case localStorage is changed directly
    const interval = setInterval(checkCompanyId, 5000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('companyIdChanged', handleCustomStorageChange);
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [currentCompanyId, queryClient]);
  
  const { data, isLoading } = useQuery({
    queryKey: ["company-settings", currentCompanyId],
    queryFn: () => getCompanySettings(currentCompanyId),
    enabled: !!currentCompanyId, // Only fetch if companyId is available
    staleTime: 0, // Always refetch when companyId changes
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
  const [overtimeHours, setOvertimeHours] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'payroll' | 'leaves' | 'notifications'>('payroll');

  // Custom categories state
  const [newEarningKey, setNewEarningKey] = useState('');
  const [newEarningLabel, setNewEarningLabel] = useState('');
  const [newEarningMode, setNewEarningMode] = useState<PayrollMode>('FIXED_MONTHLY');
  const [newEarningValue, setNewEarningValue] = useState(0);
  
  const [newDeductionKey, setNewDeductionKey] = useState('');
  const [newDeductionLabel, setNewDeductionLabel] = useState('');
  const [newDeductionMode, setNewDeductionMode] = useState<PayrollMode>('FIXED_MONTHLY');
  const [newDeductionValue, setNewDeductionValue] = useState(0);

  // Conditional categories state for Employer PF
  const [newConditionalEarningKey, setNewConditionalEarningKey] = useState('');
  const [newConditionalEarningLabel, setNewConditionalEarningLabel] = useState('');
  const [newConditionalEarningMode, setNewConditionalEarningMode] = useState<PayrollMode>('FIXED_MONTHLY');
  const [newConditionalEarningValue, setNewConditionalEarningValue] = useState(0);
  const [newConditionalEarningConditionType, setNewConditionalEarningConditionType] = useState<ConditionType>('CTC_RANGE');
  const [newConditionalEarningCtcMin, setNewConditionalEarningCtcMin] = useState<number | undefined>(undefined);
  const [newConditionalEarningCtcMax, setNewConditionalEarningCtcMax] = useState<number | undefined>(undefined);
  const [newConditionalEarningDepartments, setNewConditionalEarningDepartments] = useState<string[]>([]);
  const [newConditionalEarningDesignations, setNewConditionalEarningDesignations] = useState<string[]>([]);
  
  const [newConditionalDeductionKey, setNewConditionalDeductionKey] = useState('');
  const [newConditionalDeductionLabel, setNewConditionalDeductionLabel] = useState('');
  const [newConditionalDeductionMode, setNewConditionalDeductionMode] = useState<PayrollMode>('FIXED_MONTHLY');
  const [newConditionalDeductionValue, setNewConditionalDeductionValue] = useState(0);
  const [newConditionalDeductionConditionType, setNewConditionalDeductionConditionType] = useState<ConditionType>('CTC_RANGE');
  const [newConditionalDeductionCtcMin, setNewConditionalDeductionCtcMin] = useState<number | undefined>(undefined);
  const [newConditionalDeductionCtcMax, setNewConditionalDeductionCtcMax] = useState<number | undefined>(undefined);
  const [newConditionalDeductionDepartments, setNewConditionalDeductionDepartments] = useState<string[]>([]);
  const [newConditionalDeductionDesignations, setNewConditionalDeductionDesignations] = useState<string[]>([]);

  // Accordion states for Add Category sections
  const [showAddEarningCategory, setShowAddEarningCategory] = useState(false);
  const [showAddDeductionCategory, setShowAddDeductionCategory] = useState(false);
  
  // Conditional category toggle states
  const [isConditionalEarning, setIsConditionalEarning] = useState(false);
  const [isConditionalDeduction, setIsConditionalDeduction] = useState(false);

  // Fetch departments and designations from dedicated tables
  const { data: departmentsData, isLoading: departmentsLoading, error: departmentsError } = useQuery({
    queryKey: ["departments"],
    queryFn: () => getDepartments({ is_active: "true" }),
    staleTime: 300000, // Cache for 5 minutes
  });

  const { data: designationsData, isLoading: designationsLoading, error: designationsError } = useQuery({
    queryKey: ["designations"],
    queryFn: () => getDesignations({ is_active: "true" }),
    staleTime: 300000, // Cache for 5 minutes
  });

  // Extract names from the API responses
  const departments = useMemo(() => {
    if (!departmentsData?.data) return [];
    return departmentsData.data.map((d: any) => d.name).sort();
  }, [departmentsData]);

  const designations = useMemo(() => {
    if (!designationsData?.data) return [];
    return designationsData.data.map((d: any) => d.name).sort();
  }, [designationsData]);

  // Debug logging
  useEffect(() => {
    console.log('Designations Debug:', {
      designationsData,
      designations,
      designationsLoading,
      designationsError,
      count: designations.length,
      rawNames: designations,
      rawDataArray: designationsData?.data,
    });
    
    // Also check localStorage for organization ID
    if (typeof window !== 'undefined') {
      const orgId = localStorage.getItem('organizationId');
      const token = localStorage.getItem('token');
      console.log('Organization Debug:', {
        organizationId: orgId,
        token: token ? 'present' : 'missing',
        user: localStorage.getItem('user'),
      });
    }
  }, [designationsData, designations, designationsLoading, designationsError]);

  useEffect(() => {
    // Reset settings when companyId changes
    if (!data?.data) {
      setSettings(defaultPayrollSettings);
      return;
    }
    
    if (data?.data) {
      const settingsData = data.data;
      // Initialize fields if not present (migration from old format)
      if (!settingsData.employerPF?.fields && settingsData.employerPF) {
        const fields = [];
        if (settingsData.employerPF.employerPFPercentOfBasic !== undefined) {
          fields.push({
            id: 'employer_pf_percent',
            label: 'Employer PF Percentage of Basic',
            value: settingsData.employerPF.employerPFPercentOfBasic,
            type: 'PERCENTAGE' as const,
          });
        }
        if (settingsData.employerPF.epsPercentOfBasic !== undefined) {
          fields.push({
            id: 'eps_percent',
            label: 'EPS Percentage of Basic',
            value: settingsData.employerPF.epsPercentOfBasic,
            type: 'PERCENTAGE' as const,
          });
        }
        if (settingsData.employerPF.epsCap !== undefined) {
          fields.push({
            id: 'eps_cap',
            label: 'EPS Cap Amount',
            value: settingsData.employerPF.epsCap,
            type: 'FIXED_AMOUNT' as const,
          });
        }
        if (fields.length > 0) {
          settingsData.employerPF.fields = fields;
        }
      }
      // Ensure Employee PF default deduction exists at all times
      const normalized: PayrollSettings = {
        ...settingsData,
        deductions: {
          ...settingsData.deductions,
          employeePF: settingsData.deductions?.employeePF ?? defaultPayrollSettings.deductions.employeePF,
          // Force ESI enabled by default and remove UI toggle
          esiEnabled: true,
        },
      };
      // Ensure notifications defaults with template placeholders as default values
      (normalized as any).notifications = (normalized as any).notifications || {};
      const prevNotif = JSON.stringify((normalized as any).notifications);
      // Birthday defaults (no advance or lookahead)
      (normalized as any).notifications.birthday = (normalized as any).notifications.birthday || {};
      (normalized as any).notifications.birthday.enabled = (normalized as any).notifications.birthday.enabled ?? true;
      (normalized as any).notifications.birthday.allowEmployeesSeeAll =
        (normalized as any).notifications.birthday.allowEmployeesSeeAll ?? false;
      (normalized as any).notifications.birthday.templates = (normalized as any).notifications.birthday.templates || {};
      // Remove per-recipient 'today' template defaults; rely on employee/admin templates instead
      // Align birthday templates with work-anniversary (employee + admin today + admin monthly)
      ;(normalized as any).notifications.birthday.templates.employee_subject =
        (normalized as any).notifications.birthday.templates.employee_subject ?? "Happy Birthday, {{employee_name}}! 🎂";
      ;(normalized as any).notifications.birthday.templates.employee_body =
        (normalized as any).notifications.birthday.templates.employee_body ?? "Dear {{employee_name}},\n\nWishing you a very Happy Birthday from all of us at {{organization_name}}! 🎉\n\nHave a wonderful day and a fantastic year ahead.\n\nWarm regards,\n{{organization_name}}";
      ;(normalized as any).notifications.birthday.templates.admin_today_subject =
        (normalized as any).notifications.birthday.templates.admin_today_subject ?? "Today's Birthdays - {{date}}";
      ;(normalized as any).notifications.birthday.templates.admin_today_body =
        (normalized as any).notifications.birthday.templates.admin_today_body ?? "Hello Team,\n\nHere are today's birthdays at {{organization_name}}:\n\n{{list}}\n\nPlease take a moment to send your wishes.\n\nRegards,\nHR Portal System";
      ;(normalized as any).notifications.birthday.templates.admin_monthly_subject =
        (normalized as any).notifications.birthday.templates.admin_monthly_subject ?? "Birthdays — {{month}} {{year}}";
      ;(normalized as any).notifications.birthday.templates.admin_monthly_body =
        (normalized as any).notifications.birthday.templates.admin_monthly_body ?? "Hello Team,\n\nHere are the birthdays for {{month}} {{year}} at {{organization_name}}:\n\n{{list}}\n\nRegards,\nHR Portal System";
      // Anniversary defaults
      (normalized as any).notifications.anniversary = (normalized as any).notifications.anniversary || {};
      (normalized as any).notifications.anniversary.templates = (normalized as any).notifications.anniversary.templates || {};
      (normalized as any).notifications.anniversary.templates.employee_subject =
        (normalized as any).notifications.anniversary.templates.employee_subject ?? "Happy Work Anniversary, {{employee_name}}! 🎉";
      (normalized as any).notifications.anniversary.templates.employee_body =
        (normalized as any).notifications.anniversary.templates.employee_body ?? "Dear {{employee_name}},\n\nCongratulations on your {{years}}-year work anniversary with {{organization_name}}!\n\nWarm regards,\n{{organization_name}}";
      (normalized as any).notifications.anniversary.templates.admin_today_subject =
        (normalized as any).notifications.anniversary.templates.admin_today_subject ?? "Today's Work Anniversaries - {{date}}";
      (normalized as any).notifications.anniversary.templates.admin_today_body =
        (normalized as any).notifications.anniversary.templates.admin_today_body ?? "Hello Team,\n\nHere are today's work anniversaries at {{organization_name}}:\n\n{{list}}\n\nRegards,\nHR Portal System";
      (normalized as any).notifications.anniversary.templates.admin_monthly_subject =
        (normalized as any).notifications.anniversary.templates.admin_monthly_subject ?? "Work Anniversaries — {{month}} {{year}}";
      (normalized as any).notifications.anniversary.templates.admin_monthly_body =
        (normalized as any).notifications.anniversary.templates.admin_monthly_body ?? "Hello Team,\n\nHere are the work anniversaries for {{month}} {{year}} at {{organization_name}}:\n\n{{list}}\n\nRegards,\nHR Portal System";
      const nextNotif = JSON.stringify((normalized as any).notifications);
      const injectedDefaults = prevNotif !== nextNotif;
      setSettings(normalized);
      if (injectedDefaults) {
        // Persist defaults immediately for this organization only
        setTimeout(() => {
          updateCompanySettings(currentCompanyId, normalized, (data?.data as any)?.currency).catch(() => {});
        }, 0);
      }
      // Extract currency from company settings if available
      const incomingCurrency = (data?.data as any)?.currency;
      if (incomingCurrency) setCurrency(incomingCurrency);
    }
  }, [data, currentCompanyId]);

  const saveMutation = useMutation({
    mutationFn: () => updateCompanySettings(currentCompanyId, settings, currency),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-settings", currentCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      // Log change to console (backend already logs to audit)
      console.log("[Settings] Auto-saved payroll settings for company:", currentCompanyId, new Date().toISOString());
    },
    onError: (error: any) => {
      console.error("[Settings] Failed to auto-save:", error);
    },
  });

  // Autosave with debouncing
  useEffect(() => {
    // Skip autosave on initial load
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }

    // Clear existing timeout
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    // Set new timeout for autosave (1 second debounce)
    autosaveTimeoutRef.current = setTimeout(() => {
      saveMutation.mutate();
    }, 1000);

    // Cleanup on unmount
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [settings, currency]);

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

  const breakdown = useMemo(() => computePayslipFromCTC(annualCTC, settings, { lopDays: lop, tdsOverride: tds, overtimeHours }), [annualCTC, settings, lop, tds, overtimeHours]);

  // Helper function to format condition display text
  const formatConditionText = (category: any): string => {
    // Backward compatibility: if old format with ctcThreshold, convert it
    if ('ctcThreshold' in category && !('condition' in category)) {
      return `CTC ≥ ₹${(category.ctcThreshold as number).toLocaleString('en-IN')}`;
    }
    
    const condition = category.condition as CategoryCondition;
    if (!condition) return 'No condition';
    
    switch (condition.type) {
      case 'CTC_RANGE':
        if (condition.ctcMin !== undefined && condition.ctcMax !== undefined) {
          return `CTC: ₹${condition.ctcMin.toLocaleString('en-IN')} - ₹${condition.ctcMax.toLocaleString('en-IN')}`;
        } else if (condition.ctcMin !== undefined) {
          return `CTC ≥ ₹${condition.ctcMin.toLocaleString('en-IN')}`;
        } else if (condition.ctcMax !== undefined) {
          return `CTC ≤ ₹${condition.ctcMax.toLocaleString('en-IN')}`;
        }
        return 'CTC Range (any)';
      case 'DEPARTMENT':
        return `Dept: ${condition.departments?.join(', ') || 'None'}`;
      case 'DESIGNATION':
        // Support both old format (single designation) and new format (array)
        if (condition.designation) {
          // Backward compatibility: old DESIGNATION_SPECIFIC format
          return `Designation: ${condition.designation}`;
        }
        return `Designation: ${condition.designations?.join(', ') || 'None'}`;
      default:
        return 'Unknown condition';
    }
  };

  // Helper function to check if condition is active for current employee
  const isConditionActive = (category: any, employeeCTC: number, employeeDept?: string, employeeDesignation?: string): boolean => {
    // Backward compatibility: if old format with ctcThreshold
    if ('ctcThreshold' in category && !('condition' in category)) {
      return employeeCTC >= (category.ctcThreshold as number);
    }
    
    const condition = category.condition as CategoryCondition;
    if (!condition) return false;
    
    switch (condition.type) {
      case 'CTC_RANGE':
        if (condition.ctcMin !== undefined && employeeCTC < condition.ctcMin) return false;
        if (condition.ctcMax !== undefined && employeeCTC > condition.ctcMax) return false;
        return true;
      case 'DEPARTMENT':
        return condition.departments?.includes(employeeDept || '') || false;
      case 'DESIGNATION':
        // Support both old format (single designation) and new format (array of designations)
        if (condition.designation) {
          // Backward compatibility: old DESIGNATION_SPECIFIC format
          return condition.designation === employeeDesignation;
        }
        return condition.designations?.includes(employeeDesignation || '') || false;
      default:
        return false;
    }
  };

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
      <Card className="p-4">
        <div className="flex space-x-1 bg-white/5 dark:bg-white/10 p-1 rounded-lg border border-card dark:border-white/10">
          <button
            onClick={() => setActiveTab('payroll')}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
              activeTab === 'payroll'
                ? 'bg-indigo-500 text-white shadow-md'
                : 'text-secondary dark:text-gray-300 hover:text-primary dark:hover:text-white hover:bg-white/10 dark:hover:bg-white/20'
            }`}
          >
            CTC Rules & Breakdown
          </button>
          <button
            onClick={() => setActiveTab('leaves')}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
              activeTab === 'leaves'
                ? 'bg-indigo-500 text-white shadow-md'
                : 'text-secondary dark:text-gray-300 hover:text-primary dark:hover:text-white hover:bg-white/10 dark:hover:bg-white/20'
            }`}
          >
            Leave Categories
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
              activeTab === 'notifications'
                ? 'bg-indigo-500 text-white shadow-md'
                : 'text-secondary dark:text-gray-300 hover:text-primary dark:hover:text-white hover:bg-white/10 dark:hover:bg-white/20'
            }`}
          >
            Notifications
          </button>
        </div>
      </Card>

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
              </div>

              {/* Earning Categories List */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-green-600 dark:text-green-400">Earning Categories</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newState = !showAddEarningCategory;
                      setShowAddEarningCategory(newState);
                      if (!newState) {
                        // Reset form when closing
                        setIsConditionalEarning(false);
                        setNewEarningKey('');
                        setNewEarningLabel('');
                        setNewEarningMode('FIXED_MONTHLY');
                        setNewEarningValue(0);
                        setNewConditionalEarningKey('');
                        setNewConditionalEarningLabel('');
                        setNewConditionalEarningMode('FIXED_MONTHLY');
                        setNewConditionalEarningValue(0);
                        setNewConditionalEarningConditionType('CTC_RANGE');
                        setNewConditionalEarningCtcMin(undefined);
                        setNewConditionalEarningCtcMax(undefined);
                      }
                    }}
                    className="flex items-center gap-2 text-green-600 border-green-500/30 hover:bg-green-500/10"
                  >
                    <Plus className="h-4 w-4" />
                    Add Category
                    {showAddEarningCategory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
                
                {/* Add New Earning Category - Accordion */}
                {showAddEarningCategory && (
                  <div className="p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 mb-3 space-y-3">
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        type="checkbox"
                        id="conditionalEarning"
                        checked={isConditionalEarning}
                        onChange={(e) => {
                          setIsConditionalEarning(e.target.checked);
                          if (!e.target.checked) {
                            setNewConditionalEarningConditionType('CTC_RANGE');
                        setNewConditionalEarningCtcMin(undefined);
                        setNewConditionalEarningCtcMax(undefined);
                          }
                        }}
                        className="rounded"
                      />
                      <label htmlFor="conditionalEarning" className="text-sm font-medium text-green-600 dark:text-green-400 cursor-pointer">
                        Apply only when employee CTC meets threshold (Conditional Category)
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">
                          Category Key <span className="text-red-400">*</span>
                        </label>
                        <Input
                          placeholder="e.g., bonus, allowance"
                          value={isConditionalEarning ? newConditionalEarningKey : newEarningKey}
                          onChange={(e) => {
                            if (isConditionalEarning) {
                              setNewConditionalEarningKey(e.target.value);
                            } else {
                              setNewEarningKey(e.target.value);
                            }
                          }}
                          className="text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">Unique identifier (lowercase, no spaces)</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">
                          Category Label <span className="text-red-400">*</span>
                        </label>
                        <Input
                          placeholder="e.g., Performance Bonus, Tax Benefits"
                          value={isConditionalEarning ? newConditionalEarningLabel : newEarningLabel}
                          onChange={(e) => {
                            if (isConditionalEarning) {
                              setNewConditionalEarningLabel(e.target.value);
                            } else {
                              setNewEarningLabel(e.target.value);
                            }
                          }}
                          className="text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">Display name shown in payslips</p>
                      </div>
                    </div>
                    {isConditionalEarning && (
                      <div className="space-y-4 p-4 bg-white/5 border border-white/10 rounded-lg">
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">
                            Condition Type <span className="text-red-400">*</span>
                          </label>
                          <Select
                            value={newConditionalEarningConditionType}
                            onChange={(e) => {
                              setNewConditionalEarningConditionType(e.target.value as ConditionType);
                              // Reset condition-specific fields when changing type
                              setNewConditionalEarningCtcMin(undefined);
                              setNewConditionalEarningCtcMax(undefined);
                              setNewConditionalEarningDepartments([]);
                              setNewConditionalEarningDesignations([]);
                            }}
                            options={[
                              { value: 'CTC_RANGE', label: 'CTC Range (Min/Max)' },
                              { value: 'DEPARTMENT', label: 'Department' },
                              { value: 'DESIGNATION', label: 'Designation' },
                            ]}
                            className="text-sm"
                          />
                        </div>

                        {newConditionalEarningConditionType === 'CTC_RANGE' && (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-400 mb-1">
                                CTC Min (≥) (₹)
                              </label>
                              <Input
                                type="number"
                                placeholder="e.g., 500000"
                                value={newConditionalEarningCtcMin !== undefined ? String(newConditionalEarningCtcMin) : ''}
                                onChange={(e) => {
                                  const value = e.target.value === '' ? undefined : Number(e.target.value);
                                  if (value !== undefined && value < 0) return;
                                  setNewConditionalEarningCtcMin(value);
                                }}
                                className="text-sm"
                                min="0"
                                step="1000"
                              />
                              <p className="text-xs text-gray-500 mt-1">Minimum CTC (leave empty for no minimum)</p>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-400 mb-1">
                                CTC Max (≤) (₹)
                              </label>
                              <Input
                                type="number"
                                placeholder="e.g., 10000000"
                                value={newConditionalEarningCtcMax !== undefined ? String(newConditionalEarningCtcMax) : ''}
                                onChange={(e) => {
                                  const value = e.target.value === '' ? undefined : Number(e.target.value);
                                  if (value !== undefined && value < 0) return;
                                  setNewConditionalEarningCtcMax(value);
                                }}
                                className="text-sm"
                                min="0"
                                step="1000"
                              />
                              <p className="text-xs text-gray-500 mt-1">Maximum CTC (leave empty for no maximum)</p>
                            </div>
                          </div>
                        )}

                        {newConditionalEarningConditionType === 'DEPARTMENT' && (
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">
                              Departments <span className="text-red-400">*</span>
                            </label>
                            <DepartmentSearchInput
                              departments={departments}
                              selected={newConditionalEarningDepartments}
                              onSelectionChange={setNewConditionalEarningDepartments}
                              isLoading={departmentsLoading}
                              error={departmentsError as Error | null}
                            />
                            <p className="text-xs text-gray-500 mt-1">Select one or more departments. Category will apply to employees with any of the selected departments.</p>
                          </div>
                        )}

                        {newConditionalEarningConditionType === 'DESIGNATION' && (
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">
                              Designations <span className="text-red-400">*</span>
                            </label>
                            <DesignationSearchInput
                              designations={designations}
                              selected={newConditionalEarningDesignations}
                              onSelectionChange={setNewConditionalEarningDesignations}
                              isLoading={designationsLoading}
                              error={designationsError as Error | null}
                            />
                            <p className="text-xs text-gray-500 mt-1">Select one or more designations. Category will apply to employees with any of the selected designations.</p>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">
                          Calculation Mode <span className="text-red-400">*</span>
                        </label>
                        <Select
                          value={isConditionalEarning ? newConditionalEarningMode : newEarningMode}
                          onChange={(e) => {
                            if (isConditionalEarning) {
                              setNewConditionalEarningMode(e.target.value as PayrollMode);
                            } else {
                              setNewEarningMode(e.target.value as PayrollMode);
                            }
                          }}
                          options={[
                            { value: 'FIXED_MONTHLY', label: 'Fixed (Monthly)' },
                            { value: 'FIXED_YEARLY', label: 'Fixed (Yearly)' },
                            { value: 'PERCENT_OF_BASIC', label: '% of Basic' },
                            { value: 'PERCENT_OF_CTC', label: '% of CTC' },
                            { value: 'REMAINDER', label: 'Remainder' },
                          ]}
                          className="text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {(() => {
                            const mode = isConditionalEarning ? newConditionalEarningMode : newEarningMode;
                            if (mode === 'FIXED_MONTHLY' || mode === 'FIXED') return 'Fixed monthly amount in ₹';
                            if (mode === 'FIXED_YEARLY') return 'Fixed yearly amount in ₹ (divided by 12 for monthly)';
                            if (mode === 'PERCENT_OF_BASIC') return '% of employee\'s Basic Salary';
                            if (mode === 'PERCENT_OF_CTC') return '% of employee\'s Annual CTC (divided by 12 for monthly)';
                            return 'Automatically calculated as remaining amount after all other earnings';
                          })()}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">
                          Value <span className="text-red-400">*</span>
                        </label>
                        <Input
                          type="number"
                          placeholder={isConditionalEarning ? newConditionalEarningMode === 'PERCENT_OF_BASIC' || newConditionalEarningMode === 'PERCENT_OF_CTC' ? 'e.g., 10 (for 10%)' : 'e.g., 5000' : newEarningMode === 'PERCENT_OF_BASIC' || newEarningMode === 'PERCENT_OF_CTC' ? 'e.g., 10 (for 10%)' : 'e.g., 5000'}
                          value={String(isConditionalEarning ? newConditionalEarningValue : newEarningValue)}
                          onChange={(e) => {
                            if (isConditionalEarning) {
                              setNewConditionalEarningValue(Number(e.target.value));
                            } else {
                              setNewEarningValue(Number(e.target.value));
                            }
                          }}
                          disabled={(isConditionalEarning ? newConditionalEarningMode : newEarningMode) === 'REMAINDER'}
                          className="text-sm"
                          min="0"
                          step={(isConditionalEarning ? newConditionalEarningMode : newEarningMode) === 'FIXED_MONTHLY' || (isConditionalEarning ? newConditionalEarningMode : newEarningMode) === 'FIXED_YEARLY' || (isConditionalEarning ? newConditionalEarningMode : newEarningMode) === 'FIXED' ? '1' : '0.01'}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {(isConditionalEarning ? newConditionalEarningMode : newEarningMode) === 'REMAINDER' 
                            ? 'Disabled for Remainder mode' 
                            : (isConditionalEarning ? newConditionalEarningMode : newEarningMode) === 'FIXED_MONTHLY' || (isConditionalEarning ? newConditionalEarningMode : newEarningMode) === 'FIXED'
                              ? 'Fixed amount in ₹ per month' 
                              : (isConditionalEarning ? newConditionalEarningMode : newEarningMode) === 'FIXED_YEARLY'
                                ? 'Fixed amount in ₹ per year (will be divided by 12 for monthly calculation)'
                                : 'Percentage value (e.g., 10 for 10%)'}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button 
                        onClick={() => {
                          if (isConditionalEarning) {
                            if (!newConditionalEarningKey || !newConditionalEarningLabel) return;
                            
                            // Build condition based on condition type
                            let condition: CategoryCondition = {
                              type: newConditionalEarningConditionType,
                            };
                            
                            if (newConditionalEarningConditionType === 'CTC_RANGE') {
                              // Validate CTC range - at least one bound must be set
                              if (newConditionalEarningCtcMin === undefined && newConditionalEarningCtcMax === undefined) {
                                toast.error("Please set at least a minimum or maximum CTC threshold");
                                return;
                              }
                              condition.ctcMin = newConditionalEarningCtcMin;
                              condition.ctcMax = newConditionalEarningCtcMax;
                            } else if (newConditionalEarningConditionType === 'DEPARTMENT') {
                              if (newConditionalEarningDepartments.length === 0) {
                                toast.error("Please select at least one department");
                                return;
                              }
                              condition.departments = newConditionalEarningDepartments;
                            } else if (newConditionalEarningConditionType === 'DESIGNATION') {
                              if (newConditionalEarningDesignations.length === 0) {
                                toast.error("Please select at least one designation");
                                return;
                              }
                              condition.designations = newConditionalEarningDesignations;
                            }
                            
                            const newCategory = {
                              key: newConditionalEarningKey,
                              label: newConditionalEarningLabel,
                              condition,
                              mode: newConditionalEarningMode,
                              value: newConditionalEarningMode !== 'REMAINDER' ? newConditionalEarningValue : undefined
                            };
                            setSettings({
                              ...settings,
                              employerPF: {
                                ...settings.employerPF,
                                conditionalEarnings: [
                                  ...(settings.employerPF.conditionalEarnings || []),
                                  newCategory
                                ]
                              }
                            });
                            // Reset all form fields
                            setNewConditionalEarningKey('');
                            setNewConditionalEarningLabel('');
                            setNewConditionalEarningMode('FIXED_MONTHLY');
                            setNewConditionalEarningValue(0);
                            setNewConditionalEarningConditionType('CTC_RANGE');
                            setNewConditionalEarningCtcMin(undefined);
                            setNewConditionalEarningCtcMax(undefined);
                            setNewConditionalEarningDepartments([]);
                            setNewConditionalEarningDesignations([]);
                            setIsConditionalEarning(false);
                          } else {
                            addCustomEarning();
                          }
                          setShowAddEarningCategory(false);
                        }} 
                        disabled={
                          isConditionalEarning 
                            ? (!newConditionalEarningKey || !newConditionalEarningLabel || (
                              (newConditionalEarningConditionType === 'CTC_RANGE' && newConditionalEarningCtcMin === undefined && newConditionalEarningCtcMax === undefined) ||
                              (newConditionalEarningConditionType === 'DEPARTMENT' && newConditionalEarningDepartments.length === 0) ||
                              (newConditionalEarningConditionType === 'DESIGNATION' && newConditionalEarningDesignations.length === 0)
                            ))
                            : (!newEarningKey || !newEarningLabel)
                        } 
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Add Category
                      </Button>
                    </div>
                  </div>
                )}

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
                    if (!item.setting) return null; // Skip if deleted/missing
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
                                { value: 'FIXED_MONTHLY', label: 'Fixed (Monthly)' },
                                { value: 'FIXED_YEARLY', label: 'Fixed (Yearly)' },
                                { value: 'PERCENT_OF_BASIC', label: '% of Basic' },
                                { value: 'PERCENT_OF_CTC', label: '% of CTC' },
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
                              { value: 'FIXED_MONTHLY', label: 'Fixed (Monthly)' },
                              { value: 'FIXED_YEARLY', label: 'Fixed (Yearly)' },
                              { value: 'PERCENT_OF_BASIC', label: '% of Basic' },
                              { value: 'PERCENT_OF_CTC', label: '% of CTC' },
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

              {/* Conditional Earning Categories List */}
              {(settings.employerPF.conditionalEarnings || []).length > 0 && (
                <div className="mt-6 p-4 rounded-lg bg-green-500/5 border border-green-500/10">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-semibold text-green-600 dark:text-green-400">Conditional Earning Categories</h4>
                      <p className="text-xs text-gray-400 mt-1">Categories that apply only when employee's CTC meets the threshold</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {(settings.employerPF.conditionalEarnings || []).map((category) => (
                      <div key={category.key} className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-green-600 dark:text-green-400 text-sm">{category.label}</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                              {formatConditionText(category)}
                            </span>
                            {!isConditionActive(category, annualCTC) && (
                              <span className="text-xs px-2 py-0.5 rounded bg-gray-500/20 text-gray-400">
                                Inactive
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Select
                              value={category.mode}
                              onChange={(e) => {
                                const updated = (settings.employerPF.conditionalEarnings || []).map(c =>
                                  c.key === category.key ? { ...c, mode: e.target.value as PayrollMode } : c
                                );
                                setSettings({
                                  ...settings,
                                  employerPF: { ...settings.employerPF, conditionalEarnings: updated }
                                });
                              }}
                              options={[
                                { value: 'FIXED_MONTHLY', label: 'Fixed (Monthly)' },
                                { value: 'FIXED_YEARLY', label: 'Fixed (Yearly)' },
                                { value: 'PERCENT_OF_BASIC', label: '% of Basic' },
                                { value: 'PERCENT_OF_CTC', label: '% of CTC' },
                                { value: 'REMAINDER', label: 'Remainder' },
                              ]}
                              className="text-xs"
                            />
                            <Input
                              type="number"
                              value={String(category.value ?? '')}
                              onChange={(e) => {
                                const updated = (settings.employerPF.conditionalEarnings || []).map(c =>
                                  c.key === category.key ? { ...c, value: Number(e.target.value) } : c
                                );
                                setSettings({
                                  ...settings,
                                  employerPF: { ...settings.employerPF, conditionalEarnings: updated }
                                });
                              }}
                              disabled={category.mode === 'REMAINDER'}
                              className="text-xs"
                              placeholder="Value"
                            />
                          </div>
                        </div>
                        <Button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete "${category.label}"?`)) {
                              setSettings({
                                ...settings,
                                employerPF: {
                                  ...settings.employerPF,
                                  conditionalEarnings: (settings.employerPF.conditionalEarnings || []).filter(c => c.key !== category.key)
                                }
                              });
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
                  </div>
                </div>
              )}
            </Card>

            {/* Deductions Section */}
            <Card>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-red-600 dark:text-red-400">Deductions Configuration</h3>
              </div>

              {/* Deduction Categories List */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-red-600 dark:text-red-400">Deduction Categories</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newState = !showAddDeductionCategory;
                      setShowAddDeductionCategory(newState);
                      if (!newState) {
                        // Reset form when closing
                        setIsConditionalDeduction(false);
                        setNewDeductionKey('');
                        setNewDeductionLabel('');
                        setNewDeductionMode('FIXED_MONTHLY');
                        setNewDeductionValue(0);
                        setNewConditionalDeductionKey('');
                        setNewConditionalDeductionLabel('');
                        setNewConditionalDeductionMode('FIXED_MONTHLY');
                        setNewConditionalDeductionValue(0);
                        setNewConditionalDeductionConditionType('CTC_RANGE');
                        setNewConditionalDeductionCtcMin(undefined);
                        setNewConditionalDeductionCtcMax(undefined);
                      }
                    }}
                    className="flex items-center gap-2 text-red-600 border-red-500/30 hover:bg-red-500/10"
                  >
                    <Plus className="h-4 w-4" />
                    Add Category
                    {showAddDeductionCategory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
                
                {/* Add New Deduction Category - Accordion */}
                {showAddDeductionCategory && (
                  <div className="p-4 rounded-lg bg-gradient-to-r from-red-500/10 to-rose-500/10 border border-red-500/20 mb-3 space-y-3">
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        type="checkbox"
                        id="conditionalDeduction"
                        checked={isConditionalDeduction}
                        onChange={(e) => {
                          setIsConditionalDeduction(e.target.checked);
                          if (!e.target.checked) {
                            setNewConditionalDeductionConditionType('CTC_RANGE');
                        setNewConditionalDeductionCtcMin(undefined);
                        setNewConditionalDeductionCtcMax(undefined);
                          }
                        }}
                        className="rounded"
                      />
                      <label htmlFor="conditionalDeduction" className="text-sm font-medium text-red-600 dark:text-red-400 cursor-pointer">
                        Apply only when employee CTC meets threshold (Conditional Category)
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">
                          Category Key <span className="text-red-400">*</span>
                        </label>
                        <Input
                          placeholder="e.g., advance, tax"
                          value={isConditionalDeduction ? newConditionalDeductionKey : newDeductionKey}
                          onChange={(e) => {
                            if (isConditionalDeduction) {
                              setNewConditionalDeductionKey(e.target.value);
                            } else {
                              setNewDeductionKey(e.target.value);
                            }
                          }}
                          className="text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">Unique identifier (lowercase, no spaces)</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">
                          Category Label <span className="text-red-400">*</span>
                        </label>
                        <Input
                          placeholder="e.g., Salary Advance, Higher TDS"
                          value={isConditionalDeduction ? newConditionalDeductionLabel : newDeductionLabel}
                          onChange={(e) => {
                            if (isConditionalDeduction) {
                              setNewConditionalDeductionLabel(e.target.value);
                            } else {
                              setNewDeductionLabel(e.target.value);
                            }
                          }}
                          className="text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">Display name shown in payslips</p>
                      </div>
                    </div>
                    {isConditionalDeduction && (
                      <div className="space-y-4 p-4 bg-white/5 border border-white/10 rounded-lg">
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">
                            Condition Type <span className="text-red-400">*</span>
                          </label>
                          <Select
                            value={newConditionalDeductionConditionType}
                            onChange={(e) => {
                              setNewConditionalDeductionConditionType(e.target.value as ConditionType);
                              // Reset condition-specific fields when changing type
                              setNewConditionalDeductionCtcMin(undefined);
                              setNewConditionalDeductionCtcMax(undefined);
                              setNewConditionalDeductionDepartments([]);
                              setNewConditionalDeductionDesignations([]);
                            }}
                            options={[
                              { value: 'CTC_RANGE', label: 'CTC Range (Min/Max)' },
                              { value: 'DEPARTMENT', label: 'Department' },
                              { value: 'DESIGNATION', label: 'Designation' },
                            ]}
                            className="text-sm"
                          />
                        </div>

                        {newConditionalDeductionConditionType === 'CTC_RANGE' && (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-400 mb-1">
                                CTC Min (≥) (₹)
                              </label>
                              <Input
                                type="number"
                                placeholder="e.g., 500000"
                                value={newConditionalDeductionCtcMin !== undefined ? String(newConditionalDeductionCtcMin) : ''}
                                onChange={(e) => {
                                  const value = e.target.value === '' ? undefined : Number(e.target.value);
                                  if (value !== undefined && value < 0) return;
                                  setNewConditionalDeductionCtcMin(value);
                                }}
                                className="text-sm"
                                min="0"
                                step="1000"
                              />
                              <p className="text-xs text-gray-500 mt-1">Minimum CTC (leave empty for no minimum)</p>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-400 mb-1">
                                CTC Max (≤) (₹)
                              </label>
                              <Input
                                type="number"
                                placeholder="e.g., 10000000"
                                value={newConditionalDeductionCtcMax !== undefined ? String(newConditionalDeductionCtcMax) : ''}
                                onChange={(e) => {
                                  const value = e.target.value === '' ? undefined : Number(e.target.value);
                                  if (value !== undefined && value < 0) return;
                                  setNewConditionalDeductionCtcMax(value);
                                }}
                                className="text-sm"
                                min="0"
                                step="1000"
                              />
                              <p className="text-xs text-gray-500 mt-1">Maximum CTC (leave empty for no maximum)</p>
                            </div>
                          </div>
                        )}

                        {newConditionalDeductionConditionType === 'DEPARTMENT' && (
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">
                              Departments <span className="text-red-400">*</span>
                            </label>
                            <DepartmentSearchInput
                              departments={departments}
                              selected={newConditionalDeductionDepartments}
                              onSelectionChange={setNewConditionalDeductionDepartments}
                              isLoading={departmentsLoading}
                              error={departmentsError as Error | null}
                            />
                            <p className="text-xs text-gray-500 mt-1">Select one or more departments. Category will apply to employees with any of the selected departments.</p>
                          </div>
                        )}

                        {newConditionalDeductionConditionType === 'DESIGNATION' && (
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">
                              Designations <span className="text-red-400">*</span>
                            </label>
                            <DesignationSearchInput
                              designations={designations}
                              selected={newConditionalDeductionDesignations}
                              onSelectionChange={setNewConditionalDeductionDesignations}
                              isLoading={designationsLoading}
                              error={designationsError as Error | null}
                            />
                            <p className="text-xs text-gray-500 mt-1">Select one or more designations. Category will apply to employees with any of the selected designations.</p>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">
                          Calculation Mode <span className="text-red-400">*</span>
                        </label>
                        <Select
                          value={isConditionalDeduction ? newConditionalDeductionMode : newDeductionMode}
                          onChange={(e) => {
                            if (isConditionalDeduction) {
                              setNewConditionalDeductionMode(e.target.value as PayrollMode);
                            } else {
                              setNewDeductionMode(e.target.value as PayrollMode);
                            }
                          }}
                          options={[
                            { value: 'FIXED_MONTHLY', label: 'Fixed (Monthly)' },
                            { value: 'FIXED_YEARLY', label: 'Fixed (Yearly)' },
                            { value: 'PERCENT_OF_BASIC', label: '% of Basic' },
                            { value: 'PERCENT_OF_CTC', label: '% of CTC' },
                            { value: 'REMAINDER', label: 'Remainder' },
                          ]}
                          className="text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {(() => {
                            const mode = isConditionalDeduction ? newConditionalDeductionMode : newDeductionMode;
                            if (mode === 'FIXED_MONTHLY' || mode === 'FIXED') return 'Fixed monthly amount in ₹';
                            if (mode === 'FIXED_YEARLY') return 'Fixed yearly amount in ₹ (divided by 12 for monthly)';
                            if (mode === 'PERCENT_OF_BASIC') return '% of employee\'s Basic Salary';
                            if (mode === 'PERCENT_OF_CTC') return '% of employee\'s Annual CTC (divided by 12 for monthly)';
                            return 'Automatically calculated as remaining amount after all other deductions';
                          })()}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">
                          Value <span className="text-red-400">*</span>
                        </label>
                        <Input
                          type="number"
                          placeholder={isConditionalDeduction ? newConditionalDeductionMode === 'PERCENT_OF_BASIC' || newConditionalDeductionMode === 'PERCENT_OF_CTC' ? 'e.g., 10 (for 10%)' : 'e.g., 2000' : newDeductionMode === 'PERCENT_OF_BASIC' || newDeductionMode === 'PERCENT_OF_CTC' ? 'e.g., 10 (for 10%)' : 'e.g., 2000'}
                          value={String(isConditionalDeduction ? newConditionalDeductionValue : newDeductionValue)}
                          onChange={(e) => {
                            if (isConditionalDeduction) {
                              setNewConditionalDeductionValue(Number(e.target.value));
                            } else {
                              setNewDeductionValue(Number(e.target.value));
                            }
                          }}
                          disabled={(isConditionalDeduction ? newConditionalDeductionMode : newDeductionMode) === 'REMAINDER'}
                          className="text-sm"
                          min="0"
                          step={(isConditionalDeduction ? newConditionalDeductionMode : newDeductionMode) === 'FIXED_MONTHLY' || (isConditionalDeduction ? newConditionalDeductionMode : newDeductionMode) === 'FIXED_YEARLY' || (isConditionalDeduction ? newConditionalDeductionMode : newDeductionMode) === 'FIXED' ? '1' : '0.01'}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {(isConditionalDeduction ? newConditionalDeductionMode : newDeductionMode) === 'REMAINDER' 
                            ? 'Disabled for Remainder mode' 
                            : (isConditionalDeduction ? newConditionalDeductionMode : newDeductionMode) === 'FIXED_MONTHLY' || (isConditionalDeduction ? newConditionalDeductionMode : newDeductionMode) === 'FIXED'
                              ? 'Fixed amount in ₹ per month' 
                              : (isConditionalDeduction ? newConditionalDeductionMode : newDeductionMode) === 'FIXED_YEARLY'
                                ? 'Fixed amount in ₹ per year (will be divided by 12 for monthly calculation)'
                                : 'Percentage value (e.g., 10 for 10%)'}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button 
                        onClick={() => {
                          if (isConditionalDeduction) {
                            if (!newConditionalDeductionKey || !newConditionalDeductionLabel) return;
                            
                            // Build condition based on condition type
                            let condition: CategoryCondition = {
                              type: newConditionalDeductionConditionType,
                            };
                            
                            if (newConditionalDeductionConditionType === 'CTC_RANGE') {
                              // Validate CTC range - at least one bound must be set
                              if (newConditionalDeductionCtcMin === undefined && newConditionalDeductionCtcMax === undefined) {
                                toast.error("Please set at least a minimum or maximum CTC threshold");
                                return;
                              }
                              condition.ctcMin = newConditionalDeductionCtcMin;
                              condition.ctcMax = newConditionalDeductionCtcMax;
                            } else if (newConditionalDeductionConditionType === 'DEPARTMENT') {
                              if (newConditionalDeductionDepartments.length === 0) {
                                toast.error("Please select at least one department");
                                return;
                              }
                              condition.departments = newConditionalDeductionDepartments;
                            } else if (newConditionalDeductionConditionType === 'DESIGNATION') {
                              if (newConditionalDeductionDesignations.length === 0) {
                                toast.error("Please select at least one designation");
                                return;
                              }
                              condition.designations = newConditionalDeductionDesignations;
                            }
                            
                            const newCategory = {
                              key: newConditionalDeductionKey,
                              label: newConditionalDeductionLabel,
                              condition,
                              mode: newConditionalDeductionMode,
                              value: newConditionalDeductionMode !== 'REMAINDER' ? newConditionalDeductionValue : undefined
                            };
                            setSettings({
                              ...settings,
                              employerPF: {
                                ...settings.employerPF,
                                conditionalDeductions: [
                                  ...(settings.employerPF.conditionalDeductions || []),
                                  newCategory
                                ]
                              }
                            });
                            // Reset all form fields
                            setNewConditionalDeductionKey('');
                            setNewConditionalDeductionLabel('');
                            setNewConditionalDeductionMode('FIXED_MONTHLY');
                            setNewConditionalDeductionValue(0);
                            setNewConditionalDeductionConditionType('CTC_RANGE');
                            setNewConditionalDeductionCtcMin(undefined);
                            setNewConditionalDeductionCtcMax(undefined);
                            setNewConditionalDeductionDepartments([]);
                            setNewConditionalDeductionDesignations([]);
                            setIsConditionalDeduction(false);
                          } else {
                            addCustomDeduction();
                          }
                          setShowAddDeductionCategory(false);
                        }} 
                        disabled={
                          isConditionalDeduction 
                            ? (!newConditionalDeductionKey || !newConditionalDeductionLabel || (
                              (newConditionalDeductionConditionType === 'CTC_RANGE' && newConditionalDeductionCtcMin === undefined && newConditionalDeductionCtcMax === undefined) ||
                              (newConditionalDeductionConditionType === 'DEPARTMENT' && newConditionalDeductionDepartments.length === 0) ||
                              (newConditionalDeductionConditionType === 'DESIGNATION' && newConditionalDeductionDesignations.length === 0)
                            ))
                            : (!newDeductionKey || !newDeductionLabel)
                        } 
                        size="sm"
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Add Category
                      </Button>
                    </div>
                  </div>
                )}

                {/* Deduction Categories List */}
                <div className="space-y-2">
                  {[
                    { key: 'employeePF', label: 'Employee PF', setting: settings.deductions.employeePF, isSpecial: true },
                    { key: 'professionalTax', label: 'Professional Tax', setting: settings.deductions.professionalTax },
                    { key: 'esi', label: 'ESI', setting: settings.deductions.esi },
                  ].map((item) => {
                    if (!item.setting) return null; // Skip if deleted/missing (e.g., Employee PF removed)
                    const isCustom = (settings.customDeductions || []).some(d => d.key === item.key);
                    return (
                      <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-red-600 dark:text-red-400 text-sm">{item.label}</span>
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
                                { value: 'FIXED_MONTHLY', label: 'Fixed (Monthly)' },
                                { value: 'FIXED_YEARLY', label: 'Fixed (Yearly)' },
                                { value: 'PERCENT_OF_BASIC', label: '% of Basic' },
                                { value: 'PERCENT_OF_CTC', label: '% of CTC' },
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
                          {/* Employee PF cap option removed */}
                          {/* ESI enable option removed */}
                        </div>
                        <div className="flex gap-2 ml-2">
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
                              { value: 'FIXED_MONTHLY', label: 'Fixed (Monthly)' },
                              { value: 'FIXED_YEARLY', label: 'Fixed (Yearly)' },
                              { value: 'PERCENT_OF_BASIC', label: '% of Basic' },
                              { value: 'PERCENT_OF_CTC', label: '% of CTC' },
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

              {/* Conditional Deduction Categories List */}
              {(settings.employerPF.conditionalDeductions || []).length > 0 && (
                <div className="mt-6 p-4 rounded-lg bg-red-500/5 border border-red-500/10">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-semibold text-red-600 dark:text-red-400">Conditional Deduction Categories</h4>
                      <p className="text-xs text-gray-400 mt-1">Categories that apply only when employee's CTC meets the threshold</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {(settings.employerPF.conditionalDeductions || []).map((category) => (
                      <div key={category.key} className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-red-600 dark:text-red-400 text-sm">{category.label}</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                              {formatConditionText(category)}
                            </span>
                            {!isConditionActive(category, annualCTC) && (
                              <span className="text-xs px-2 py-0.5 rounded bg-gray-500/20 text-gray-400">
                                Inactive
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Select
                              value={category.mode}
                              onChange={(e) => {
                                const updated = (settings.employerPF.conditionalDeductions || []).map(c =>
                                  c.key === category.key ? { ...c, mode: e.target.value as PayrollMode } : c
                                );
                                setSettings({
                                  ...settings,
                                  employerPF: { ...settings.employerPF, conditionalDeductions: updated }
                                });
                              }}
                              options={[
                                { value: 'FIXED_MONTHLY', label: 'Fixed (Monthly)' },
                                { value: 'FIXED_YEARLY', label: 'Fixed (Yearly)' },
                                { value: 'PERCENT_OF_BASIC', label: '% of Basic' },
                                { value: 'PERCENT_OF_CTC', label: '% of CTC' },
                                { value: 'REMAINDER', label: 'Remainder' },
                              ]}
                              className="text-xs"
                            />
                            <Input
                              type="number"
                              value={String(category.value ?? '')}
                              onChange={(e) => {
                                const updated = (settings.employerPF.conditionalDeductions || []).map(c =>
                                  c.key === category.key ? { ...c, value: Number(e.target.value) } : c
                                );
                                setSettings({
                                  ...settings,
                                  employerPF: { ...settings.employerPF, conditionalDeductions: updated }
                                });
                              }}
                              disabled={category.mode === 'REMAINDER'}
                              className="text-xs"
                              placeholder="Value"
                            />
                          </div>
                        </div>
                        <Button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete "${category.label}"?`)) {
                              setSettings({
                                ...settings,
                                employerPF: {
                                  ...settings.employerPF,
                                  conditionalDeductions: (settings.employerPF.conditionalDeductions || []).filter(c => c.key !== category.key)
                                }
                              });
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
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Employer PF Configuration */}
          <Card>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-semibold text-blue-600 dark:text-blue-400">Employer PF Configuration</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Configure employer contribution to Provident Fund (PF). Employer PF is part of CTC and includes EPS (Employee Pension Scheme) and EPF (Employee Provident Fund).
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.employerPF.enabled !== false}
                  onChange={(e) => {
                    setSettings({
                      ...settings,
                      employerPF: {
                        ...settings.employerPF,
                        enabled: e.target.checked
                      }
                    });
                  }}
                  className="rounded"
                />
                <span className="text-sm text-gray-400">Enable Employer PF</span>
              </label>
            </div>
            
            <div className="space-y-4">
              {/* Employer PF Fields */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-blue-600 dark:text-blue-400">Employer PF Fields</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newField = {
                        id: `field_${Date.now()}`,
                        label: 'New Field',
                        value: 0,
                        type: 'PERCENTAGE' as const,
                      };
                      setSettings({
                        ...settings,
                        employerPF: {
                          ...settings.employerPF,
                          fields: [
                            ...(settings.employerPF.fields || []),
                            newField
                          ]
                        }
                      });
                    }}
                    className="flex items-center gap-2 text-blue-600 border-blue-500/30 hover:bg-blue-500/10"
                  >
                    <Plus className="h-4 w-4" />
                    Add Field
                  </Button>
                </div>
                
                {/* Fields List */}
                <div className="space-y-2">
                  {(settings.employerPF.fields || []).map((field) => (
                    <div key={field.id} className="flex items-center justify-between p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-blue-600 dark:text-blue-400 text-sm">{field.label}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <Input
                            type="text"
                            value={field.label}
                            onChange={(e) => {
                              const updated = (settings.employerPF.fields || []).map(f =>
                                f.id === field.id ? { ...f, label: e.target.value } : f
                              );
                              setSettings({
                                ...settings,
                                employerPF: {
                                  ...settings.employerPF,
                                  fields: updated
                                }
                              });
                            }}
                            className="text-xs"
                            placeholder="Field Label"
                          />
                          <Select
                            value={field.type}
                            onChange={(e) => {
                              const updated = (settings.employerPF.fields || []).map(f =>
                                f.id === field.id ? { ...f, type: e.target.value as 'FIXED_AMOUNT' | 'PERCENT_OF_CTC' | 'PERCENT_OF_BASIC' | 'FIXED_MONTHLY' | 'FIXED_YEARLY' } : f
                              );
                              setSettings({
                                ...settings,
                                employerPF: {
                                  ...settings.employerPF,
                                  fields: updated
                                }
                              });
                            }}
                            options={[
                              { value: 'PERCENT_OF_BASIC', label: '% of Basic' },
                              { value: 'PERCENT_OF_CTC', label: '% of CTC' },
                              { value: 'FIXED_MONTHLY', label: 'Fixed (Monthly)' },
                              { value: 'FIXED_YEARLY', label: 'Fixed (Yearly)' },
                              { value: 'FIXED_AMOUNT', label: 'Fixed Amount' }, // Keep for backward compatibility
                            ]}
                            className="text-xs"
                          />
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={String(field.value)}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                const updated = (settings.employerPF.fields || []).map(f =>
                                  f.id === field.id ? { ...f, value } : f
                                );
                                setSettings({
                                  ...settings,
                                  employerPF: {
                                    ...settings.employerPF,
                                    fields: updated
                                  }
                                });
                              }}
                              min="0"
                              step={
                                field.type === 'PERCENTAGE' ||
                                field.type === 'PERCENT_OF_BASIC' ||
                                field.type === 'PERCENT_OF_CTC' ? '0.01' : '1'
                              }
                              max={
                                field.type === 'PERCENTAGE' ||
                                field.type === 'PERCENT_OF_BASIC' ||
                                field.type === 'PERCENT_OF_CTC' ? '100' : undefined
                              }
                              className="text-xs flex-1"
                              placeholder={
                                field.type === 'PERCENTAGE' ||
                                field.type === 'PERCENT_OF_BASIC' ||
                                field.type === 'PERCENT_OF_CTC' ? 'e.g., 10 (for 10%)' :
                                field.type === 'FIXED_MONTHLY' ||
                                field.type === 'FIXED_AMOUNT' ? 'e.g., 5000' :
                                field.type === 'FIXED_YEARLY' ? 'e.g., 60000' : 'Enter value'
                              }
                            />
                            <span className="text-xs text-gray-400">
                              {field.type === 'PERCENTAGE' ||
                               field.type === 'PERCENT_OF_BASIC' ||
                               field.type === 'PERCENT_OF_CTC' ? '%' : '₹'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-2">
                        <Button
                          onClick={() => {
                            if (confirm(`Are you sure you want to remove "${field.label}"?`)) {
                              const updated = (settings.employerPF.fields || []).filter(f => f.id !== field.id);
                              setSettings({
                                ...settings,
                                employerPF: {
                                  ...settings.employerPF,
                                  fields: updated
                                }
                              });
                            }
                          }}
                          className="bg-red-600 hover:bg-red-700"
                          size="sm"
                          title="Remove field"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {(settings.employerPF.fields || []).length === 0 && (
                    <div className="text-center py-6 text-gray-400 text-sm">
                      <div className="mb-2">No employer PF fields configured</div>
                      <div className="text-xs">Add fields to configure employer PF contributions</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Calculation Preview */}
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <h4 className="text-sm font-medium text-blue-600 dark:text-blue-300 mb-2">Calculation Preview</h4>
                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  {(() => {
                    const fields = settings.employerPF.fields || [];
                    const totalPFField = fields.find(f => {
                      const labelLower = f.label.toLowerCase();
                      return f.id === 'employer_pf_total' || 
                             labelLower.includes('total pf') || 
                             labelLower.includes('employer pf total') ||
                             labelLower === 'employer pf' ||
                             (labelLower.includes('pf') && !labelLower.includes('eps') && !labelLower.includes('epf'));
                    });
                    const epsField = fields.find(f => {
                      const labelLower = f.label.toLowerCase();
                      return f.id === 'eps' || labelLower === 'eps';
                    });
                    const epfField = fields.find(f => {
                      const labelLower = f.label.toLowerCase();
                      return f.id === 'epf' || labelLower === 'epf';
                    });
                    
                    const formatFieldDescription = (field: any) => {
                      if (!field) return '';
                      switch (field.type) {
                        case 'PERCENT_OF_BASIC':
                          return `${field.value}% of Basic: ₹${breakdown.earnings.basic.toLocaleString('en-IN')}`;
                        case 'PERCENT_OF_CTC':
                          return `${field.value}% of CTC: ₹${breakdown.monthlyCTC.toLocaleString('en-IN')}`;
                        case 'FIXED_MONTHLY':
                        case 'FIXED_AMOUNT':
                          return `Fixed: ₹${field.value.toLocaleString('en-IN')}`;
                        case 'FIXED_YEARLY':
                          return `Fixed Yearly: ₹${field.value.toLocaleString('en-IN')} (₹${(field.value / 12).toLocaleString('en-IN')}/month)`;
                        case 'PERCENTAGE':
                          return `${field.value}% of Basic: ₹${breakdown.earnings.basic.toLocaleString('en-IN')}`;
                        default:
                          return '';
                      }
                    };
                    
                    return (
                      <>
                        <div>
                          Employer PF Total: ₹{breakdown.employer.totalPF.toLocaleString('en-IN', { maximumFractionDigits: 2 })} 
                          {totalPFField ? (
                            <span className="text-xs text-gray-400 ml-2">
                              ({formatFieldDescription(totalPFField)})
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 ml-2">
                              ({settings.employerPF.employerPFPercentOfBasic}% of Basic: ₹{breakdown.earnings.basic.toLocaleString('en-IN')})
                            </span>
                          )}
                        </div>
                        <div>
                          EPS: ₹{breakdown.employer.eps.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          {epsField ? (
                            <span className="text-xs text-gray-400 ml-2">
                              ({formatFieldDescription(epsField)}
                              {settings.employerPF.epsCap && epsField.type === 'PERCENT_OF_BASIC' ? `, capped at ₹${settings.employerPF.epsCap.toLocaleString('en-IN')}` : ''})
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 ml-2">
                              (min of {settings.employerPF.epsPercentOfBasic}% of Basic or ₹{settings.employerPF.epsCap.toLocaleString('en-IN')})
                            </span>
                          )}
                        </div>
                        <div>
                          EPF: ₹{breakdown.employer.epf.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          {epfField ? (
                            <span className="text-xs text-gray-400 ml-2">
                              ({formatFieldDescription(epfField)})
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 ml-2">
                              (Total PF - EPS)
                            </span>
                          )}
                        </div>
                      </>
                    );
                  })()}
                  {(settings.employerPF.conditionalEarnings || []).filter(cat => isConditionActive(cat, annualCTC)).length > 0 && (
                    <div className="mt-2 pt-2 border-t border-blue-500/20">
                      <div className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Active Conditional Earnings:</div>
                      {(settings.employerPF.conditionalEarnings || [])
                        .filter(cat => isConditionActive(cat, annualCTC))
                        .map(cat => (
                          <div key={cat.key} className="text-xs">
                            • {cat.label} ({formatConditionText(cat)})
                          </div>
                        ))}
                    </div>
                  )}
                  {(settings.employerPF.conditionalDeductions || []).filter(cat => isConditionActive(cat, annualCTC)).length > 0 && (
                    <div className="mt-2 pt-2 border-t border-blue-500/20">
                      <div className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">Active Conditional Deductions:</div>
                      {(settings.employerPF.conditionalDeductions || [])
                        .filter(cat => isConditionActive(cat, annualCTC))
                        .map(cat => (
                          <div key={cat.key} className="text-xs">
                            • {cat.label} ({formatConditionText(cat)})
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* LOP Settings */}
          <Card>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-semibold text-blue-600 dark:text-blue-400">LOP (Loss of Pay) Settings</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Configure how Loss of Pay (LOP) is calculated when employees take unpaid leave days.
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              {/* LOP Configuration */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-blue-600 dark:text-blue-400">LOP Configuration</h4>
                </div>
                
                {/* LOP Settings List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-blue-600 dark:text-blue-400 text-sm">Calculation Method</span>
                      </div>
                      <div className="w-full">
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
                          className="text-xs"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-blue-600 dark:text-blue-400 text-sm">Default Days in Month</span>
                      </div>
                      <div className="w-full">
                        <Input
                          type="number"
                          value={settings.lop.defaultDaysInMonth}
                          onChange={(e) => setSettings({
                            ...settings,
                            lop: { ...settings.lop, defaultDaysInMonth: parseInt(e.target.value) || 30 }
                          })}
                          min="28"
                          max="31"
                          className="text-xs"
                        />
                        <p className="text-xs text-gray-400 mt-1">Default working days per month for LOP calculation</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Calculation Preview */}
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <h4 className="text-sm font-medium text-blue-600 dark:text-blue-300 mb-2">LOP Calculation Preview</h4>
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
            </div>
          </Card>

          {/* Overtime Settings */}
          <Card>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-semibold text-blue-600 dark:text-blue-400">Overtime Hours Pay Settings</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Configure how overtime pay is calculated for employees who work beyond their regular hours.
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              {/* Overtime Configuration */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-blue-600 dark:text-blue-400">Overtime Configuration</h4>
                </div>
                
                {/* Overtime Settings List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-blue-600 dark:text-blue-400 text-sm">Calculation Method</span>
                      </div>
                      <div className="w-full">
                        <Select
                          value={settings.overtime?.calculationMethod || 'HOURLY_RATE_BY_BASIC'}
                          onChange={(e) => setSettings({
                            ...settings,
                            overtime: { 
                              ...settings.overtime || { hoursPerDay: 8, multiplier: 1.5 },
                              calculationMethod: e.target.value as any 
                            }
                          })}
                          options={[
                            { value: 'HOURLY_RATE_BY_BASIC', label: 'Hourly Rate (Basic ÷ Hours)' },
                            { value: 'HOURLY_RATE_BY_NET_PAY', label: 'Hourly Rate (Net Pay ÷ Hours)' },
                            { value: 'FIXED_RATE_PER_HOUR', label: 'Fixed Rate per Hour' },
                            { value: 'DOUBLE_RATE', label: 'Double Rate (2x)' },
                          ]}
                          className="text-xs"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-blue-600 dark:text-blue-400 text-sm">Hours Per Day</span>
                      </div>
                      <div className="w-full">
                        <Input
                          type="number"
                          value={settings.overtime?.hoursPerDay || 8}
                          onChange={(e) => setSettings({
                            ...settings,
                            overtime: { 
                              ...settings.overtime || { calculationMethod: 'HOURLY_RATE_BY_BASIC', multiplier: 1.5 },
                              hoursPerDay: parseInt(e.target.value) || 8 
                            }
                          })}
                          min="1"
                          max="24"
                          className="text-xs"
                        />
                        <p className="text-xs text-gray-400 mt-1">Default working hours per day</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-blue-600 dark:text-blue-400 text-sm">Multiplier</span>
                      </div>
                      <div className="w-full">
                        <Input
                          type="number"
                          value={settings.overtime?.multiplier || 1.5}
                          onChange={(e) => setSettings({
                            ...settings,
                            overtime: { 
                              ...settings.overtime || { calculationMethod: 'HOURLY_RATE_BY_BASIC', hoursPerDay: 8 },
                              multiplier: parseFloat(e.target.value) || 1.5 
                            }
                          })}
                          min="0.1"
                          max="10"
                          step="0.1"
                          className="text-xs"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          {settings.overtime?.calculationMethod === 'FIXED_RATE_PER_HOUR' 
                            ? 'Fixed rate per hour (₹)' 
                            : 'Overtime rate multiplier (e.g., 1.5 for 1.5x)'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Calculation Preview */}
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <h4 className="text-sm font-medium text-blue-600 dark:text-blue-300 mb-2">Overtime Calculation Preview</h4>
                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  <div>Method: {
                    settings.overtime?.calculationMethod === 'HOURLY_RATE_BY_BASIC' ? 'Basic ÷ Hours × Multiplier' :
                    settings.overtime?.calculationMethod === 'HOURLY_RATE_BY_NET_PAY' ? 'Net Pay ÷ Hours × Multiplier' :
                    settings.overtime?.calculationMethod === 'FIXED_RATE_PER_HOUR' ? 'Fixed Rate per Hour' :
                    settings.overtime?.calculationMethod === 'DOUBLE_RATE' ? 'Double Rate (2x)' :
                    'Hourly Rate (Basic ÷ Hours) × Multiplier'
                  }</div>
                  <div>Hours Per Day: {settings.overtime?.hoursPerDay || 8}</div>
                  <div>Multiplier: {
                    settings.overtime?.calculationMethod === 'FIXED_RATE_PER_HOUR' 
                      ? `₹${(settings.overtime?.multiplier || 1.5).toLocaleString('en-IN')} per hour`
                      : `${settings.overtime?.multiplier || 1.5}x`
                  }</div>
                  <div className="text-xs text-gray-400 mt-2">
                    {(() => {
                      const exampleBasic = breakdown.earnings.basic || 25000;
                      const exampleNetPay = breakdown.totals.netPay || 50000;
                      const exampleHours = 1;
                      let overtimeAmount = 0;
                      let calculationText = '';
                      
                      switch (settings.overtime?.calculationMethod) {
                        case 'HOURLY_RATE_BY_BASIC':
                          overtimeAmount = calculateOvertimePay(exampleHours, exampleNetPay, exampleBasic, settings);
                          calculationText = `For ${exampleHours} hour(s): (₹${exampleBasic.toLocaleString('en-IN')} ÷ ${settings.lop.defaultDaysInMonth || 30} days) ÷ ${settings.overtime?.hoursPerDay || 8} hours × ${settings.overtime?.multiplier || 1.5} = ₹${overtimeAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
                          break;
                        case 'HOURLY_RATE_BY_NET_PAY':
                          overtimeAmount = calculateOvertimePay(exampleHours, exampleNetPay, exampleBasic, settings);
                          calculationText = `For ${exampleHours} hour(s): (₹${exampleNetPay.toLocaleString('en-IN')} ÷ ${settings.lop.defaultDaysInMonth || 30} days) ÷ ${settings.overtime?.hoursPerDay || 8} hours × ${settings.overtime?.multiplier || 1.5} = ₹${overtimeAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
                          break;
                        case 'FIXED_RATE_PER_HOUR':
                          overtimeAmount = calculateOvertimePay(exampleHours, exampleNetPay, exampleBasic, settings);
                          calculationText = `For ${exampleHours} hour(s): ₹${(settings.overtime?.multiplier || 100).toLocaleString('en-IN')} × ${exampleHours} = ₹${overtimeAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
                          break;
                        case 'DOUBLE_RATE':
                          overtimeAmount = calculateOvertimePay(exampleHours, exampleNetPay, exampleBasic, settings);
                          calculationText = `For ${exampleHours} hour(s): (₹${exampleBasic.toLocaleString('en-IN')} ÷ ${settings.lop.defaultDaysInMonth || 30} days) ÷ ${settings.overtime?.hoursPerDay || 8} hours × 2 = ₹${overtimeAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
                          break;
                        default:
                          calculationText = `For ${exampleHours} hour(s): Calculate based on selected method`;
                      }
                      return `Example: ${calculationText}`;
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </Card>


          <Card>
            <h2 className="text-xl font-semibold mb-4">Live Preview</h2>
            <div className="mb-4 p-3 bg-indigo-500/10 border border-indigo-500/20 dark:border-indigo-500/30 rounded-lg">
              <p className="text-sm text-secondary dark:text-gray-400">
                <strong className="text-primary dark:text-white">Note:</strong> All amounts shown below are <strong className="text-primary dark:text-white">Monthly</strong> (except Annual CTC).
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <Input type="number" label="Annual CTC" value={String(annualCTC)} onChange={(e) => setAnnualCTC(Number(e.target.value))} />
                <div className="text-sm text-gray-400">Monthly CTC: ₹{breakdown.monthlyCTC.toLocaleString('en-IN')}</div>
                <Input type="number" label="LOP Days" value={String(lop)} onChange={(e) => setLop(Number(e.target.value))} />
                <Input type="number" label="Overtime Hours" value={String(overtimeHours)} onChange={(e) => setOvertimeHours(Number(e.target.value))} />
                <Input type="number" label="TDS (override)" value={String(tds)} onChange={(e) => setTds(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <div className="font-semibold">Earnings</div>
                {Object.entries(breakdown.earnings)
                  .filter(([k, v]) => v > 0 || k === 'basic' || k === 'hra' || k === 'medical' || k === 'conveyance' || k === 'lta' || k === 'special')
                  .map(([k, v]) => {
                    // Map internal keys to display labels
                    const labelMap: Record<string, string> = {
                      basic: 'Basic',
                      hra: 'HRA',
                      medical: 'Medical',
                      conveyance: 'Conveyance',
                      lta: 'LTA',
                      special: 'Special',
                      overtime: 'Overtime',
                    };
                    // Check if it's a custom earning
                    const customEarning = settings.customEarnings?.find(e => e.key === k);
                    const label = customEarning?.label || labelMap[k] || k.split(/(?=[A-Z])/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                    return (
                      <div key={k} className="flex justify-between text-sm">
                        <span>{label}</span>
                        <span>₹{Number(v).toLocaleString('en-IN')}</span>
                      </div>
                    );
                  })}
                <div className="flex justify-between text-sm border-t border-white/10 pt-2"><span>Total</span><span>₹{breakdown.totals.totalEarnings.toLocaleString('en-IN')}</span></div>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="font-semibold mb-1">Deductions</div>
                  {/* Show all configured deductions dynamically */}
                  {Object.entries(breakdown.deductions)
                    .filter(([key, value]) => key !== 'lop' && (value > 0 || key === 'empPF' || key === 'professionalTax' || key === 'esi'))
                    .map(([key, value]) => {
                      // Map internal keys to display labels
                      const labelMap: Record<string, string> = {
                        empPF: 'Employee PF',
                        professionalTax: 'Professional Tax',
                        esi: 'ESI',
                        tds: 'TDS',
                      };
                      // Check if it's a custom deduction
                      const customDeduction = settings.customDeductions?.find(d => d.key === key);
                      const label = customDeduction?.label || labelMap[key] || key.split(/(?=[A-Z])/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                      return (
                        <div key={key} className="flex justify-between text-sm">
                          <span>{label}</span>
                          <span>₹{Number(value).toLocaleString('en-IN')}</span>
                        </div>
                      );
                    })}
                  {(breakdown.deductions.lop ?? 0) > 0 && (
                    <div className="flex justify-between text-sm"><span>LOP</span><span>₹{(breakdown.deductions.lop ?? 0).toLocaleString('en-IN')}</span></div>
                  )}
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

      {activeTab === 'notifications' && (
        <Card className="p-4">
          <h2 className="text-2xl font-bold text-primary mb-2">Notifications</h2>
          <p className="text-gray-400 mb-6">Configure organization-wide notification preferences.</p>

          <div className="space-y-6">
            <div className="p-4 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
              <h3 className="text-lg font-semibold text-indigo-400 mb-2">Birthday Notifications</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean((settings as any).notifications?.birthday?.enabled)}
                    onChange={(e) => {
                      setSettings(prev => {
                        const next: any = JSON.parse(JSON.stringify(prev));
                        next.notifications = next.notifications || {};
                        next.notifications.birthday = next.notifications.birthday || {};
                        next.notifications.birthday.enabled = e.target.checked;
                        return next;
                      });
                    }}
                    className="rounded"
                  />
                  <span>Enable birthday notifications</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean((settings as any).notifications?.birthday?.allowEmployeesSeeAll)}
                    onChange={(e) => {
                      setSettings(prev => {
                        const next: any = JSON.parse(JSON.stringify(prev));
                        next.notifications = next.notifications || {};
                        next.notifications.birthday = next.notifications.birthday || {};
                        next.notifications.birthday.allowEmployeesSeeAll = e.target.checked;
                        return next;
                      });
                    }}
                    className="rounded"
                  />
                  <span>Allow employees to see all birthdays (else only their own)</span>
                </label>
                {/* No advance or lookahead configuration; birthdays are sent only on the day */}
                {/* Birthday email templates (Employee + Admin digests) */}
                <div className="mt-4 space-y-2">
                  <div className="text-sm font-medium text-secondary">Email Templates</div>
                  {/* Employee email on birthday day */}
                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <div className="font-medium mb-2">Employee Email (on birthday)</div>
                      <label className="block text-sm text-secondary mb-1">Subject</label>
                      <Input
                        value={String((settings as any).notifications?.birthday?.templates?.employee_subject ?? '')}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSettings(prev => {
                            const next: any = JSON.parse(JSON.stringify(prev));
                            next.notifications = next.notifications || {};
                            next.notifications.birthday = next.notifications.birthday || {};
                            next.notifications.birthday.templates = next.notifications.birthday.templates || {};
                            next.notifications.birthday.templates.employee_subject = val;
                            return next;
                          });
                        }}
                        placeholder="e.g., Happy Birthday, {{employee_name}}! 🎂"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-secondary mb-1">Body</label>
                      <textarea
                        className="w-full rounded-md bg-white/10 border border-white/10 p-2 text-sm"
                        rows={6}
                        value={String((settings as any).notifications?.birthday?.templates?.employee_body ?? '')}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSettings(prev => {
                            const next: any = JSON.parse(JSON.stringify(prev));
                            next.notifications = next.notifications || {};
                            next.notifications.birthday = next.notifications.birthday || {};
                            next.notifications.birthday.templates = next.notifications.birthday.templates || {};
                            next.notifications.birthday.templates.employee_body = val;
                            return next;
                          });
                        }}
                        placeholder={"Dear {{employee_name}},\n\nWishing you a very Happy Birthday from all of us at {{organization_name}}! 🎉\n\nWarm regards,\n{{organization_name}}"}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Placeholders: {'{{employee_name}}'}, {'{{organization_name}}'}
                      </p>
                    </div>
                  </div>
                  {/* HR/Admin templates: today's list and monthly digest */}
                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <div className="font-medium mb-2">HR/Admin Email (Today's birthdays)</div>
                      <label className="block text-sm text-secondary mb-1">Subject</label>
                      <Input
                        value={String((settings as any).notifications?.birthday?.templates?.admin_today_subject ?? '')}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSettings(prev => {
                            const next: any = JSON.parse(JSON.stringify(prev));
                            next.notifications = next.notifications || {};
                            next.notifications.birthday = next.notifications.birthday || {};
                            next.notifications.birthday.templates = next.notifications.birthday.templates || {};
                            next.notifications.birthday.templates.admin_today_subject = val;
                            return next;
                          });
                        }}
                        placeholder="e.g., Today's Birthdays - {{date}}"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-secondary mb-1">Body</label>
                      <textarea
                        className="w-full rounded-md bg-white/10 border border-white/10 p-2 text-sm"
                        rows={6}
                        value={String((settings as any).notifications?.birthday?.templates?.admin_today_body ?? '')}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSettings(prev => {
                            const next: any = JSON.parse(JSON.stringify(prev));
                            next.notifications = next.notifications || {};
                            next.notifications.birthday = next.notifications.birthday || {};
                            next.notifications.birthday.templates = next.notifications.birthday.templates || {};
                            next.notifications.birthday.templates.admin_today_body = val;
                            return next;
                          });
                        }}
                        placeholder={"Hello Team,\n\nHere are today's birthdays at {{organization_name}}:\n\n{{list}}\n\nRegards,\nHR Portal System"}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Placeholders: {'{{date}}'}, {'{{organization_name}}'}, {'{{list}}'}
                      </p>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <div className="font-medium mb-2">HR/Admin Email (Monthly digest on 1st)</div>
                      <label className="block text-sm text-secondary mb-1">Subject</label>
                      <Input
                        value={String((settings as any).notifications?.birthday?.templates?.admin_monthly_subject ?? '')}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSettings(prev => {
                            const next: any = JSON.parse(JSON.stringify(prev));
                            next.notifications = next.notifications || {};
                            next.notifications.birthday = next.notifications.birthday || {};
                            next.notifications.birthday.templates = next.notifications.birthday.templates || {};
                            next.notifications.birthday.templates.admin_monthly_subject = val;
                            return next;
                          });
                        }}
                        placeholder="e.g., Birthdays — {{month}} {{year}}"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-secondary mb-1">Body</label>
                      <textarea
                        className="w-full rounded-md bg-white/10 border border-white/10 p-2 text-sm"
                        rows={6}
                        value={String((settings as any).notifications?.birthday?.templates?.admin_monthly_body ?? '')}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSettings(prev => {
                            const next: any = JSON.parse(JSON.stringify(prev));
                            next.notifications = next.notifications || {};
                            next.notifications.birthday = next.notifications.birthday || {};
                            next.notifications.birthday.templates = next.notifications.birthday.templates || {};
                            next.notifications.birthday.templates.admin_monthly_body = val;
                            return next;
                          });
                        }}
                        placeholder={"Hello Team,\n\nHere are the birthdays for {{month}} {{year}} at {{organization_name}}:\n\n{{list}}\n\nRegards,\nHR Portal System"}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Placeholders: {'{{month}}'}, {'{{year}}'}, {'{{organization_name}}'}, {'{{list}}'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Work Anniversary Notifications - sub-category */}
            <div className="mt-8 p-4 rounded-lg bg-amber-500/5 border border-amber-500/10">
              <h3 className="text-lg font-semibold text-amber-400 mb-2">Work Anniversary Notifications</h3>
              <p className="text-sm text-secondary mb-4">Configure email templates for employee congratulations and HR/Admin notifications.</p>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="font-medium mb-2">Employee Email (on anniversary day)</div>
                  <label className="block text-sm text-secondary mb-1">Subject</label>
                  <Input
                    value={String((settings as any).notifications?.anniversary?.templates?.employee_subject ?? '')}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSettings(prev => {
                        const next: any = JSON.parse(JSON.stringify(prev));
                        next.notifications = next.notifications || {};
                        next.notifications.anniversary = next.notifications.anniversary || {};
                        next.notifications.anniversary.templates = next.notifications.anniversary.templates || {};
                        next.notifications.anniversary.templates.employee_subject = val;
                        return next;
                      });
                    }}
                    placeholder="e.g., Happy Work Anniversary, {{employee_name}}! 🎉"
                  />
                  <label className="block text-sm text-secondary mt-3 mb-1">Body</label>
                  <textarea
                    className="w-full rounded-md bg-white/10 border border-white/10 p-2 text-sm"
                    rows={6}
                    value={String((settings as any).notifications?.anniversary?.templates?.employee_body ?? '')}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSettings(prev => {
                        const next: any = JSON.parse(JSON.stringify(prev));
                        next.notifications = next.notifications || {};
                        next.notifications.anniversary = next.notifications.anniversary || {};
                        next.notifications.anniversary.templates = next.notifications.anniversary.templates || {};
                        next.notifications.anniversary.templates.employee_body = val;
                        return next;
                      });
                    }}
                    placeholder={"Dear {{employee_name}},\n\nCongratulations on your {{years}}-year work anniversary with {{organization_name}}!\n\nWarm regards,\n{{organization_name}}"}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Placeholders: {'{{employee_name}}'}, {'{{years}}'}, {'{{organization_name}}'}
                  </p>
                </div>
                
                <div>
                  <div className="font-medium mb-2">HR/Admin Email (Today's anniversaries)</div>
                  <label className="block text-sm text-secondary mb-1">Subject</label>
                  <Input
                    value={String((settings as any).notifications?.anniversary?.templates?.admin_today_subject ?? '')}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSettings(prev => {
                        const next: any = JSON.parse(JSON.stringify(prev));
                        next.notifications = next.notifications || {};
                        next.notifications.anniversary = next.notifications.anniversary || {};
                        next.notifications.anniversary.templates = next.notifications.anniversary.templates || {};
                        next.notifications.anniversary.templates.admin_today_subject = val;
                        return next;
                      });
                    }}
                    placeholder="e.g., Today's Work Anniversaries - {{date}}"
                  />
                  <label className="block text-sm text-secondary mt-3 mb-1">Body</label>
                  <textarea
                    className="w-full rounded-md bg-white/10 border border-white/10 p-2 text-sm"
                    rows={6}
                    value={String((settings as any).notifications?.anniversary?.templates?.admin_today_body ?? '')}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSettings(prev => {
                        const next: any = JSON.parse(JSON.stringify(prev));
                        next.notifications = next.notifications || {};
                        next.notifications.anniversary = next.notifications.anniversary || {};
                        next.notifications.anniversary.templates = next.notifications.anniversary.templates || {};
                        next.notifications.anniversary.templates.admin_today_body = val;
                        return next;
                      });
                    }}
                    placeholder={"Hello Team,\n\nHere are today's work anniversaries at {{organization_name}}:\n\n{{list}}\n\nRegards,\nHR Portal System"}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Placeholders: {'{{date}}'}, {'{{organization_name}}'}, {'{{list}}'}
                  </p>
                </div>
              </div>
              
              <div className="mt-6">
                <div className="font-medium mb-2">HR/Admin Email (Monthly digest on 1st)</div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm text-secondary mb-1">Subject</label>
                    <Input
                      value={String((settings as any).notifications?.anniversary?.templates?.admin_monthly_subject ?? '')}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSettings(prev => {
                          const next: any = JSON.parse(JSON.stringify(prev));
                          next.notifications = next.notifications || {};
                          next.notifications.anniversary = next.notifications.anniversary || {};
                          next.notifications.anniversary.templates = next.notifications.anniversary.templates || {};
                          next.notifications.anniversary.templates.admin_monthly_subject = val;
                          return next;
                        });
                      }}
                      placeholder="e.g., Work Anniversaries — {{month}} {{year}}"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-secondary mb-1">Body</label>
                    <textarea
                      className="w-full rounded-md bg-white/10 border border-white/10 p-2 text-sm"
                      rows={6}
                      value={String((settings as any).notifications?.anniversary?.templates?.admin_monthly_body ?? '')}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSettings(prev => {
                          const next: any = JSON.parse(JSON.stringify(prev));
                          next.notifications = next.notifications || {};
                          next.notifications.anniversary = next.notifications.anniversary || {};
                          next.notifications.anniversary.templates = next.notifications.anniversary.templates || {};
                          next.notifications.anniversary.templates.admin_monthly_body = val;
                          return next;
                        });
                      }}
                      placeholder={"Hello Team,\n\nHere are the work anniversaries for {{month}} {{year}} at {{organization_name}}:\n\n{{list}}\n\nRegards,\nHR Portal System"}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Placeholders: {'{{month}}'}, {'{{year}}'}, {'{{organization_name}}'}, {'{{list}}'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
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
          {/* Active option removed */}
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
                    {/* Active option removed in edit form */}
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
                      {/* Active badge removed as requested */}
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

// Department Search Component (similar to DesignationSearchInput)
function DepartmentSearchInput({
  departments,
  selected,
  onSelectionChange,
  isLoading,
  error,
}: {
  departments: string[];
  selected: string[];
  onSelectionChange: (departments: string[]) => void;
  isLoading?: boolean;
  error?: Error | null;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Filter departments based on search query
  const filteredDepartments = useMemo(() => {
    if (!searchQuery.trim()) return departments;
    const query = searchQuery.toLowerCase();
    return departments.filter(dept => dept.toLowerCase().includes(query));
  }, [departments, searchQuery]);

  // Remove a selected department
  const removeDepartment = (dept: string) => {
    onSelectionChange(selected.filter(d => d !== dept));
  };

  // Add a department
  const addDepartment = (dept: string) => {
    if (!selected.includes(dept)) {
      onSelectionChange([...selected, dept]);
      setSearchQuery(''); // Clear search after selection
    }
  };

  return (
    <div className="relative">
      {/* Selected departments display */}
      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {selected.map((dept) => (
            <span
              key={dept}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-500/20 text-indigo-400 text-xs"
            >
              {dept}
              <button
                type="button"
                onClick={() => removeDepartment(dept)}
                className="text-indigo-400 hover:text-indigo-300"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <Input
        placeholder={selected.length > 0 ? "Search for more departments..." : "Search departments..."}
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => {
          setShowDropdown(true);
        }}
        onBlur={() => {
          // Delay hiding dropdown to allow clicks
          setTimeout(() => setShowDropdown(false), 200);
        }}
        className="text-sm"
      />

      {/* Dropdown results */}
      {showDropdown && (
        <div className="absolute z-50 mt-2 max-h-48 overflow-y-auto border border-card dark:border-white/10 rounded-lg bg-card dark:bg-white/10 shadow-lg w-full">
          {filteredDepartments.length > 0 ? (
            <>
              {filteredDepartments
                .filter(dept => !selected.includes(dept)) // Only show unselected departments
                .map((dept) => (
                  <button
                    key={dept}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-white/10 dark:hover:bg-white/20 text-primary dark:text-white transition-colors"
                    onClick={() => {
                      addDepartment(dept);
                      setShowDropdown(false);
                    }}
                  >
                    {dept}
                  </button>
                ))}
              {filteredDepartments.filter(dept => !selected.includes(dept)).length === 0 && (
                <div className="px-3 py-2 text-sm text-secondary dark:text-gray-400">All departments selected</div>
              )}
            </>
          ) : (
            <div className="px-3 py-2 text-sm text-secondary dark:text-gray-400">
              {searchQuery.trim() ? 'No departments found matching your search' : 'No departments available'}
            </div>
          )}
        </div>
      )}

      {isLoading && (
        <p className="text-xs text-gray-500 mt-1">Loading departments...</p>
      )}
      {!isLoading && departments.length === 0 && (
        <p className="text-xs text-gray-500 mt-1">
          {error 
            ? "Error loading departments. Please refresh the page." 
            : "No departments found. HR/Admin users can create departments through the API."}
        </p>
      )}
    </div>
  );
}

// Designation Search Component (similar to ManagerSearch)
function DesignationSearchInput({
  designations,
  selected,
  onSelectionChange,
  isLoading,
  error,
}: {
  designations: string[];
  selected: string[];
  onSelectionChange: (designations: string[]) => void;
  isLoading?: boolean;
  error?: Error | null;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Filter designations based on search query
  const filteredDesignations = useMemo(() => {
    if (!searchQuery.trim()) return designations;
    const query = searchQuery.toLowerCase();
    return designations.filter(desig => desig.toLowerCase().includes(query));
  }, [designations, searchQuery]);

  // Debug: Log filtered designations
  useEffect(() => {
    console.log('DesignationSearchInput Debug:', {
      designations,
      filteredDesignations,
      searchQuery,
      showDropdown,
      selected,
    });
  }, [designations, filteredDesignations, searchQuery, showDropdown, selected]);

  // Remove a selected designation
  const removeDesignation = (desig: string) => {
    onSelectionChange(selected.filter(d => d !== desig));
  };

  // Add a designation
  const addDesignation = (desig: string) => {
    if (!selected.includes(desig)) {
      onSelectionChange([...selected, desig]);
      setSearchQuery(''); // Clear search after selection
    }
  };

  return (
    <div className="relative">
      {/* Selected designations display */}
      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {selected.map((desig) => (
            <span
              key={desig}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-500/20 text-indigo-400 text-xs"
            >
              {desig}
              <button
                type="button"
                onClick={() => removeDesignation(desig)}
                className="text-indigo-400 hover:text-indigo-300"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <Input
        placeholder={selected.length > 0 ? "Search for more designations..." : "Search designations..."}
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => {
          setShowDropdown(true);
        }}
        onBlur={() => {
          // Delay hiding dropdown to allow clicks
          setTimeout(() => setShowDropdown(false), 200);
        }}
        className="text-sm"
      />

      {/* Dropdown results */}
      {showDropdown && (
        <div className="absolute z-50 mt-2 max-h-48 overflow-y-auto border border-card dark:border-white/10 rounded-lg bg-card dark:bg-white/10 shadow-lg w-full">
          {filteredDesignations.length > 0 ? (
            <>
              {filteredDesignations
                .filter(desig => !selected.includes(desig)) // Only show unselected designations
                .map((desig) => (
                  <button
                    key={desig}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-white/10 dark:hover:bg-white/20 text-primary dark:text-white transition-colors"
                    onClick={() => {
                      addDesignation(desig);
                      setShowDropdown(false);
                    }}
                  >
                    {desig}
                  </button>
                ))}
              {filteredDesignations.filter(desig => !selected.includes(desig)).length === 0 && (
                <div className="px-3 py-2 text-sm text-secondary dark:text-gray-400">All designations selected</div>
              )}
            </>
          ) : (
            <div className="px-3 py-2 text-sm text-secondary dark:text-gray-400">
              {searchQuery.trim() ? 'No designations found matching your search' : 'No designations available'}
            </div>
          )}
        </div>
      )}

      {isLoading && (
        <p className="text-xs text-gray-500 mt-1">Loading designations...</p>
      )}
      {!isLoading && designations.length === 0 && (
        <p className="text-xs text-gray-500 mt-1">
          {error 
            ? "Error loading designations. Please refresh the page." 
            : "No designations found. HR/Admin users can create designations through the API."}
        </p>
      )}
    </div>
  );
}
