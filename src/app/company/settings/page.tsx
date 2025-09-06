"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { getCompanySettings, updateCompanySettings } from "@/lib/api";
import { PayrollSettings, PayrollMode, defaultPayrollSettings, computePayslipFromCTC } from "@/lib/payroll";
import RoleGuard from "@/components/RoleGuard";

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
  const [settings, setSettings] = useState<PayrollSettings>(defaultPayrollSettings);
  const [annualCTC, setAnnualCTC] = useState<number>(1000000);
  const [lop, setLop] = useState<number>(0);
  const [tds, setTds] = useState<number>(0);

  useEffect(() => {
    if (data?.data) setSettings(data.data);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => updateCompanySettings(companyId, settings),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["company-settings", companyId] }),
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

  if (isLoading) return <div className="p-6">Loading...</div>;

  return (
    <RoleGuard allowedRoles={["HR", "Admin"]} fallback={<div className="p-6">You do not have permission to view company settings.</div>}>
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Company Payroll Settings</h1>

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
    </div>
    </RoleGuard>
  );
}


