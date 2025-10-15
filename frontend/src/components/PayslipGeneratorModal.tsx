"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import Button from "./ui/Button";
import Input from "./ui/Input";
import { toast } from "sonner";
import { computePayslipFromCTC } from "@/lib/payroll";
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

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserDataAndCalculate();
    }
  }, [isOpen, userId]);

  const fetchUserDataAndCalculate = async () => {
    try {
      const userData = await getUser(userId);
      const ctc = parseFloat(userData.data.ctc || "0") || 0;
      setUserCTC(ctc);
      
      // Calculate initial breakdown
      const breakdown = computePayslipFromCTC(ctc, companySettings);
      
      // Set earnings
      setBasicSalary(breakdown.earnings.basic);
      setHra(breakdown.earnings.hra);
      setSpecialAllowance(breakdown.earnings.special);
      setOtherAllowances(breakdown.earnings.medical + breakdown.earnings.conveyance + breakdown.earnings.lta);
      
      // Set deductions
      setPf(breakdown.deductions.empPF);
      setEsi(breakdown.deductions.esi);
      setProfessionalTax(breakdown.deductions.professionalTax);
      setTds(breakdown.deductions.tds);
      setOtherDeductions(0);
      
      // Set percentages from company settings
      if (companySettings) {
        setBasicPercentage(companySettings.basicSalaryPercentage || 40);
        setHraPercentage(companySettings.hraPercentage || 50);
        setPfPercentage(companySettings.pfPercentage || 12);
        setEsiPercentage(companySettings.esiPercentage || 0.75);
        setTdsPercentage(companySettings.tdsPercentage || 0);
      }
    } catch (error) {
      toast.error("Failed to fetch user data");
    }
  };

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
    const grossEarnings = basicSalary + hra + specialAllowance + otherAllowances;
    const totalDeductions = pf + esi + professionalTax + tds + otherDeductions + lopAmount;
    const netPay = grossEarnings - totalDeductions;
    
    return {
      grossEarnings,
      totalDeductions,
      netPay,
    };
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
        },
        deductions: {
          pf,
          esi,
          professionalTax,
          tds,
          other: otherDeductions,
        },
        lopDays,
        lopAmount,
        grossEarnings: totals.grossEarnings,
        totalDeductions: totals.totalDeductions,
        netPay: totals.netPay,
      };

      // Call API to generate PDF
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/payslips/generate`, {
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

      const data = await response.json();
      
      // Open the generated PDF
      if (data.fileUrl) {
        window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${data.fileUrl}`, '_blank');
      }
      
      toast.success("Payslip generated successfully!");
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b pb-2">
              Earnings
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Basic Salary */}
              <div className="space-y-2">
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
                    }}
                    placeholder="Basic Salary"
                  />
                  <div className="flex items-center gap-1 min-w-[120px]">
                    <Input
                      type="number"
                      value={basicPercentage.toFixed(2)}
                      onChange={(e) => {
                        setBasicPercentage(parseFloat(e.target.value) || 0);
                        setTimeout(recalculateFromBasicPercentage, 100);
                      }}
                      placeholder="%"
                      className="w-20"
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                </div>
              </div>

              {/* HRA */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  House Rent Allowance (HRA)
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={hra}
                    onChange={(e) => setHra(parseFloat(e.target.value) || 0)}
                    placeholder="HRA"
                  />
                  <div className="flex items-center gap-1 min-w-[120px]">
                    <Input
                      type="number"
                      value={hraPercentage}
                      onChange={(e) => {
                        setHraPercentage(parseFloat(e.target.value) || 0);
                        setTimeout(recalculateHRA, 100);
                      }}
                      placeholder="% of Basic"
                      className="w-20"
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                </div>
              </div>

              {/* Special Allowance */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Special Allowance
                </label>
                <Input
                  type="number"
                  value={specialAllowance}
                  onChange={(e) => setSpecialAllowance(parseFloat(e.target.value) || 0)}
                  placeholder="Special Allowance"
                />
              </div>

              {/* Other Allowances */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Other Allowances
                </label>
                <Input
                  type="number"
                  value={otherAllowances}
                  onChange={(e) => setOtherAllowances(parseFloat(e.target.value) || 0)}
                  placeholder="Other Allowances"
                />
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-md">
              <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                Gross Earnings: ₹{totals.grossEarnings.toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          {/* Deductions Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b pb-2">
              Deductions
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* PF */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Provident Fund (PF)
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={pf}
                    onChange={(e) => setPf(parseFloat(e.target.value) || 0)}
                    placeholder="PF"
                  />
                  <div className="flex items-center gap-1 min-w-[120px]">
                    <Input
                      type="number"
                      value={pfPercentage}
                      onChange={(e) => {
                        setPfPercentage(parseFloat(e.target.value) || 0);
                        setTimeout(recalculatePF, 100);
                      }}
                      placeholder="% of Basic"
                      className="w-20"
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                </div>
              </div>

              {/* ESI */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Employee State Insurance (ESI)
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={esi}
                    onChange={(e) => setEsi(parseFloat(e.target.value) || 0)}
                    placeholder="ESI"
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
              </div>

              {/* Professional Tax */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Professional Tax
                </label>
                <Input
                  type="number"
                  value={professionalTax}
                  onChange={(e) => setProfessionalTax(parseFloat(e.target.value) || 0)}
                  placeholder="Professional Tax"
                />
              </div>

              {/* TDS */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tax Deducted at Source (TDS)
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={tds}
                    onChange={(e) => setTds(parseFloat(e.target.value) || 0)}
                    placeholder="TDS"
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
              </div>

              {/* Other Deductions */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Other Deductions
                </label>
                <Input
                  type="number"
                  value={otherDeductions}
                  onChange={(e) => setOtherDeductions(parseFloat(e.target.value) || 0)}
                  placeholder="Other Deductions"
                />
              </div>
            </div>
          </div>

          {/* LOP Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b pb-2">
              Loss of Pay (LOP)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  LOP Days
                </label>
                <Input
                  type="number"
                  value={lopDays}
                  onChange={(e) => {
                    const days = parseFloat(e.target.value) || 0;
                    setLopDays(days);
                    // Auto-calculate LOP amount
                    const perDaySalary = totals.grossEarnings / 30;
                    setLopAmount(days * perDaySalary);
                  }}
                  placeholder="Number of LOP days"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  LOP Amount
                </label>
                <Input
                  type="number"
                  value={lopAmount}
                  onChange={(e) => setLopAmount(parseFloat(e.target.value) || 0)}
                  placeholder="LOP Amount"
                />
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
          >
            Generate Payslip PDF
          </Button>
        </div>
      </div>
    </div>
  );
}

