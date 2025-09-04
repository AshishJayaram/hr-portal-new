"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSalarySlips, uploadSalarySlip, deleteSalarySlip, getCurrentUser, canManageSalarySlips, getUsers, getCompanySettings, uploadUserDocument, getUserDocuments } from "@/lib/api";
import { computePayslipFromCTC } from "@/lib/payroll";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import Card from "@/components/ui/Card";
import RoleGuard from "@/components/RoleGuard";

export default function SalarySlipsPage() {
  const user = getCurrentUser();
  const userId = user?.id || "u1";
  const [showUpload, setShowUpload] = useState(false);
  const [uploadData, setUploadData] = useState({
    userId: "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [userQuery, setUserQuery] = useState("");
  const [selectedUserName, setSelectedUserName] = useState("");
  const [uploadDocState, setUploadDocState] = useState<Record<string, { file: File | null; title: string }>>({});
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["salary-slips"],
    queryFn: () => getSalarySlips(canManageSalarySlips() ? {} : { userId: userId }),
  });

  const { data: usersData } = useQuery({
    queryKey: ["users", userQuery],
    queryFn: () => getUsers(userQuery ? { q: userQuery } : {}),
    enabled: canManageSalarySlips(),
  });

  const getUserName = (id: string) => {
    const list = (usersData?.data || []) as any[];
    const found = list.find((u) => String(u.id) === String(id));
    return found?.name || `Employee`;
  };

  const companyId = typeof window !== 'undefined' ? (localStorage.getItem('companyId') || 'demo-company') : 'demo-company';
  const { data: companySettings } = useQuery({
    queryKey: ["company-settings", companyId],
    queryFn: () => getCompanySettings(companyId),
  });

  const setDocTitle = (uid: string, title: string) => setUploadDocState((s) => ({ ...s, [uid]: { file: s[uid]?.file || null, title } }));
  const setDocFile = (uid: string, file: File | null) => setUploadDocState((s) => ({ ...s, [uid]: { file, title: s[uid]?.title || "" } }));

  const handlePrivateDocUpload = async (uid: string) => {
    const state = uploadDocState[uid];
    if (!state?.file) return;
    const formData = new FormData();
    formData.append('file', state.file);
    formData.append('title', state.title || state.file.name);
    formData.append('isPublic', 'false');
    try {
      await uploadUserDocument(String(uid), formData);
      setUploadDocState((s) => ({ ...s, [uid]: { file: null, title: '' } }));
    } catch {
      setUploadDocState((s) => ({ ...s, [uid]: { file: null, title: '' } }));
    }
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("No file selected");
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("userId", uploadData.userId);
      formData.append("month", uploadData.month.toString());
      formData.append("year", uploadData.year.toString());
      return uploadSalarySlip(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salary-slips"] });
      setShowUpload(false);
      setUploadData({ userId: "", month: new Date().getMonth() + 1, year: new Date().getFullYear() });
      setSelectedFile(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSalarySlip,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salary-slips"] });
    },
  });

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    uploadMutation.mutate();
  };

  if (isLoading) return <Loader />;
  if (error) return <p className="text-red-400">Error loading salary slips</p>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Salary Slips</h1>
        <RoleGuard allowedRoles={["HR", "Admin"]}>
          <button
            onClick={() => setShowUpload(true)}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700"
          >
            Upload Salary Slip
          </button>
        </RoleGuard>
      </div>

      <RoleGuard allowedRoles={["HR", "Admin"]}>
        {showUpload && (
          <Card>
            <h2 className="text-xl font-semibold mb-4">Upload Salary Slip</h2>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Employee</label>
                <input
                  type="text"
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder="Search by name or ID..."
                  className="w-full p-2 rounded bg-white/10 border border-white/20 mb-2"
                />
                <div className="max-h-40 overflow-y-auto border border-white/10 rounded">
                  {(usersData?.data || []).map((u: any) => (
                    <button
                      type="button"
                      key={u.id}
                      className={`w-full text-left px-3 py-2 hover:bg-white/10 ${uploadData.userId === String(u.id) ? 'bg-white/5' : ''}`}
                      onClick={() => { setUploadData({ ...uploadData, userId: String(u.id) }); setUserQuery(`${u.name} (ID: ${u.id})`); setSelectedUserName(u.name); }}
                    >
                      {u.name} <span className="text-xs text-gray-400">(ID: {u.id})</span>
                    </button>
                  ))}
                  {(usersData?.data || []).length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-400">No users</div>
                  )}
                </div>
                {uploadData.userId && (
                  <p className="text-xs text-gray-400 mt-1">Selected: {selectedUserName || 'User'} (ID: {uploadData.userId})</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Month</label>
                  <select
                    value={uploadData.month}
                    onChange={(e) => setUploadData({ ...uploadData, month: parseInt(e.target.value) })}
                    className="w-full p-2 rounded bg-white/10 border border-white/20"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <option key={month} value={month}>
                        {new Date(2024, month - 1).toLocaleDateString('en-US', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Year</label>
                  <input
                    type="number"
                    value={uploadData.year}
                    onChange={(e) => setUploadData({ ...uploadData, year: parseInt(e.target.value) })}
                    className="w-full p-2 rounded bg-white/10 border border-white/20"
                    min="2020"
                    max="2030"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">File</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full p-2 rounded bg-white/10 border border-white/20"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={uploadMutation.isPending}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded disabled:opacity-50"
                >
                  {uploadMutation.isPending ? "Uploading..." : "Upload"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowUpload(false)}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded"
                >
                  Cancel
                </button>
              </div>
            </form>
          </Card>
        )}
      </RoleGuard>

      <Card title={canManageSalarySlips() ? "All Salary Slips" : "My Salary Slips"}>
        {canManageSalarySlips() ? (
          <div className="space-y-4">
            {/* Group by employee */}
            {[...new Set((data?.data || []).map((s: any) => s.userId))].map((uid) => (
              <details key={uid} className="rounded-lg border border-white/10 bg-white/5">
                <summary className="list-none p-4 cursor-pointer flex items-center justify-between">
                  <span className="font-semibold">Employee: {getUserName(String(uid))} (ID: {uid})</span>
                  <span className="text-xs text-gray-400">Click to view slips</span>
                </summary>
                <div className="p-4 pt-0 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-gray-400">
                      <tr>
                        <th className="py-2">Month</th>
                        <th className="py-2">Year</th>
                        <th className="py-2">Uploaded</th>
                        <th className="py-2">Net Pay</th>
                        <th className="py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.data || []).filter((s: any) => s.userId === uid).map((s: any) => (
                        <tr key={s.id} className="border-t border-white/10">
                          <td className="py-2">{new Date(s.year, s.month - 1).toLocaleDateString('en-US', { month: 'long' })}</td>
                          <td className="py-2">{s.year}</td>
                          <td className="py-2">{new Date(s.createdAt).toLocaleDateString()}</td>
                          <td className="py-2">{companySettings?.data ? `₹${computePayslipFromCTC(1330000, companySettings.data).totals.netPay.toLocaleString('en-IN')}` : '-'}</td>
                          <td className="py-2">
                            <details>
                              <summary className="cursor-pointer text-indigo-300">View breakdown</summary>
                              {companySettings?.data && (() => {
                                const b = computePayslipFromCTC(1330000, companySettings.data);
                                return (
                                  <div className="mt-2 grid md:grid-cols-3 gap-4">
                                    <div>
                                      <div className="font-semibold">Earnings</div>
                                      {Object.entries(b.earnings).map(([k, v]) => (
                                        <div key={k} className="flex justify-between text-xs"><span className="capitalize">{k}</span><span>₹{v.toLocaleString('en-IN')}</span></div>
                                      ))}
                                    </div>
                                    <div>
                                      <div className="font-semibold">Deductions</div>
                                      <div className="flex justify-between text-xs"><span>Employee PF</span><span>₹{b.deductions.empPF.toLocaleString('en-IN')}</span></div>
                                      <div className="flex justify-between text-xs"><span>Professional Tax</span><span>₹{b.deductions.professionalTax.toLocaleString('en-IN')}</span></div>
                                      <div className="flex justify-between text-xs"><span>ESI</span><span>₹{b.deductions.esi.toLocaleString('en-IN')}</span></div>
                                    </div>
                                    <div>
                                      <div className="font-semibold">Employer PF</div>
                                      <div className="flex justify-between text-xs"><span>Total PF</span><span>₹{b.employer.totalPF.toLocaleString('en-IN')}</span></div>
                                      <div className="flex justify-between text-xs"><span>EPS</span><span>₹{b.employer.eps.toLocaleString('en-IN')}</span></div>
                                      <div className="flex justify-between text-xs"><span>EPF</span><span>₹{b.employer.epf.toLocaleString('en-IN')}</span></div>
                                    </div>
                                  </div>
                                );
                              })()}
                              <a href={s.fileUrl} target="_blank" className="inline-block mt-2 text-green-400 hover:text-green-300">Download PDF</a>
                            </details>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Private Documents for this employee */}
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">Private Documents</h3>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Input label="Title" value={uploadDocState[uid]?.title || ''} onChange={(e) => setDocTitle(String(uid), e.target.value)} />
                        <input type="file" onChange={(e) => setDocFile(String(uid), e.target.files?.[0] || null)} className="w-full p-2 rounded bg-white/10 border border-white/20" />
                        <button onClick={() => handlePrivateDocUpload(String(uid))} className="px-3 py-2 rounded bg-indigo-600 text-white disabled:opacity-50" disabled={!uploadDocState[uid]?.file}>Upload Private Document</button>
                      </div>
                      <EmployeeDocsList userId={String(uid)} />
                    </div>
                  </div>
                </div>
              </details>
            ))}
            {(!data?.data || data.data.length === 0) && (
              <p className="text-gray-400 text-center py-8">No salary slips found</p>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(data?.data || []).map((slip: any) => (
              <div key={slip.id} className="p-4 border border-white/10 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">
                      {new Date(slip.year, slip.month - 1).toLocaleDateString('en-US', { 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Uploaded: {new Date(slip.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <a href={slip.fileUrl} target="_blank" className="text-green-400 hover:text-green-300">Download</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function EmployeeDocsList({ userId }: { userId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["user-docs", userId],
    queryFn: () => getUserDocuments(userId),
  });
  if (isLoading) return <div className="text-sm text-gray-400">Loading documents...</div>;
  if (error) return <div className="text-sm text-red-400">Failed to load documents</div> as any;
  const docs = data?.data || [];
  return (
    <div className="space-y-2">
      {docs.map((doc: any) => (
        <div key={doc.id} className="p-3 rounded border border-white/10 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">{doc.title}</div>
            <div className="text-xs text-gray-400">{new Date(doc.createdAt).toLocaleDateString()}</div>
          </div>
          <a href={doc.fileUrl} target="_blank" className="text-indigo-300 hover:text-indigo-200">View</a>
        </div>
      ))}
      {docs.length === 0 && (
        <div className="text-sm text-gray-400">No private documents uploaded.</div>
      )}
    </div>
  );
}
