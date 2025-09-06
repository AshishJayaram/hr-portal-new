"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUser, updateUser, getUsers, toCanonicalRole, getCompanySettings } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Loader from "@/components/ui/Loader";
import { computePayslipFromCTC } from "@/lib/payroll";
import { toast } from "sonner";

export default function EditEmployeePage() {
  // Read id from search params (?id=123)
  const search = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const id = search?.get('id') || '';
  return <EditEmployeeForm id={id} />;
}

function EditEmployeeForm({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    username: "",
    role: "Employee" as "Employee" | "Manager" | "HR" | "Admin",
    department: "",
    manager_id: "",
    ctc: "",
  });
  const [managerQuery, setManagerQuery] = useState("");
  const [selectedManagerName, setSelectedManagerName] = useState("");

  const { data: user, isLoading } = useQuery({
    queryKey: ["user", id],
    queryFn: () => getUser(id),
  });

  const { data: managers } = useQuery({
    queryKey: ["users", managerQuery],
    queryFn: () => getUsers(managerQuery ? { q: managerQuery } : {}),
  });

  const companyId = typeof window !== 'undefined' ? (localStorage.getItem('companyId') || 'demo-company') : 'demo-company';
  const { data: companySettings } = useQuery({
    queryKey: ["company-settings", companyId],
    queryFn: () => getCompanySettings(companyId),
  });

  useEffect(() => {
    if (user?.data) {
      setFormData({
        username: user.data.name || user.data.email || "",
        role: user.data.role,
        department: user.data.department || "",
        manager_id: (user.data as any).managerId || (user.data as any).manager_id || "",
        ctc: user.data.ctc ? String(user.data.ctc) : "",
      });
    }
  }, [user]);

  const mutation = useMutation({
    mutationFn: (body: any) => updateUser(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Employee updated successfully");
      router.push("/employees");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update employee");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      username: formData.username,
      role: toCanonicalRole(formData.role),
      department: formData.department,
      manager_id: formData.manager_id ? Number(formData.manager_id) : undefined,
      ctc: formData.ctc ? Number(formData.ctc) : undefined,
    } as any);
  };

  if (isLoading) return <Loader />;

  if (!user?.data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Employee not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Employee</h1>
        <Button
          variant="outline"
          onClick={() => router.back()}
        >
          Back
        </Button>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Input
              label="Username (name or email)"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />
            <Select
              label="Role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
              options={[
                { value: "Employee", label: "Employee" },
                { value: "Manager", label: "Manager" },
                { value: "HR", label: "HR" },
                { value: "Admin", label: "Admin" },
              ]}
            />
            <Input
              label="Department"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            />
            <Input
              label="CTC (Annual Salary)"
              type="number"
              value={formData.ctc}
              onChange={(e) => setFormData({ ...formData, ctc: e.target.value })}
              placeholder="Enter annual CTC in rupees"
            />
            <div>
              <label className="block text-sm mb-2">Manager (search and select)</label>
              <Input value={managerQuery} onChange={(e) => setManagerQuery(e.target.value)} placeholder="Search by name or ID..." />
              <div className="mt-2 max-h-48 overflow-y-auto border border-white/10 rounded">
                {(managers?.data || []).map((u: any) => (
                  <button
                    type="button"
                    key={u.id}
                    className={`w-full text-left px-3 py-2 hover:bg-white/10 ${String(formData.manager_id) === String(u.id) ? 'bg-white/5' : ''}`}
                    onClick={() => { setFormData({ ...formData, manager_id: String(u.id) }); setManagerQuery(`${u.name} (ID: ${u.id})`); setSelectedManagerName(u.name); }}
                  >
                    {u.name} <span className="text-xs text-gray-400">(ID: {u.id})</span>
                  </button>
                ))}
                {(!managers?.data || managers.data.length === 0) && (
                  <div className="px-3 py-2 text-sm text-gray-400">No users</div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              type="submit"
              loading={mutation.isPending}
            >
              Update Employee
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>

      {/* CTC Breakdown Display */}
      {formData.ctc && companySettings?.data && (
        <Card title="CTC Breakdown">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="text-sm text-secondary">
                Annual CTC: ₹{Number(formData.ctc).toLocaleString('en-IN')}
              </div>
              <div className="text-sm text-secondary">
                Monthly CTC: ₹{Math.round(Number(formData.ctc) / 12).toLocaleString('en-IN')}
              </div>
            </div>
            {(() => {
              const breakdown = computePayslipFromCTC(Number(formData.ctc), companySettings.data);
              return (
                <>
                  <div className="space-y-2">
                    <div className="font-semibold text-primary">Earnings</div>
                    {Object.entries(breakdown.earnings).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-sm">
                        <span className="capitalize">{k}</span>
                        <span>₹{v.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm border-t border-card pt-2">
                      <span>Total</span>
                      <span>₹{breakdown.totals.totalEarnings.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="font-semibold text-primary">Deductions</div>
                    <div className="flex justify-between text-sm">
                      <span>Employee PF</span>
                      <span>₹{breakdown.deductions.empPF.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Professional Tax</span>
                      <span>₹{breakdown.deductions.professionalTax.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>ESI</span>
                      <span>₹{breakdown.deductions.esi.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-primary border-t border-card pt-2">
                      <span>Net Pay</span>
                      <span className="text-green-600 dark:text-green-400">₹{breakdown.totals.netPay.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </Card>
      )}
    </div>
  );
}
