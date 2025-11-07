export type PayrollMode = 'PERCENT_OF_CTC' | 'PERCENT_OF_BASIC' | 'FIXED_MONTHLY' | 'FIXED_YEARLY' | 'REMAINDER' | 'FIXED'; // FIXED is legacy, treated as FIXED_MONTHLY

export interface ComponentSetting {
  mode: PayrollMode;
  value?: number; // percent or fixed amount depending on mode
}

export interface EmployeeDeductionsSettings {
  employeePF: ComponentSetting & { capAt1800?: boolean };
  professionalTax: ComponentSetting; // fixed or percent-based
  esi: ComponentSetting; // fixed or percent-based
  esiEnabled: boolean; // toggle visibility/applicability
}

export type ConditionType = 'CTC_RANGE' | 'DEPARTMENT' | 'DESIGNATION';

export interface CategoryCondition {
  type: ConditionType;
  // For CTC_RANGE
  ctcMin?: number; // Minimum CTC (greater than or equal)
  ctcMax?: number; // Maximum CTC (less than or equal)
  // For DEPARTMENT
  departments?: string[]; // Array of department names
  // For DESIGNATION - supports both single and multiple designations
  designations?: string[]; // Array of designation names (can be single or multiple)
  // Backward compatibility: old DESIGNATION_SPECIFIC format (single designation string)
  designation?: string; // Legacy single designation field (deprecated, use designations array)
}

export interface EmployerPFField {
  id: string;
  label: string;
  value: number;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT';
  unit?: string; // Optional unit label
}

export interface EmployerPFSettings {
  employerPFPercentOfBasic: number; // 12 (deprecated, use fields)
  epsPercentOfBasic: number; // 8.33 (deprecated, use fields)
  epsCap: number; // 1250 (deprecated, use fields)
  enabled?: boolean; // Enable/disable employer PF
  fields?: EmployerPFField[]; // Dynamic fields configuration
  // Conditional categories with flexible conditions
  conditionalEarnings?: Array<{
    key: string;
    label: string;
    condition: CategoryCondition;
    mode: PayrollMode;
    value?: number;
  }>;
  conditionalDeductions?: Array<{
    key: string;
    label: string;
    condition: CategoryCondition;
    mode: PayrollMode;
    value?: number;
  }>;
}

export interface PayrollSettings {
  earnings: {
    basic: ComponentSetting;
    hra: ComponentSetting;
    medical: ComponentSetting;
    conveyance: ComponentSetting;
    lta: ComponentSetting;
    specialAllowance: ComponentSetting; // typically REMAINDER
    // Dynamic categories
    [key: string]: ComponentSetting;
  };
  deductions: EmployeeDeductionsSettings & {
    // Dynamic categories
    [key: string]: ComponentSetting | any;
  };
  employerPF: EmployerPFSettings; // Employer PF configuration
  lop: {
    calculationMethod: 'NET_PAY_BY_DAYS' | 'BASIC_BY_DAYS' | 'FIXED_AMOUNT';
    defaultDaysInMonth: number; // default 30 or 31
  };
  overtime: {
    calculationMethod: 'HOURLY_RATE_BY_BASIC' | 'HOURLY_RATE_BY_NET_PAY' | 'FIXED_RATE_PER_HOUR' | 'DOUBLE_RATE';
    hoursPerDay?: number; // Default working hours per day (default 8)
    multiplier?: number; // Multiplier for overtime (default 1.5 for 1.5x rate)
  };
  // Dynamic category definitions
  customEarnings?: Array<{ key: string; label: string; mode: PayrollMode; value?: number }>;
  customDeductions?: Array<{ key: string; label: string; mode: PayrollMode; value?: number }>;
}

export interface PayslipBreakdown {
  monthlyCTC: number;
  earnings: {
    basic: number;
    hra: number;
    medical: number;
    conveyance: number;
    lta: number;
    special: number;
    overtime?: number; // Overtime pay
  };
  employer: {
    totalPF: number; // 12% of basic
    eps: number; // min(8.33% of basic, 1250)
    epf: number; // totalPF - eps
  };
  deductions: {
    empPF: number; // mirrors 12% of basic (cap optional on employee side?)
    professionalTax: number;
    esi: number;
    tds: number; // monthly TDS (yearly override / 12)
    lop?: number; // Loss of Pay amount (for live preview only)
  };
  totals: {
    totalEarnings: number;
    totalDeductions: number;
    netPay: number;
  };
}

