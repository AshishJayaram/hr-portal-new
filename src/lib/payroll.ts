export type PayrollMode = 'PERCENT_OF_CTC' | 'PERCENT_OF_BASIC' | 'FIXED' | 'REMAINDER';

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

export interface EmployerPFSettingsReadOnly {
  employerPFPercentOfBasic: number; // 12
  epsPercentOfBasic: number; // 8.33
  epsCap: number; // 1250
}

export interface PayrollSettings {
  earnings: {
    basic: ComponentSetting;
    hra: ComponentSetting;
    medical: ComponentSetting;
    conveyance: ComponentSetting;
    lta: ComponentSetting;
    specialAllowance: ComponentSetting; // typically REMAINDER
  };
  deductions: EmployeeDeductionsSettings;
  employerPF: EmployerPFSettingsReadOnly; // read-only config for display
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
}

export const defaultPayrollSettings: PayrollSettings = {
  earnings: {
    basic: { mode: 'PERCENT_OF_CTC', value: 50 },
    hra: { mode: 'PERCENT_OF_BASIC', value: 30 },
    medical: { mode: 'FIXED', value: 1250 },
    conveyance: { mode: 'FIXED', value: 800 },
    lta: { mode: 'PERCENT_OF_BASIC', value: 15 },
    specialAllowance: { mode: 'REMAINDER' },
  },
  deductions: {
    employeePF: { mode: 'PERCENT_OF_BASIC', value: 12, capAt1800: false },
    professionalTax: { mode: 'FIXED', value: 200 },
    esi: { mode: 'FIXED', value: 0 },
    esiEnabled: false,
  },
  employerPF: {
    employerPFPercentOfBasic: 12,
    epsPercentOfBasic: 8.33,
    epsCap: 1250,
  },
};

function round2(n: number): number {
  return Math.round(n);
}

export function computePayslipFromCTC(annualCTC: number, settings: PayrollSettings, ctx?: ComputeContext): PayslipBreakdown {
  const monthlyCTC = Math.round(annualCTC / 12);
  const workingDays = ctx?.workingDays ?? 30;
  const lopDays = ctx?.lopDays ?? 0;
  const proration = Math.max(0, Math.min(1, (workingDays - lopDays) / workingDays));

  // Earnings
  const basic = settings.earnings.basic.mode === 'PERCENT_OF_CTC'
    ? round2(monthlyCTC * (settings.earnings.basic.value || 0) / 100)
    : settings.earnings.basic.mode === 'FIXED'
      ? round2(settings.earnings.basic.value || 0)
      : 0; // other modes for basic not used in defaults

  const pctOfBasic = (pct?: number) => round2(basic * ((pct || 0) / 100));
  const pctOfCTC = (pct?: number) => round2(monthlyCTC * ((pct || 0) / 100));

  const hra = settings.earnings.hra.mode === 'PERCENT_OF_BASIC' ? pctOfBasic(settings.earnings.hra.value) :
              settings.earnings.hra.mode === 'PERCENT_OF_CTC' ? pctOfCTC(settings.earnings.hra.value) :
              settings.earnings.hra.mode === 'FIXED' ? round2(settings.earnings.hra.value || 0) : 0;
  const medical = settings.earnings.medical.mode === 'FIXED' ? round2(settings.earnings.medical.value || 0) :
                  settings.earnings.medical.mode === 'PERCENT_OF_BASIC' ? pctOfBasic(settings.earnings.medical.value) :
                  settings.earnings.medical.mode === 'PERCENT_OF_CTC' ? pctOfCTC(settings.earnings.medical.value) : 0;
  const conveyance = settings.earnings.conveyance.mode === 'FIXED' ? round2(settings.earnings.conveyance.value || 0) :
                     settings.earnings.conveyance.mode === 'PERCENT_OF_BASIC' ? pctOfBasic(settings.earnings.conveyance.value) :
                     settings.earnings.conveyance.mode === 'PERCENT_OF_CTC' ? pctOfCTC(settings.earnings.conveyance.value) : 0;
  const lta = settings.earnings.lta.mode === 'PERCENT_OF_BASIC' ? pctOfBasic(settings.earnings.lta.value) :
              settings.earnings.lta.mode === 'PERCENT_OF_CTC' ? pctOfCTC(settings.earnings.lta.value) :
              settings.earnings.lta.mode === 'FIXED' ? round2(settings.earnings.lta.value || 0) : 0;

  // Apply proration to proratable earnings (assume all except fixed allowances are proratable)
  const proratedBasic = round2(basic * proration);
  const proratedHra = round2(hra * proration);
  const proratedLta = round2(lta * proration);
  // Keep fixed ones as is
  const effBasic = proratedBasic;
  const effHra = proratedHra;
  const effMedical = medical;
  const effConveyance = conveyance;
  const effLta = proratedLta;

  // Employer PF (part of CTC):
  const employerPFTotal = round2(effBasic * (settings.employerPF.employerPFPercentOfBasic / 100));
  const eps = Math.min(round2(effBasic * (settings.employerPF.epsPercentOfBasic / 100)), settings.employerPF.epsCap);
  const epf = Math.max(employerPFTotal - eps, 0);

  // Special as remainder so that Earnings + Employer PF = Monthly CTC
  const earningsExceptSpecial = effBasic + effHra + effMedical + effConveyance + effLta;
  const special = Math.max(monthlyCTC - employerPFTotal - earningsExceptSpecial, 0);

  // Employee deductions
  let empPF = round2(effBasic * ((settings.deductions.employeePF.value || 0) / 100));
  if (settings.deductions.employeePF.capAt1800) {
    empPF = Math.min(empPF, 1800);
  }
  const computeByMode = (c: ComponentSetting): number => {
    if (!c) return 0;
    switch (c.mode) {
      case 'PERCENT_OF_BASIC': return pctOfBasic(c.value);
      case 'PERCENT_OF_CTC': return pctOfCTC(c.value);
      case 'FIXED': return round2(c.value || 0);
      case 'REMAINDER': return 0;
      default: return 0;
    }
  };

  const professionalTax = computeByMode(settings.deductions.professionalTax);
  const esi = settings.deductions.esiEnabled ? computeByMode(settings.deductions.esi) : 0;

  const totalEarnings = earningsExceptSpecial + special;
  const tds = round2(ctx?.tdsOverride || 0);
  const totalDeductions = empPF + professionalTax + esi + tds;
  const netPay = totalEarnings - totalDeductions;

  return {
    monthlyCTC,
    earnings: { basic: effBasic, hra: effHra, medical: effMedical, conveyance: effConveyance, lta: effLta, special },
    employer: { totalPF: employerPFTotal, eps, epf },
    deductions: { empPF, professionalTax, esi },
    totals: { totalEarnings, totalDeductions, netPay },
  };
}


