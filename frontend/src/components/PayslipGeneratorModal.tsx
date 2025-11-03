"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import Button from "./ui/Button";
import Input from "./ui/Input";
import { toast } from "sonner";
import { computePayslipFromCTC, calculateOvertimePay } from "@/lib/payroll";
import { getUser } from "@/lib/api";

interface PayslipGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  month: number;
  year: number;
  companySettings: any;
}

interface DynamicCategory {
  id: string;
  name: string;
  amount: number;
  percentage: number;
  isPercentageOf: 'basic' | 'ctc' | 'gross' | 'none';
}

export default function PayslipGeneratorModal({
  isOpen,
  onClose,
  userId,
  userName,
  month,
  year,
  companySettings,
}: PayslipGeneratorModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [userCTC, setUserCTC] = useState(0);
  
  // Earnings state
  const [basicSalary, setBasicSalary] = useState(0);
  const [basicPercentage, setBasicPercentage] = useState(40);
  const [hra, setHra] = useState(0);
  const [hraPercentage, setHraPercentage] = useState(50);
  const [specialAllowance, setSpecialAllowance] = useState(0);
  const [otherAllowances, setOtherAllowances] = useState(0);
  
  // Deductions state
  const [pf, setPf] = useState(0);
  const [pfPercentage, setPfPercentage] = useState(12);
  const [esi, setEsi] = useState(0);
  const [esiPercentage, setEsiPercentage] = useState(0.75);
  const [professionalTax, setProfessionalTax] = useState(0);
  const [tds, setTds] = useState(0);
  const [tdsPercentage, setTdsPercentage] = useState(0);
  const [otherDeductions, setOtherDeductions] = useState(0);
  
  // LOP state
  const [lopDays, setLopDays] = useState(0);
  const [lopAmount, setLopAmount] = useState(0);
  const [lopFixedAmountPerDay, setLopFixedAmountPerDay] = useState(1000);
  
  // Overtime state
  const [overtimeHours, setOvertimeHours] = useState(0);
  const [overtimeAmount, setOvertimeAmount] = useState(0);

  // Dynamic categories
  const [customEarnings, setCustomEarnings] = useState<DynamicCategory[]>([]);
  const [customDeductions, setCustomDeductions] = useState<DynamicCategory[]>([]);

  // Highlighting state
  const [highlightedField, setHighlightedField] = useState<string | null>(null);
  
  // Use ref to store companySettings to avoid callback recreation
  const companySettingsRef = useRef(companySettings);
  useEffect(() => {
    companySettingsRef.current = companySettings;
  }, [companySettings]);

  const fetchUserDataAndCalculate = React.useCallback(async () => {
    if (!userId) return;
    
    try {
      const userData = await getUser(userId);
      const ctc = parseFloat(userData.data.ctc || "0") || 0;
      setUserCTC(ctc);
      
      // Calculate initial breakdown using company settings or defaults
      const breakdown = computePayslipFromCTC(ctc, companySettingsRef.current || {});
      
      // Set earnings with better defaults
      setBasicSalary(breakdown.earnings.basic);
      setHra(breakdown.earnings.hra);
      setSpecialAllowance(breakdown.earnings.special);
      setOtherAllowances(breakdown.earnings.medical + breakdown.earnings.conveyance + breakdown.earnings.lta);
      
      // Set deductions with better defaults
      setPf(breakdown.deductions.empPF);
      setEsi(breakdown.deductions.esi);
      setProfessionalTax(breakdown.deductions.professionalTax);
      setTds(breakdown.deductions.tds);
      setOtherDeductions(0);
      
      // Set percentages from company settings or smart defaults
      const currentSettings = companySettingsRef.current;
      if (currentSettings) {
        setBasicPercentage(currentSettings.basicSalaryPercentage || 40);
        setHraPercentage(currentSettings.hraPercentage || 50);
        setPfPercentage(currentSettings.pfPercentage || 12);
        setEsiPercentage(currentSettings.esiPercentage || 0.75);
        setTdsPercentage(currentSettings.tdsPercentage || 0);
      } else {
        // Smart defaults based on CTC
        const monthlyCTC = ctc / 12;
        setBasicPercentage((breakdown.earnings.basic / monthlyCTC) * 100);
        setHraPercentage((breakdown.earnings.hra / breakdown.earnings.basic) * 100);
        setPfPercentage((breakdown.deductions.empPF / breakdown.earnings.basic) * 100);
        setEsiPercentage((breakdown.deductions.esi / monthlyCTC) * 100);
        setTdsPercentage((breakdown.deductions.tds / monthlyCTC) * 100);
      }
      
      // Initialize custom categories with common ones
      setCustomEarnings([
        { id: 'medical', name: 'Medical Allowance', amount: breakdown.earnings.medical, percentage: 0, isPercentageOf: 'none' },
        { id: 'conveyance', name: 'Conveyance Allowance', amount: breakdown.earnings.conveyance, percentage: 0, isPercentageOf: 'none' },
        { id: 'lta', name: 'Leave Travel Allowance', amount: breakdown.earnings.lta, percentage: 0, isPercentageOf: 'none' },
      ]);
      
      setCustomDeductions([
        { id: 'advance', name: 'Advance Deduction', amount: 0, percentage: 0, isPercentageOf: 'none' },
        { id: 'loan', name: 'Loan Deduction', amount: 0, percentage: 0, isPercentageOf: 'none' },
      ]);
      
    } catch (error) {
      toast.error("Failed to fetch user data");
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserDataAndCalculate();
    }
  }, [isOpen, userId, fetchUserDataAndCalculate]);

  const recalculateFromBasicPercentage = () => {
    const monthlyCTC = userCTC / 12;
    const newBasic = (monthlyCTC * basicPercentage) / 100;
    setBasicSalary(newBasic);
    
    const newHra = (newBasic * hraPercentage) / 100;
    setHra(newHra);
    
    const newPf = (newBasic * pfPercentage) / 100;
    setPf(newPf);
  };

  const recalculateFromBasicAmount = () => {
    const newHra = (basicSalary * hraPercentage) / 100;
    setHra(newHra);
    
    const newPf = (basicSalary * pfPercentage) / 100;
    setPf(newPf);
    
    const monthlyCTC = userCTC / 12;
    const calculatedBasicPercentage = (basicSalary / monthlyCTC) * 100;
    setBasicPercentage(calculatedBasicPercentage);
  };

  const recalculateHRA = () => {
    const newHra = (basicSalary * hraPercentage) / 100;
    setHra(newHra);
  };

  const recalculatePF = () => {
    const newPf = (basicSalary * pfPercentage) / 100;
    setPf(newPf);
  };

  const calculateTotals = () => {
    const customEarningsTotal = customEarnings.reduce((sum, cat) => sum + cat.amount, 0);
    const customDeductionsTotal = customDeductions.reduce((sum, cat) => sum + cat.amount, 0);
    
    // Calculate overtime pay if overtime hours provided
    let calculatedOvertimeAmount = 0;
    if (overtimeHours > 0 && companySettings) {
      const grossEarningsBeforeOvertime = basicSalary + hra + specialAllowance + otherAllowances + customEarningsTotal;
      const totalDeductionsBeforeOvertime = pf + esi + professionalTax + tds + otherDeductions + lopAmount + customDeductionsTotal;
      const netPayBeforeOvertime = grossEarningsBeforeOvertime - totalDeductionsBeforeOvertime;
      calculatedOvertimeAmount = calculateOvertimePay(overtimeHours, netPayBeforeOvertime, basicSalary, companySettings);
      setOvertimeAmount(calculatedOvertimeAmount);
    } else if (overtimeHours === 0) {
      setOvertimeAmount(0);
    }
    
    const grossEarnings = basicSalary + hra + specialAllowance + otherAllowances + customEarningsTotal + calculatedOvertimeAmount;
    const totalDeductions = pf + esi + professionalTax + tds + otherDeductions + lopAmount + customDeductionsTotal;
    const netPay = grossEarnings - totalDeductions;
    
    return {
      grossEarnings,
      totalDeductions,
      netPay,
    };
  };

  // Helper functions for dynamic categories
  const addCustomEarning = () => {
    const newCategory: DynamicCategory = {
      id: `custom-earning-${Date.now()}`,
      name: 'New Allowance',
      amount: 0,
      percentage: 0,
      isPercentageOf: 'none'
    };
    setCustomEarnings([...customEarnings, newCategory]);
  };

  const addCustomDeduction = () => {
    const newCategory: DynamicCategory = {
      id: `custom-deduction-${Date.now()}`,
      name: 'New Deduction',
      amount: 0,
      percentage: 0,
      isPercentageOf: 'none'
    };
    setCustomDeductions([...customDeductions, newCategory]);
  };

  const removeCustomEarning = (id: string) => {
    setCustomEarnings(customEarnings.filter(cat => cat.id !== id));
  };

  const removeCustomDeduction = (id: string) => {
    setCustomDeductions(customDeductions.filter(cat => cat.id !== id));
  };

  const updateCustomEarning = (id: string, field: keyof DynamicCategory, value: any) => {
    setCustomEarnings(customEarnings.map(cat => 
      cat.id === id ? { ...cat, [field]: value } : cat
    ));
  };

  const updateCustomDeduction = (id: string, field: keyof DynamicCategory, value: any) => {
    setCustomDeductions(customDeductions.map(cat => 
      cat.id === id ? { ...cat, [field]: value } : cat
    ));
  };

  // Helper function to get field highlight class
  const getFieldHighlightClass = (fieldName: string) => {
    return highlightedField === fieldName 
      ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' 
      : '';
  };

  const handleGeneratePayslip = async () => {
    setIsLoading(true);
    try {
      const totals = calculateTotals();
      
      const payslipData = {
        userId,
        month,
        year,
        earnings: {
          basic: basicSalary,
          hra,
          specialAllowance,
          other: otherAllowances,
          overtime: overtimeAmount,
          custom: customEarnings.reduce((acc, cat) => ({ ...acc, [cat.name]: cat.amount }), {}),
        },
        deductions: {
          pf,
          esi,
          professionalTax,
          tds,
          other: otherDeductions,
          custom: customDeductions.reduce((acc, cat) => ({ ...acc, [cat.name]: cat.amount }), {}),
        },
        lopDays,
        lopAmount,
        overtimeHours,
        overtimeAmount,
        grossEarnings: totals.grossEarnings,
        totalDeductions: totals.totalDeductions,
        netPay: totals.netPay,
      };

      // Call API to generate PDF
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/salary-slips/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Organization-ID': localStorage.getItem('organizationId') || '',
        },
        body: JSON.stringify(payslipData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate payslip');
      }

      // Get the PDF blob from response
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `payslip_${userId}_${month}_${year}.pdf`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success("Payslip generated and downloaded successfully!");
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to generate payslip");
    } finally {
      setIsLoading(false);
    }
  };

  const totals = calculateTotals();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Generate Payslip
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {userName} - {new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Annual CTC: ₹{userCTC.toLocaleString('en-IN')} | Monthly: ₹{(userCTC / 12).toLocaleString('en-IN')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Earnings Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b pb-2">
                Earnings
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={addCustomEarning}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Category
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Basic Salary */}
              <div className={`space-y-2 p-3 rounded-lg border transition-all ${getFieldHighlightClass('basic')}`}>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Basic Salary
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={basicSalary}
                    onChange={(e) => {
                      setBasicSalary(parseFloat(e.target.value) || 0);
                      setTimeout(recalculateFromBasicAmount, 100);
                      setHighlightedField('basic');
                    }}
                    placeholder="Basic Salary"
                    className="flex-1"
                  />
                  <div className="flex items-center gap-1 min-w-[120px]">
                    <Input
                      type="number"
                      value={basicPercentage.toFixed(2)}
                      onChange={(e) => {
                        setBasicPercentage(parseFloat(e.target.value) || 0);
                        setTimeout(recalculateFromBasicPercentage, 100);
                        setHighlightedField('basic');
                      }}
                      placeholder="%"
                      className="w-20"
                    />
                    <span className="text-sm text-gray-500">% of CTC</span>
                  </div>
                </div>
              </div>

              {/* HRA */}
              <div className={`space-y-2 p-3 rounded-lg border transition-all ${getFieldHighlightClass('hra')}`}>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  House Rent Allowance (HRA)
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={hra}
                    onChange={(e) => {
                      setHra(parseFloat(e.target.value) || 0);
                      setHighlightedField('hra');
                    }}
                    placeholder="HRA"
                    className="flex-1"
                  />
                  <div className="flex items-center gap-1 min-w-[120px]">
                    <Input
                      type="number"
                      value={hraPercentage}
                      onChange={(e) => {
                        setHraPercentage(parseFloat(e.target.value) || 0);
                        setTimeout(recalculateHRA, 100);
                        setHighlightedField('hra');
                      }}
                      placeholder="% of Basic"
                      className="w-20"
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                </div>
              </div>

              {/* Special Allowance */}
              <div className={`space-y-2 p-3 rounded-lg border transition-all ${getFieldHighlightClass('special')}`}>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Special Allowance
                </label>
                <Input
                  type="number"
                  value={specialAllowance}
                  onChange={(e) => {
                    setSpecialAllowance(parseFloat(e.target.value) || 0);
                    setHighlightedField('special');
                  }}
                  placeholder="Special Allowance"
                />
              </div>

              {/* Other Allowances */}
              <div className={`space-y-2 p-3 rounded-lg border transition-all ${getFieldHighlightClass('other')}`}>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Other Allowances
                </label>
                <Input
                  type="number"
                  value={otherAllowances}
                  onChange={(e) => {
                    setOtherAllowances(parseFloat(e.target.value) || 0);
                    setHighlightedField('other');
                  }}
                  placeholder="Other Allowances"
                />
              </div>
            </div>

            {/* Custom Earnings */}
            {customEarnings.map((category) => (
              <div key={category.id} className={`space-y-2 p-3 rounded-lg border transition-all ${getFieldHighlightClass(category.id)}`}>
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {category.name}
                  </label>
                  <button
                    onClick={() => removeCustomEarning(category.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={category.name}
                    onChange={(e) => updateCustomEarning(category.id, 'name', e.target.value)}
                    placeholder="Category Name"
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={category.amount}
                    onChange={(e) => {
                      updateCustomEarning(category.id, 'amount', parseFloat(e.target.value) || 0);
                      setHighlightedField(category.id);
                    }}
                    placeholder="Amount"
                    className="w-32"
                  />
                </div>
              </div>
            ))}

            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-md">
              <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                Gross Earnings: ₹{totals.grossEarnings.toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          {/* Deductions Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b pb-2">
                Deductions
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={addCustomDeduction}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Category
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Provident Fund */}
              <div className={`space-y-2 p-3 rounded-lg border transition-all ${getFieldHighlightClass('pf')}`}>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Provident Fund (PF)
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={pf}
                    onChange={(e) => {
                      setPf(parseFloat(e.target.value) || 0);
                      setHighlightedField('pf');
                    }}
                    placeholder="PF Amount"
                    className="flex-1"
                  />
                  <div className="flex items-center gap-1 min-w-[120px]">
                    <Input
                      type="number"
                      value={pfPercentage}
                      onChange={(e) => {
                        setPfPercentage(parseFloat(e.target.value) || 0);
                        setTimeout(recalculatePF, 100);
                        setHighlightedField('pf');
                      }}
                      placeholder="% of Basic"
                      className="w-20"
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500">Employee contribution to Provident Fund</p>
              </div>

              {/* ESI */}
              <div className={`space-y-2 p-3 rounded-lg border transition-all ${getFieldHighlightClass('esi')}`}>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Employee State Insurance (ESI)
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={esi}
                    onChange={(e) => {
                      setEsi(parseFloat(e.target.value) || 0);
                      setHighlightedField('esi');
                    }}
                    placeholder="ESI Amount"
                    className="flex-1"
                  />
                  <div className="flex items-center gap-1 min-w-[120px]">
                    <Input
                      type="number"
                      value={esiPercentage}
                      onChange={(e) => setEsiPercentage(parseFloat(e.target.value) || 0)}
                      placeholder="%"
                      className="w-20"
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500">Employee State Insurance contribution</p>
              </div>

              {/* Professional Tax */}
              <div className={`space-y-2 p-3 rounded-lg border transition-all ${getFieldHighlightClass('professionalTax')}`}>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Professional Tax
                </label>
                <Input
                  type="number"
                  value={professionalTax}
                  onChange={(e) => {
                    setProfessionalTax(parseFloat(e.target.value) || 0);
                    setHighlightedField('professionalTax');
                  }}
                  placeholder="Professional Tax"
                />
                <p className="text-xs text-gray-500">State-wise professional tax deduction</p>
              </div>

              {/* TDS */}
              <div className={`space-y-2 p-3 rounded-lg border transition-all ${getFieldHighlightClass('tds')}`}>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tax Deducted at Source (TDS)
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={tds}
                    onChange={(e) => {
                      setTds(parseFloat(e.target.value) || 0);
                      setHighlightedField('tds');
                    }}
                    placeholder="TDS Amount"
                    className="flex-1"
                  />
                  <div className="flex items-center gap-1 min-w-[120px]">
                    <Input
                      type="number"
                      value={tdsPercentage}
                      onChange={(e) => setTdsPercentage(parseFloat(e.target.value) || 0)}
                      placeholder="%"
                      className="w-20"
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500">Income tax deducted at source</p>
              </div>

              {/* Other Deductions */}
              <div className={`space-y-2 p-3 rounded-lg border transition-all ${getFieldHighlightClass('otherDeductions')}`}>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Other Deductions
                </label>
                <Input
                  type="number"
                  value={otherDeductions}
                  onChange={(e) => {
                    setOtherDeductions(parseFloat(e.target.value) || 0);
                    setHighlightedField('otherDeductions');
                  }}
                  placeholder="Other Deductions"
                />
                <p className="text-xs text-gray-500">Any other miscellaneous deductions</p>
              </div>
            </div>

            {/* Custom Deductions */}
            {customDeductions.map((category) => (
              <div key={category.id} className={`space-y-2 p-3 rounded-lg border transition-all ${getFieldHighlightClass(category.id)}`}>
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {category.name}
                  </label>
                  <button
                    onClick={() => removeCustomDeduction(category.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={category.name}
                    onChange={(e) => updateCustomDeduction(category.id, 'name', e.target.value)}
                    placeholder="Category Name"
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={category.amount}
                    onChange={(e) => {
                      updateCustomDeduction(category.id, 'amount', parseFloat(e.target.value) || 0);
                      setHighlightedField(category.id);
                    }}
                    placeholder="Amount"
                    className="w-32"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* LOP Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b pb-2">
              Loss of Pay (LOP)
            </h3>
            
            {/* Show fixed amount input if method is FIXED_AMOUNT */}
            {companySettings?.lop?.calculationMethod === 'FIXED_AMOUNT' && (
              <div className={`space-y-2 p-3 rounded-lg border transition-all ${getFieldHighlightClass('lopFixedAmountPerDay')}`}>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Fixed Amount per Day (₹)
                </label>
                <Input
                  type="number"
                  value={lopFixedAmountPerDay}
                  onChange={(e) => {
                    const fixedAmount = parseFloat(e.target.value) || 1000;
                    setLopFixedAmountPerDay(fixedAmount);
                    // Recalculate LOP amount based on fixed amount
                    if (lopDays > 0) {
                      setLopAmount(lopDays * fixedAmount);
                    }
                    setHighlightedField('lopFixedAmountPerDay');
                  }}
                  placeholder="Fixed amount per day"
                  min="0"
                  step="1"
                />
                <p className="text-xs text-gray-500">Amount to deduct per LOP day</p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`space-y-2 p-3 rounded-lg border transition-all ${getFieldHighlightClass('lopDays')}`}>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  LOP Days
                </label>
                <Input
                  type="number"
                  value={lopDays}
                  onChange={(e) => {
                    const days = parseFloat(e.target.value) || 0;
                    setLopDays(days);
                    // Auto-calculate LOP amount based on method
                    if (companySettings?.lop?.calculationMethod === 'FIXED_AMOUNT') {
                      // Fixed amount method
                      setLopAmount(days * lopFixedAmountPerDay);
                    } else if (companySettings?.lop?.calculationMethod === 'BASIC_BY_DAYS') {
                      // Basic by days method
                      const daysInMonth = companySettings?.lop?.defaultDaysInMonth || 30;
                      const perDayBasic = basicSalary / daysInMonth;
                      setLopAmount(days * perDayBasic);
                    } else {
                      // Default: NET_PAY_BY_DAYS
                      const daysInMonth = companySettings?.lop?.defaultDaysInMonth || 30;
                      const netPay = totals.grossEarnings - (pf + esi + professionalTax + tds + otherDeductions);
                      const perDaySalary = netPay / daysInMonth;
                      setLopAmount(days * perDaySalary);
                    }
                    setHighlightedField('lopDays');
                  }}
                  placeholder="Number of LOP days"
                />
                <p className="text-xs text-gray-500">Number of days without pay</p>
              </div>

              <div className={`space-y-2 p-3 rounded-lg border transition-all ${getFieldHighlightClass('lopAmount')}`}>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  LOP Amount
                </label>
                <Input
                  type="number"
                  value={lopAmount}
                  onChange={(e) => {
                    setLopAmount(parseFloat(e.target.value) || 0);
                    setHighlightedField('lopAmount');
                  }}
                  placeholder="LOP Amount"
                />
                <p className="text-xs text-gray-500">Amount deducted for LOP days</p>
              </div>
            </div>
          </div>

          {/* Overtime Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b pb-2">
              Overtime Hours Pay
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`space-y-2 p-3 rounded-lg border transition-all ${getFieldHighlightClass('overtimeHours')}`}>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Overtime Hours
                </label>
                <Input
                  type="number"
                  value={overtimeHours}
                  onChange={(e) => {
                    const hours = parseFloat(e.target.value) || 0;
                    setOvertimeHours(hours);
                    setHighlightedField('overtimeHours');
                    // Trigger recalculation
                    setTimeout(() => {
                      const totals = calculateTotals();
                      // totals already includes overtime calculation
                    }, 0);
                  }}
                  placeholder="Number of overtime hours"
                  min="0"
                  step="0.5"
                />
                <p className="text-xs text-gray-500">Number of overtime hours worked</p>
              </div>

              <div className={`space-y-2 p-3 rounded-lg border transition-all ${getFieldHighlightClass('overtimeAmount')}`}>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Overtime Amount
                </label>
                <Input
                  type="number"
                  value={overtimeAmount}
                  onChange={(e) => {
                    setOvertimeAmount(parseFloat(e.target.value) || 0);
                    setHighlightedField('overtimeAmount');
                  }}
                  placeholder="Overtime Amount"
                  min="0"
                />
                <p className="text-xs text-gray-500">
                  {companySettings?.overtime?.calculationMethod === 'FIXED_RATE_PER_HOUR'
                    ? `Calculated: ₹${(companySettings?.overtime?.multiplier || 100).toLocaleString('en-IN')} per hour`
                    : `Calculated based on ${companySettings?.overtime?.calculationMethod || 'default'} method`}
                </p>
              </div>
            </div>
          </div>

          {/* Totals Summary */}
          <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Gross Earnings:</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">₹{totals.grossEarnings.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Deductions:</span>
              <span className="text-sm font-semibold text-red-600 dark:text-red-400">₹{totals.totalDeductions.toLocaleString('en-IN')}</span>
            </div>
            <div className="border-t border-gray-300 dark:border-gray-600 pt-2 flex justify-between">
              <span className="text-base font-bold text-gray-900 dark:text-white">Net Pay:</span>
              <span className="text-base font-bold text-green-600 dark:text-green-400">₹{totals.netPay.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGeneratePayslip}
            loading={isLoading}
            disabled={true}
          >
            Generate Payslip PDF
          </Button>
        </div>
      </div>
    </div>
  );
}

