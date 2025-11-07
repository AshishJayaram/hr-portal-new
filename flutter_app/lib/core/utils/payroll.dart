/// Payroll calculation utilities
class PayrollUtils {
  /// Round to 2 decimal places
  static double round2(double value) {
    return (value * 100).round() / 100.0;
  }

  /// Calculate percentage of basic salary
  static double percentOfBasic(double basic, double percent) {
    return round2(basic * (percent / 100));
  }

  /// Calculate percentage of CTC
  static double percentOfCTC(double ctc, double percent) {
    return round2(ctc * (percent / 100));
  }

  /// Compute component by mode
  static double computeByMode({
    required Map<String, dynamic>? component,
    required double basic,
    required double monthlyCTC,
  }) {
    if (component == null) return 0;
    
    final mode = component['mode'] as String?;
    final value = (component['value'] ?? 0) as num;
    
    switch (mode) {
      case 'PERCENT_OF_BASIC':
        return percentOfBasic(basic, value.toDouble());
      case 'PERCENT_OF_CTC':
        return percentOfCTC(monthlyCTC, value.toDouble());
      case 'FIXED':
        return round2(value.toDouble());
      default:
        return 0;
    }
  }

  /// Compute payslip breakdown from annual CTC
  static Map<String, dynamic> computePayslipFromCTC({
    required double annualCTC,
    required Map<String, dynamic> settings,
    double lopDays = 0,
    double tdsOverride = 0,
    int workingDays = 30,
  }) {
    final monthlyCTC = round2(annualCTC / 12);
    final proration = workingDays > 0 
        ? (workingDays - lopDays) / workingDays 
        : 1.0;
    final effectiveProration = proration.clamp(0.0, 1.0);

    // Get earnings settings
    final earningsSettings = settings['earnings'] as Map<String, dynamic>? ?? {};
    final basicSettings = earningsSettings['basic'] as Map<String, dynamic>? ?? {};
    final hraSettings = earningsSettings['hra'] as Map<String, dynamic>? ?? {};
    final medicalSettings = earningsSettings['medical'] as Map<String, dynamic>? ?? {};
    final conveyanceSettings = earningsSettings['conveyance'] as Map<String, dynamic>? ?? {};
    final ltaSettings = earningsSettings['lta'] as Map<String, dynamic>? ?? {};

    // Calculate Basic
    double basic = 0;
    if (basicSettings['mode'] == 'PERCENT_OF_CTC') {
      basic = percentOfCTC(monthlyCTC, (basicSettings['value'] ?? 0).toDouble());
    } else if (basicSettings['mode'] == 'FIXED') {
      basic = round2((basicSettings['value'] ?? 0).toDouble());
    }

    // Calculate HRA
    double hra = computeByMode(
      component: hraSettings,
      basic: basic,
      monthlyCTC: monthlyCTC,
    );

    // Calculate Medical
    double medical = computeByMode(
      component: medicalSettings,
      basic: basic,
      monthlyCTC: monthlyCTC,
    );

    // Calculate Conveyance
    double conveyance = computeByMode(
      component: conveyanceSettings,
      basic: basic,
      monthlyCTC: monthlyCTC,
    );

    // Calculate LTA
    double lta = computeByMode(
      component: ltaSettings,
      basic: basic,
      monthlyCTC: monthlyCTC,
    );

    // Apply proration
    final proratedBasic = round2(basic * effectiveProration);
    final proratedHra = round2(hra * effectiveProration);
    final proratedLta = round2(lta * effectiveProration);
    final effBasic = proratedBasic;
    final effHra = proratedHra;
    final effMedical = medical; // Fixed allowances typically not prorated
    final effConveyance = conveyance;
    final effLta = proratedLta;

    // Employer PF
    final employerPFSettings = settings['employerPF'] as Map<String, dynamic>? ?? {};
    final employerPFPercent = (employerPFSettings['employerPFPercentOfBasic'] ?? 12).toDouble();
    final epsPercent = (employerPFSettings['epsPercentOfBasic'] ?? 8.33).toDouble();
    final epsCap = (employerPFSettings['epsCap'] ?? 1250).toDouble();

    final employerPFTotal = round2(effBasic * (employerPFPercent / 100));
    final eps = round2(effBasic * (epsPercent / 100)).clamp(0, epsCap);
    final epf = round2(employerPFTotal - eps).clamp(0, double.infinity);

    // Special as remainder
    final earningsExceptSpecial = effBasic + effHra + effMedical + effConveyance + effLta;
    final special = round2(monthlyCTC - employerPFTotal - earningsExceptSpecial).clamp(0, double.infinity);

    // Employee deductions
    final deductionsSettings = settings['deductions'] as Map<String, dynamic>? ?? {};
    final empPFSettings = deductionsSettings['employeePF'] as Map<String, dynamic>? ?? {};
    final empPFPercent = (empPFSettings['value'] ?? 12).toDouble();
    final capAt1800 = empPFSettings['capAt1800'] == true;

    double empPF = round2(effBasic * (empPFPercent / 100));
    if (capAt1800) {
      empPF = empPF.clamp(0, 1800);
    }

    final professionalTax = computeByMode(
      component: deductionsSettings['professionalTax'] as Map<String, dynamic>?,
      basic: basic,
      monthlyCTC: monthlyCTC,
    );

    final esiEnabled = deductionsSettings['esiEnabled'] == true;
    double esi = 0;
    if (esiEnabled) {
      esi = computeByMode(
        component: deductionsSettings['esi'] as Map<String, dynamic>?,
        basic: basic,
        monthlyCTC: monthlyCTC,
      );
    }

    // TDS override is yearly, divide by 12
    final tds = round2(tdsOverride / 12);

    final totalEarnings = effBasic + effHra + effMedical + effConveyance + effLta + special;
    final totalDeductions = empPF + professionalTax + esi + tds;
    final netPay = round2(totalEarnings - totalDeductions);

    return {
      'monthlyCTC': monthlyCTC,
      'earnings': {
        'basic': effBasic,
        'hra': effHra,
        'medical': effMedical,
        'conveyance': effConveyance,
        'lta': effLta,
        'special': special,
      },
      'employer': {
        'totalPF': employerPFTotal,
        'eps': eps,
        'epf': epf,
      },
      'deductions': {
        'empPF': empPF,
        'professionalTax': professionalTax,
        'esi': esi,
        'tds': tds,
      },
      'totals': {
        'totalEarnings': totalEarnings,
        'totalDeductions': totalDeductions,
        'netPay': netPay,
      },
    };
  }

  /// Format currency
  static String formatCurrency(double amount, {String currency = 'INR'}) {
    if (currency == 'INR') {
      return '₹${amount.toStringAsFixed(0)}';
    }
    return '\$${amount.toStringAsFixed(2)}';
  }
}

