"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSalarySlips, uploadSalarySlip, deleteSalarySlip, getCurrentUser, canManageSalarySlips, getUsers } from "@/lib/api";
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
                  <span className="font-semibold">Employee ID: {uid}</span>
                  <span className="text-xs text-gray-400">Click to view slips</span>
                </summary>
                <div className="p-4 pt-0 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-gray-400">
                      <tr>
                        <th className="py-2">Month</th>
                        <th className="py-2">Year</th>
                        <th className="py-2">Uploaded</th>
                        <th className="py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.data || []).filter((s: any) => s.userId === uid).map((s: any) => (
                        <tr key={s.id} className="border-t border-white/10">
                          <td className="py-2">{new Date(s.year, s.month - 1).toLocaleDateString('en-US', { month: 'long' })}</td>
                          <td className="py-2">{s.year}</td>
                          <td className="py-2">{new Date(s.createdAt).toLocaleDateString()}</td>
                          <td className="py-2">
                            <a href={s.fileUrl} target="_blank" className="text-green-400 hover:text-green-300">Download</a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