export interface ComputeContext {
  month?: number;
  workingDays?: number; // default 30
  lopDays?: number; // leave without pay
  tdsOverride?: number; // optional TDS deduction
  overtimeHours?: number; // overtime hours worked
}

export const defaultPayrollSettings: PayrollSettings = {
  earnings: {
    basic: { mode: 'PERCENT_OF_CTC', value: 50 },
    hra: { mode: 'PERCENT_OF_BASIC', value: 30 },
    medical: { mode: 'FIXED_MONTHLY', value: 1250 },
    conveyance: { mode: 'FIXED_MONTHLY', value: 800 },
    lta: { mode: 'PERCENT_OF_BASIC', value: 15 },
    specialAllowance: { mode: 'REMAINDER' },
  },
  deductions: {
    employeePF: { mode: 'PERCENT_OF_BASIC', value: 12, capAt1800: false },
    professionalTax: { mode: 'FIXED_MONTHLY', value: 200 },
    esi: { mode: 'FIXED_MONTHLY', value: 0 },
    esiEnabled: false,
  },
  employerPF: {
    employerPFPercentOfBasic: 12,
    epsPercentOfBasic: 8.33,
    epsCap: 1250,
    enabled: true,
    fields: [],
    conditionalEarnings: [],
    conditionalDeductions: [],
  },
  lop: {
    calculationMethod: 'NET_PAY_BY_DAYS',
    defaultDaysInMonth: 30,
  },
  overtime: {
    calculationMethod: 'HOURLY_RATE_BY_BASIC',
    hoursPerDay: 8,
    multiplier: 1.5, // 1.5x rate for overtime
  },
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calculateLOPAmount(
  lopDays: number,
  netPay: number,
  basicSalary: number,
  settings: PayrollSettings
): number {
  if (lopDays <= 0) return 0;
  
  const daysInMonth = settings.lop.defaultDaysInMonth;
  
  switch (settings.lop.calculationMethod) {
    case 'NET_PAY_BY_DAYS':
      return round2((netPay / daysInMonth) * lopDays);
    case 'BASIC_BY_DAYS':
      return round2((basicSalary / daysInMonth) * lopDays);
    case 'FIXED_AMOUNT':
      return round2(lopDays * 1000); // Default fixed amount per day
    default:
      return round2((netPay / daysInMonth) * lopDays);
  }
}

export function calculateOvertimePay(
  overtimeHours: number,
  netPay: number,
  basicSalary: number,
  settings: PayrollSettings
): number {
  if (overtimeHours <= 0) return 0;
  
  const hoursPerDay = settings.overtime?.hoursPerDay || 8;
  const multiplier = settings.overtime?.multiplier || 1.5;
  const daysInMonth = settings.lop.defaultDaysInMonth;
  
  switch (settings.overtime?.calculationMethod) {
    case 'HOURLY_RATE_BY_BASIC':
      // Calculate hourly rate from basic salary
      const dailyBasic = basicSalary / daysInMonth;
      const hourlyRateFromBasic = dailyBasic / hoursPerDay;
      return round2(overtimeHours * hourlyRateFromBasic * multiplier);
      
    case 'HOURLY_RATE_BY_NET_PAY':
      // Calculate hourly rate from net pay
      const dailyNetPay = netPay / daysInMonth;
      const hourlyRateFromNetPay = dailyNetPay / hoursPerDay;
      return round2(overtimeHours * hourlyRateFromNetPay * multiplier);
      
    case 'FIXED_RATE_PER_HOUR':
      // Use a fixed rate per hour (stored in multiplier as the rate)
      return round2(overtimeHours * (settings.overtime?.multiplier || 100));
      
    case 'DOUBLE_RATE':
      // Double the regular hourly rate
      const dailyBasic2 = basicSalary / daysInMonth;
      const hourlyRate2 = dailyBasic2 / hoursPerDay;
      return round2(overtimeHours * hourlyRate2 * 2);
      
    default:
      // Default: Use basic salary hourly rate with 1.5x multiplier
      const dailyBasicDefault = basicSalary / daysInMonth;
      const hourlyRateDefault = dailyBasicDefault / hoursPerDay;
      return round2(overtimeHours * hourlyRateDefault * 1.5);
  }
}

export function computePayslipFromCTC(annualCTC: number, settings: PayrollSettings, ctx?: ComputeContext): PayslipBreakdown {
  const monthlyCTC = round2(annualCTC / 12);
  const workingDays = ctx?.workingDays ?? 30;
  const lopDays = ctx?.lopDays ?? 0;
  const proration = Math.max(0, Math.min(1, (workingDays - lopDays) / workingDays));

  // Earnings
  const basic = settings.earnings.basic.mode === 'PERCENT_OF_CTC'
    ? round2(monthlyCTC * (settings.earnings.basic.value || 0) / 100)
    : settings.earnings.basic.mode === 'FIXED_MONTHLY' || settings.earnings.basic.mode === 'FIXED'
      ? round2(settings.earnings.basic.value || 0)
      : settings.earnings.basic.mode === 'FIXED_YEARLY'
        ? round2((settings.earnings.basic.value || 0) / 12)
        : 0; // other modes for basic not used in defaults

  // Helper functions for percentage calculations
  const pctOfBasic = (pct?: number) => round2(basic * ((pct || 0) / 100));
  const pctOfCTC = (pct?: number) => round2(monthlyCTC * ((pct || 0) / 100));

  const getFixedValue = (mode: PayrollMode, value?: number): number => {
    if (mode === 'FIXED_MONTHLY' || mode === 'FIXED') {
      return round2(value || 0);
    } else if (mode === 'FIXED_YEARLY') {
      return round2((value || 0) / 12);
    }
    return 0;
  };

  const hra = settings.earnings.hra.mode === 'PERCENT_OF_BASIC' ? pctOfBasic(settings.earnings.hra.value) :
              settings.earnings.hra.mode === 'PERCENT_OF_CTC' ? pctOfCTC(settings.earnings.hra.value) :
              getFixedValue(settings.earnings.hra.mode, settings.earnings.hra.value);
  const medical = settings.earnings.medical.mode === 'FIXED_MONTHLY' || settings.earnings.medical.mode === 'FIXED' || settings.earnings.medical.mode === 'FIXED_YEARLY'
    ? getFixedValue(settings.earnings.medical.mode, settings.earnings.medical.value)
    : settings.earnings.medical.mode === 'PERCENT_OF_BASIC' ? pctOfBasic(settings.earnings.medical.value) :
      settings.earnings.medical.mode === 'PERCENT_OF_CTC' ? pctOfCTC(settings.earnings.medical.value) : 0;
  const conveyance = settings.earnings.conveyance.mode === 'FIXED_MONTHLY' || settings.earnings.conveyance.mode === 'FIXED' || settings.earnings.conveyance.mode === 'FIXED_YEARLY'
    ? getFixedValue(settings.earnings.conveyance.mode, settings.earnings.conveyance.value)
    : settings.earnings.conveyance.mode === 'PERCENT_OF_BASIC' ? pctOfBasic(settings.earnings.conveyance.value) :
      settings.earnings.conveyance.mode === 'PERCENT_OF_CTC' ? pctOfCTC(settings.earnings.conveyance.value) : 0;
  const lta = settings.earnings.lta.mode === 'PERCENT_OF_BASIC' ? pctOfBasic(settings.earnings.lta.value) :
              settings.earnings.lta.mode === 'PERCENT_OF_CTC' ? pctOfCTC(settings.earnings.lta.value) :
              getFixedValue(settings.earnings.lta.mode, settings.earnings.lta.value);

  // Apply proration to proratable earnings ONLY if LOP is NOT being calculated as separate deduction
  // If LOP will be calculated separately, don't prorate earnings (earnings stay full, LOP deducted separately)
  // If LOP is handled via proration only, don't calculate separate LOP deduction
  const shouldProrate = ctx?.lopDays ? false : true; // If LOP days provided, use separate deduction instead of proration
  
  const proratedBasic = shouldProrate ? round2(basic * proration) : basic;
  const proratedHra = shouldProrate ? round2(hra * proration) : hra;
  const proratedLta = shouldProrate ? round2(lta * proration) : lta;
  // Keep fixed ones as is (they're typically not prorated)
  const effBasic = proratedBasic;
  const effHra = proratedHra;
  const effMedical = medical;
  const effConveyance = conveyance;
  const effLta = proratedLta;

  // Helper function for percentage of effective basic (after proration)
  // This is used for deductions that should be proportional to actual earnings
  const pctOfEffBasic = (pct?: number) => round2(effBasic * ((pct || 0) / 100));

  // Employer PF (part of CTC):
  const employerPFTotal = round2(effBasic * (settings.employerPF.employerPFPercentOfBasic / 100));
  const eps = round2(Math.min(round2(effBasic * (settings.employerPF.epsPercentOfBasic / 100)), settings.employerPF.epsCap));
  const epf = round2(Math.max(employerPFTotal - eps, 0));

  // Special as remainder so that Earnings + Employer PF = Monthly CTC
  // Note: When there's LOP, we still use full monthlyCTC for special calculation
  // because LOP is handled as a separate deduction, not through proration
  const earningsExceptSpecial = round2(effBasic + effHra + effMedical + effConveyance + effLta);
  const special = round2(Math.max(monthlyCTC - employerPFTotal - earningsExceptSpecial, 0));

  // Employee deductions
  // Employee PF should be calculated on effective (prorated) basic when proration is used
  // When LOP is separate deduction, use full basic for PF calculation
  let empPF = round2(effBasic * ((settings.deductions.employeePF.value || 0) / 100));
  // Removed capAt1800 - no cap applied
  const computeByMode = (c: ComponentSetting): number => {
    if (!c) return 0;
    switch (c.mode) {
      case 'PERCENT_OF_BASIC': 
        // Use effective basic (prorated if proration applied) for deductions
        // This ensures deductions are proportional to actual earnings
        return pctOfEffBasic(c.value);
      case 'PERCENT_OF_CTC': return pctOfCTC(c.value);
      case 'FIXED_MONTHLY':
      case 'FIXED': // backward compatibility - treat old FIXED as FIXED_MONTHLY
        return round2(c.value || 0);
      case 'FIXED_YEARLY':
        return round2((c.value || 0) / 12);
      case 'REMAINDER': return 0;
      default: return 0;
    }
  };

  const professionalTax = computeByMode(settings.deductions.professionalTax);
  const esi = settings.deductions.esiEnabled ? computeByMode(settings.deductions.esi) : 0;

  const totalEarningsBase = round2(earningsExceptSpecial + special);
  
  // Calculate overtime pay if overtime hours provided
  let overtimePay = 0;
  if (ctx?.overtimeHours && ctx.overtimeHours > 0) {
    // Calculate net pay first for overtime calculation
    const tdsForOvertime = round2((ctx?.tdsOverride || 0) / 12);
    const totalDeductionsForOvertime = round2(empPF + professionalTax + esi + tdsForOvertime);
    const netPayForOvertime = round2(totalEarningsBase - totalDeductionsForOvertime);
    overtimePay = calculateOvertimePay(ctx.overtimeHours, netPayForOvertime, effBasic, settings);
  }
  
  const totalEarnings = round2(totalEarningsBase + overtimePay);
  
  // TDS override is yearly, so divide by 12 for monthly calculation
  const tds = round2((ctx?.tdsOverride || 0) / 12);
  
  // Calculate LOP amount if LOP days provided (for live preview only)
  let lopAmount = 0;
  if (ctx?.lopDays && ctx.lopDays > 0) {
    // Calculate net pay before LOP for LOP calculation
    const totalDeductionsBeforeLOP = round2(empPF + professionalTax + esi + tds);
    const netPayBeforeLOP = round2(totalEarnings - totalDeductionsBeforeLOP);
    lopAmount = calculateLOPAmount(ctx.lopDays, netPayBeforeLOP, effBasic, settings);
  }
  
  const totalDeductions = round2(empPF + professionalTax + esi + tds + lopAmount);
  const netPay = round2(totalEarnings - totalDeductions);

  return {
    monthlyCTC,
    earnings: { 
      basic: effBasic, 
      hra: effHra, 
      medical: effMedical, 
      conveyance: effConveyance, 
      lta: effLta, 
      special,
      overtime: overtimePay,
    },
    employer: { totalPF: employerPFTotal, eps, epf },
    deductions: { empPF, professionalTax, esi, tds, lop: lopAmount },
    totals: { totalEarnings, totalDeductions, netPay },
  };
}


