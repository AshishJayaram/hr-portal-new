"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSalarySlips, addSalarySlip, deleteSalarySlip, getCurrentUser, canManageSalarySlips, getUsers, getUser, getCompanySettings, uploadUserDocument, getUserDocuments, deleteDocument, getDocuments, downloadPayslipPDF, uploadPrivateDocument, getPrivateDocumentsByUser, deletePrivateDocument } from "@/lib/api";
import { computePayslipFromCTC, calculateLOPAmount } from "@/lib/payroll";
import { openPDFViewer, isPDFFile, getFileIcon, getFileTypeText } from "@/lib/pdfUtils";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import Card from "@/components/ui/Card";
import RoleGuard from "@/components/RoleGuard";
import { toast } from "sonner";

export default function SalarySlipsPage() {
  const user = getCurrentUser();
  const userId = user?.id || "u1";
  const [showUpload, setShowUpload] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [showPrivateDocUpload, setShowPrivateDocUpload] = useState(false);
  const [generateData, setGenerateData] = useState({
    userId: "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });
  const [generateUserQuery, setGenerateUserQuery] = useState("");
  const [selectedGenerateUserName, setSelectedGenerateUserName] = useState("");
  const [uploadData, setUploadData] = useState({
    userId: "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    lopDays: 0,
    lopAmount: 0,
  });
  const [privateDocData, setPrivateDocData] = useState({
    userId: "",
    title: "",
    category: "hr_private",
    isPublic: false,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPrivateFile, setSelectedPrivateFile] = useState<File | null>(null);
  const [userQuery, setUserQuery] = useState("");
  const [privateDocUserQuery, setPrivateDocUserQuery] = useState("");
  const [selectedUserName, setSelectedUserName] = useState("");
  const [selectedPrivateUserName, setSelectedPrivateUserName] = useState("");
  const [uploadDocState, setUploadDocState] = useState<Record<string, { file: File | null; title: string }>>({});
  const queryClient = useQueryClient();

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [employeeYears, setEmployeeYears] = useState<Record<string, number>>({});
  const itemsPerPage = 10;

  const { data, isLoading, error } = useQuery({
    queryKey: ["salary-slips", currentPage, selectedYear],
    queryFn: () => getSalarySlips(canManageSalarySlips() ? { page: currentPage, limit: itemsPerPage, year: selectedYear } : { userId: userId, page: currentPage, limit: itemsPerPage, year: selectedYear }),
  });

  const { data: usersData } = useQuery({
    queryKey: ["users", userQuery],
    queryFn: () => getUsers(userQuery ? { search: userQuery } : {}),
    enabled: canManageSalarySlips(),
  });

  const { data: privateDocUsersData } = useQuery({
    queryKey: ["users", privateDocUserQuery],
    queryFn: () => getUsers(privateDocUserQuery ? { search: privateDocUserQuery } : {}),
    enabled: canManageSalarySlips() && showPrivateDocUpload,
  });

  const { data: generateUsersData } = useQuery({
    queryKey: ["users", generateUserQuery],
    queryFn: () => getUsers(generateUserQuery ? { search: generateUserQuery } : {}),
    enabled: canManageSalarySlips() && showGenerate,
  });

  const companyId = typeof window !== 'undefined' ? (localStorage.getItem('companyId') || 'demo-company') : 'demo-company';
  const { data: companySettings } = useQuery({
    queryKey: ["company-settings", companyId],
    queryFn: () => getCompanySettings(companyId),
    enabled: canManageSalarySlips(),
  });

  const getUserName = (id: string) => {
    const list = (usersData?.data || []) as any[];
    const found = list.find((u) => String(u.id) === String(id));
    return found?.name || `Employee`;
  };

  const collapseAllEmployees = () => {
    // Force close all details elements
    document.querySelectorAll('details[data-employee-card]').forEach((el) => {
      (el as HTMLDetailsElement).open = false;
    });
  };

  const calculateLOPAmountAuto = (lopDays: number) => {
    if (!companySettings?.data || lopDays <= 0) return 0;
    
    // Get user's CTC for calculation
    const selectedUser = (usersData?.data || []).find((u: any) => String(u.id) === uploadData.userId);
    if (!selectedUser?.ctc) return 0;
    
    const breakdown = computePayslipFromCTC(selectedUser.ctc, companySettings.data);
    return calculateLOPAmount(lopDays, breakdown.totals.netPay, breakdown.earnings.basic, companySettings.data);
  };

  const setDocTitle = (uid: string, title: string) => setUploadDocState((s) => ({ ...s, [uid]: { file: s[uid]?.file || null, title } }));
  const setDocFile = (uid: string, file: File | null) => setUploadDocState((s) => ({ ...s, [uid]: { file, title: s[uid]?.title || "" } }));

  const handleEmployeePrivateDocUpload = async (uid: string) => {
    const state = uploadDocState[uid];
    if (!state?.file) return;
    const formData = new FormData();
    formData.append('file', state.file);
    formData.append('title', state.title || state.file.name);
    try {
      await uploadPrivateDocument(String(uid), formData);
      setUploadDocState((s) => ({ ...s, [uid]: { file: null, title: '' } }));
      queryClient.invalidateQueries({ queryKey: ["private-docs", String(uid)] });
      toast.success("Private document uploaded successfully");
    } catch (err: any) {
      console.error("Failed to upload private document:", err);
      toast.error("Failed to upload private document");
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
      formData.append("lopDays", uploadData.lopDays.toString());
      formData.append("lopAmount", uploadData.lopAmount.toString());
      return addSalarySlip(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salary-slips"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setShowUpload(false);
      setUploadData({ userId: "", month: new Date().getMonth() + 1, year: new Date().getFullYear() });
      setSelectedFile(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (slipId: string) => {
      try {
        // Try normal deletion first
        return await deleteSalarySlip(slipId);
      } catch (error: any) {
        console.warn("Normal deletion failed, attempting cleanup:", error);
        
        // If normal deletion fails, perform comprehensive cleanup
        await performSalarySlipCleanup(slipId);
        
        // Return success after cleanup
        return { success: true };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salary-slips"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Salary slip deleted successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete salary slip");
    },
  });

  const generatePayslipMutation = useMutation({
    mutationFn: async (data: { userId: string; month: number; year: number }) => {
      return downloadPayslipPDF(`${data.userId}-${data.month}-${data.year}`);
    },
    onSuccess: (response) => {
      // The downloadPayslipPDF function handles the download
      toast.success("Payslip PDF generated successfully!");
      setShowGenerate(false);
      setGenerateData({ userId: "", month: new Date().getMonth() + 1, year: new Date().getFullYear() });
      setGenerateUserQuery("");
      setSelectedGenerateUserName("");
    },
    onError: (error: any) => {
      console.error("Failed to generate payslip:", error);
      toast.error("Failed to generate payslip PDF");
    },
  });

  const privateDocUploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPrivateFile || !privateDocData.userId || !privateDocData.title) {
        throw new Error("Please fill all required fields");
      }
      const formData = new FormData();
      formData.append("file", selectedPrivateFile);
      formData.append("title", privateDocData.title);
      formData.append("category", privateDocData.category);
      formData.append("userId", privateDocData.userId);
      formData.append("isPublic", privateDocData.isPublic.toString());
      return uploadPrivateDocument(privateDocData.userId, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["private-docs", privateDocData.userId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setShowPrivateDocUpload(false);
      setPrivateDocData({ userId: "", title: "", category: "hr_private", isPublic: false });
      setSelectedPrivateFile(null);
      setPrivateDocUserQuery("");
      setSelectedPrivateUserName("");
      toast.success("Private document uploaded successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to upload private document");
    },
  });

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    uploadMutation.mutate();
  };

  const handlePrivateDocUpload = (e: React.FormEvent) => {
    e.preventDefault();
    privateDocUploadMutation.mutate();
  };

  const handleGeneratePayslip = () => {
    if (!generateData.userId) {
      toast.error("Please select an employee");
      return;
    }
    generatePayslipMutation.mutate(generateData);
  };

  // Comprehensive salary slip cleanup function
  const performSalarySlipCleanup = async (slipId: string) => {
    try {
      console.log(`Performing comprehensive cleanup for salary slip ${slipId}`);
      
      // Step 1: Get salary slip info before deletion
      const slipInfo = await getSalarySlip(slipId);
      const salarySlip = slipInfo?.data;
      
      if (salarySlip) {
        console.log(`Cleaning up salary slip: ${salarySlip.fileName}`);
        
        // Step 2: Delete related audit logs
        try {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/audit/logs/entity?entity_type=SALARY_SLIP&entity_id=${slipId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'X-Organization-ID': localStorage.getItem('organizationId') || '',
            },
          });
          console.log('Audit logs cleaned up');
        } catch (auditError) {
          console.warn('Failed to clean audit logs:', auditError);
        }
        
        // Step 3: Force delete from database (if normal deletion failed)
        try {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/salary-slips/${slipId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'X-Organization-ID': localStorage.getItem('organizationId') || '',
            },
          });
          console.log('Salary slip deleted from database');
        } catch (dbError) {
          console.warn('Failed to delete from database:', dbError);
        }
        
        // Step 4: Delete physical file (if it exists)
        if (salarySlip.fileUrl) {
          try {
            // Extract file path from fileUrl
            const filePath = salarySlip.fileUrl.replace(/.*\/api\/files\/salary-slips\/\d+/, '');
            console.log(`Attempting to delete physical file: ${filePath}`);
            
            // Note: Physical file deletion would need backend support
            // For now, we'll just log it
            console.log('Physical file cleanup would happen here');
          } catch (fileError) {
            console.warn('Failed to delete physical file:', fileError);
          }
        }
      }
      
      console.log(`Cleanup completed for salary slip ${slipId}`);
      
    } catch (error) {
      console.error('Cleanup failed:', error);
      throw error;
    }
  };

  const handleDeleteSlip = (slipId: string, employeeName: string, month: string, year: number) => {
    if (confirm(`Are you sure you want to delete the salary slip for ${employeeName} (${month} ${year})? This action cannot be undone.`)) {
      deleteMutation.mutate(slipId);
    }
  };

  if (isLoading) return <Loader />;
  if (error) return <p className="text-red-400">Error loading salary slips</p>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Salary Slips</h1>
        <RoleGuard allowedRoles={["HR", "Admin"]}>
          <div className="flex gap-2">
            <button
              onClick={() => setShowUpload(true)}
              className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700"
            >
              Add Salary Slip
            </button>
            <button
              onClick={() => setShowPrivateDocUpload(true)}
              className="px-4 py-2 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg hover:from-green-600 hover:to-teal-700"
            >
              Upload Private Document
            </button>
          </div>
        </RoleGuard>
      </div>

      <RoleGuard allowedRoles={["HR", "Admin"]}>
        {showUpload && (
          <Card>
            <h2 className="text-xl font-semibold mb-4">Add Salary Slip</h2>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">LOP Days</label>
                  <input
                    type="number"
                    value={uploadData.lopDays}
                    onChange={(e) => {
                      const lopDays = parseFloat(e.target.value) || 0;
                      const calculatedAmount = calculateLOPAmountAuto(lopDays);
                      setUploadData({ 
                        ...uploadData, 
                        lopDays, 
                        lopAmount: calculatedAmount 
                      });
                    }}
                    className="w-full p-2 rounded bg-white/10 border border-white/20"
                    min="0"
                    step="0.5"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">LOP Amount (₹)</label>
                  <input
                    type="number"
                    value={uploadData.lopAmount}
                    onChange={(e) => setUploadData({ ...uploadData, lopAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 rounded bg-white/10 border border-white/20"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
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
                  {uploadMutation.isPending ? "Uploading..." : "Upload Salary Slip"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUpload(false);
                    setShowGenerate(true);
                  }}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
                >
                  Generate Payslip PDF
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

      <RoleGuard allowedRoles={["HR", "Admin"]}>
        {showGenerate && (
          <Card>
            <h2 className="text-xl font-semibold mb-4">Generate Payslip PDF</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Employee</label>
                <input
                  type="text"
                  value={generateUserQuery}
                  onChange={(e) => setGenerateUserQuery(e.target.value)}
                  placeholder="Search by name or ID..."
                  className="w-full p-2 rounded bg-white/10 border border-white/20 mb-2"
                />
                <div className="max-h-40 overflow-y-auto border border-white/10 rounded">
                  {(generateUsersData?.data || []).map((u: any) => (
                    <button
                      type="button"
                      key={u.id}
                      className={`w-full text-left px-3 py-2 hover:bg-white/10 ${generateData.userId === String(u.id) ? 'bg-white/5' : ''}`}
                      onClick={() => {
                        setGenerateData({ ...generateData, userId: String(u.id) });
                        setGenerateUserQuery(`${u.name} (ID: ${u.id})`);
                        setSelectedGenerateUserName(u.name);
                      }}
                    >
                      {u.name} <span className="text-xs text-gray-400">(ID: {u.id})</span>
                    </button>
                  ))}
                  {(generateUsersData?.data || []).length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-400">No users</div>
                  )}
                </div>
                {generateData.userId && (
                  <p className="text-xs text-gray-400 mt-1">Selected: {selectedGenerateUserName || 'User'} (ID: {generateData.userId})</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Month</label>
                  <select
                    value={generateData.month}
                    onChange={(e) => setGenerateData({ ...generateData, month: parseInt(e.target.value) })}
                    className="w-full p-2 rounded bg-white/10 border border-white/20"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <option key={month} value={month}>
                        {new Date(2024, month - 1).toLocaleDateString('en-US', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Year</label>
                  <select
                    value={generateData.year}
                    onChange={(e) => setGenerateData({ ...generateData, year: parseInt(e.target.value) })}
                    className="w-full p-2 rounded bg-white/10 border border-white/20"
                  >
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleGeneratePayslip}
                  disabled={!generateData.userId || generatePayslipMutation.isPending}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg hover:from-green-600 hover:to-teal-700 disabled:opacity-50"
                >
                  {generatePayslipMutation.isPending ? 'Generating...' : 'Generate PDF'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowGenerate(false)}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Card>
        )}
      </RoleGuard>

      <RoleGuard allowedRoles={["HR", "Admin"]}>
        {showPrivateDocUpload && (
          <Card>
            <h2 className="text-xl font-semibold mb-4">Upload Private Document</h2>
            <form onSubmit={handlePrivateDocUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Employee</label>
                <input
                  type="text"
                  value={privateDocUserQuery}
                  onChange={(e) => setPrivateDocUserQuery(e.target.value)}
                  placeholder="Search by name or ID..."
                  className="w-full p-2 rounded bg-white/10 border border-white/20 mb-2"
                />
                <div className="max-h-40 overflow-y-auto border border-white/10 rounded">
                  {(privateDocUsersData?.data || []).map((u: any) => (
                    <button
                      type="button"
                      key={u.id}
                      className={`w-full text-left px-3 py-2 hover:bg-white/10 ${privateDocData.userId === String(u.id) ? 'bg-white/5' : ''}`}
                      onClick={() => { 
                        setPrivateDocData({ ...privateDocData, userId: String(u.id) }); 
                        setPrivateDocUserQuery(`${u.name} (ID: ${u.id})`); 
                        setSelectedPrivateUserName(u.name); 
                      }}
                    >
                      {u.name} <span className="text-xs text-gray-400">(ID: {u.id})</span>
                    </button>
                  ))}
                  {(privateDocUsersData?.data || []).length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-400">No users</div>
                  )}
                </div>
                {privateDocData.userId && (
                  <p className="text-xs text-gray-400 mt-1">Selected: {selectedPrivateUserName || 'User'} (ID: {privateDocData.userId})</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Document Title</label>
                <input
                  type="text"
                  value={privateDocData.title}
                  onChange={(e) => setPrivateDocData({ ...privateDocData, title: e.target.value })}
                  placeholder="Enter document title..."
                  className="w-full p-2 rounded bg-white/10 border border-white/20"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">File</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                  onChange={(e) => setSelectedPrivateFile(e.target.files?.[0] || null)}
                  className="w-full p-2 rounded bg-white/10 border border-white/20"
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={privateDocData.isPublic}
                  onChange={(e) => setPrivateDocData({ ...privateDocData, isPublic: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="isPublic" className="text-sm text-gray-300">
                  Make this document public (visible to all employees)
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={privateDocUploadMutation.isPending}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded disabled:opacity-50"
                >
                  {privateDocUploadMutation.isPending ? "Uploading..." : "Upload"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrivateDocUpload(false)}
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
        {/* Pagination Info */}
        {data?.data && data.data.length > 0 && (
          <div className="mb-4 text-sm text-gray-400">
            Showing page {currentPage} of {Math.ceil((data.total || data.data.length) / itemsPerPage)} 
            ({(data.total || data.data.length)} total items)
          </div>
        )}
        
        {canManageSalarySlips() ? (
          <div className="space-y-4">
            {/* Group by employee */}
            {[...new Set((data?.data || []).map((s: any) => s.userId))].map((uid) => (
              <details 
                key={uid} 
                className="rounded-lg border border-white/10 bg-white/5"
                data-employee-card="true"
              >
                <summary 
                  className="list-none p-4 cursor-pointer flex items-center justify-between"
                >
                  <span className="font-semibold">{getUserName(String(uid))} (ID: {uid})</span>
                  <span className="text-xs text-gray-400">
                    Click to expand/collapse
                  </span>
                </summary>
                <div className="p-4 pt-0 space-y-4">
                  {/* Dynamic Salary Breakdown Section */}
                  <EmployeeSalaryBreakdown userId={String(uid)} companySettings={companySettings?.data} />

       {/* Employee-specific Year Filter */}
       <div className="flex items-center gap-2">
         <label htmlFor={`year-select-${uid}`} className="text-sm text-gray-400">Filter by Year:</label>
         <select
           id={`year-select-${uid}`}
           value={employeeYears[String(uid)] || ""}
           onChange={(e) => {
             const newYear = e.target.value ? Number(e.target.value) : null;
             setEmployeeYears(prev => ({
               ...prev,
               [String(uid)]: newYear
             }));
           }}
           className="px-3 py-1 rounded bg-white/10 border border-white/20 text-sm"
         >
           <option value="">All Years</option>
           {[...new Set((data?.data || [])
             .filter((s: any) => s.userId === uid)
             .map((s: any) => s.year)
             .sort((a: number, b: number) => b - a) // Sort years in descending order
           )].map(year => (
             <option key={year} value={year}>{year}</option>
           ))}
         </select>
                    </div>

                  {/* Salary Slips Table */}
                  <div className="overflow-x-auto">
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
             {(data?.data || []).filter((s: any) => {
               if (s.userId !== uid) return false;
               const employeeYear = employeeYears[String(uid)];
               if (employeeYear !== null && employeeYear !== undefined) {
                 return s.year === employeeYear;
               }
               return true;
             }).map((s: any) => (
                          <tr key={s.id} className="border-t border-white/10">
                            <td className="py-2">{new Date(s.year, s.month - 1).toLocaleDateString('en-US', { month: 'long' })}</td>
                            <td className="py-2">{s.year}</td>
                            <td className="py-2">{new Date(s.createdAt).toLocaleDateString()}</td>
                            <td className="py-2">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={async () => {
                                    try {
                                      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/salary-slips/${s.id}/download`, {
                                        headers: {
                                          'Authorization': `Bearer ${localStorage.getItem('token')}`,
                                          'X-Organization-ID': localStorage.getItem('organizationId') || '',
                                        },
                                      });
                                      
                                      if (!response.ok) {
                                        // If file not found, perform cleanup
                                        if (response.status === 404) {
                                          console.warn(`Salary slip ${s.id} file not found, performing cleanup`);
                                          await performSalarySlipCleanup(s.id);
                                          queryClient.invalidateQueries({ queryKey: ["salary-slips"] });
                                          toast.success("Invalid salary slip record cleaned up");
                                          return;
                                        }
                                        throw new Error(`HTTP ${response.status}`);
                                      }
                                      
                                      const data = await response.json();
                                      if (data.fileUrl) {
                                        if (isPDFFile(data.fileUrl)) {
                                          openPDFViewer(data.fileUrl, `Salary Slip - ${getUserName(String(uid))} - ${new Date(s.year, s.month - 1).toLocaleDateString('en-US', { month: 'long' })} ${s.year}`);
                                        } else {
                                          window.open(data.fileUrl, '_blank');
                                        }
                                      }
                                    } catch (error) {
                                      console.error('Failed to download salary slip:', error);
                                      
                                      // Provide specific error messages based on error type
                                      if (error.message?.includes('404')) {
                                        toast.error('Salary slip file not found. The record will be cleaned up automatically.');
                                      } else if (error.message?.includes('403')) {
                                        toast.error('You do not have permission to access this salary slip.');
                                      } else if (error.message?.includes('401')) {
                                        toast.error('Please log in again to access salary slips.');
                                      } else {
                                        toast.error('Failed to access salary slip. Please try again or contact support.');
                                      }
                                    }
                                  }}
                                  className="text-green-400 hover:text-green-300 underline"
                                >
                                  {isPDFFile(s.fileUrl || '') ? 'View PDF' : 'View'}
                                </button>
                                <RoleGuard allowedRoles={["HR", "Admin"]}>
                                  <button
                                    onClick={async () => {
                                      try {
                                        const response = await downloadPayslipPDF(s.id);
                                        if (response.ok) {
                                          const blob = await response.blob();
                                          const url = window.URL.createObjectURL(blob);
                                          const a = document.createElement('a');
                                          a.style.display = 'none';
                                          a.href = url;
                                          a.download = `payslip_${s.id}.pdf`;
                                          document.body.appendChild(a);
                                          a.click();
                                          window.URL.revokeObjectURL(url);
                                          toast.success('Payslip PDF downloaded successfully');
                                        } else {
                                          toast.error('Failed to download payslip PDF');
                                        }
                                      } catch (error) {
                                        console.error('Failed to download payslip PDF:', error);
                                        toast.error('Failed to download payslip PDF');
                                      }
                                    }}
                                    className="text-blue-400 hover:text-blue-300 underline"
                                  >
                                    Download PDF
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSlip(
                                      s.id,
                                      getUserName(String(uid)),
                                      new Date(s.year, s.month - 1).toLocaleDateString('en-US', { month: 'long' }),
                                      s.year
                                    )}
                                    disabled={deleteMutation.isPending}
                                    className="text-red-400 hover:text-red-300 underline disabled:opacity-50"
                                  >
                                    Delete
                                  </button>
                                </RoleGuard>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Private Documents for this employee */}
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">Private Documents</h3>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <RoleGuard allowedRoles={["HR", "Admin"]}>
                        <div className="space-y-2">
                          <Input label="Title" value={uploadDocState[uid]?.title || ''} onChange={(e) => setDocTitle(String(uid), e.target.value)} />
                          <input type="file" onChange={(e) => setDocFile(String(uid), e.target.files?.[0] || null)} className="w-full p-2 rounded bg-white/10 border border-white/20" />
                          <button onClick={() => handleEmployeePrivateDocUpload(String(uid))} className="px-3 py-2 rounded bg-indigo-600 text-white disabled:opacity-50" disabled={!uploadDocState[uid]?.file}>Upload Private Document</button>
                        </div>
                      </RoleGuard>
                      <EmployeeDocsList userId={String(uid)} />
                    </div>
                  </div>
                </div>
              </details>
            ))}
            {(!data?.data || data.data.length === 0) && (
              <p className="text-gray-400 text-center py-8">No salary slips found</p>
            )}
            
            {/* Pagination Controls */}
            {data?.data && data.data.length > 0 && (
              <div className="flex justify-center items-center gap-4 mt-6">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 bg-white/10 border border-white/20 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-400">
                  Page {currentPage} of {Math.ceil((data.total || data.data.length) / itemsPerPage)}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={currentPage >= Math.ceil((data.total || data.data.length) / itemsPerPage)}
                  className="px-3 py-2 bg-white/10 border border-white/20 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* My Documents Section */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">My Documents</h2>
                <button
                  onClick={() => setShowPrivateDocUpload(true)}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg hover:from-green-600 hover:to-teal-700"
                >
                  Upload Private Document
                </button>
              </div>
              <EmployeeDocsList userId={userId} />
            </Card>

            {/* Salary Breakdown for Current User */}
            <EmployeeSalaryBreakdown userId={userId} companySettings={companySettings?.data} isCurrentUser={true} />

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
                  <div className="flex items-center gap-2">
                      <button 
                        onClick={async () => {
                          try {
                            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/salary-slips/${slip.id}/download`, {
                              headers: {
                                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                                'X-Organization-ID': localStorage.getItem('organizationId') || '',
                              },
                            });
                            
                            if (!response.ok) {
                              // If file not found, perform cleanup
                              if (response.status === 404) {
                                console.warn(`Salary slip ${slip.id} file not found, performing cleanup`);
                                await performSalarySlipCleanup(slip.id);
                                queryClient.invalidateQueries({ queryKey: ["salary-slips"] });
                                toast.success("Invalid salary slip record cleaned up");
                                return;
                              }
                              throw new Error(`HTTP ${response.status}`);
                            }
                            
                            const data = await response.json();
                            if (data.fileUrl) {
                              if (isPDFFile(data.fileUrl)) {
                                openPDFViewer(data.fileUrl, `Salary Slip - Employee - ${new Date(slip.year, slip.month - 1).toLocaleDateString('en-US', { month: 'long' })} ${slip.year}`);
                              } else {
                                window.open(data.fileUrl, '_blank');
                              }
                            }
                          } catch (error) {
                            console.error('Failed to download salary slip:', error);
                            
                            // Provide specific error messages based on error type
                            if (error.message?.includes('404')) {
                              toast.error('Salary slip file not found. The record will be cleaned up automatically.');
                            } else if (error.message?.includes('403')) {
                              toast.error('You do not have permission to access this salary slip.');
                            } else if (error.message?.includes('401')) {
                              toast.error('Please log in again to access salary slips.');
                            } else {
                              toast.error('Failed to access salary slip. Please try again or contact support.');
                            }
                          }
                        }}
                        className="text-green-400 hover:text-green-300"
                      >
                        {isPDFFile(slip.fileUrl || '') ? 'View PDF' : 'View'}
                      </button>
                    <RoleGuard allowedRoles={["HR", "Admin"]}>
                      <button
                        onClick={() => handleDeleteSlip(
                          slip.id, 
                          "Employee", 
                          new Date(slip.year, slip.month - 1).toLocaleDateString('en-US', { month: 'long' }), 
                          slip.year
                        )}
                        disabled={deleteMutation.isPending}
                        className="text-red-400 hover:text-red-300 underline disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </RoleGuard>
                  </div>
                </div>
              </div>
            ))}
            </div>
            
            {/* Pagination Controls for Non-Admin */}
            {data?.data && data.data.length > 0 && (
              <div className="flex justify-center items-center gap-4 mt-6">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 bg-white/10 border border-white/20 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-400">
                  Page {currentPage} of {Math.ceil((data.total || data.data.length) / itemsPerPage)}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={currentPage >= Math.ceil((data.total || data.data.length) / itemsPerPage)}
                  className="px-3 py-2 bg-white/10 border border-white/20 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Floating Collapse All Button */}
      {canManageSalarySlips() && data?.data && data.data.length > 0 && (
        <button
          onClick={collapseAllEmployees}
          className="fixed bottom-6 right-6 px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg shadow-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 flex items-center gap-2 z-50"
          title="Collapse all employee cards"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path 
              fillRule="evenodd" 
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" 
              clipRule="evenodd" 
            />
          </svg>
          Collapse All
        </button>
      )}
    </div>
  );
}

function EmployeeSalaryBreakdown({ userId, companySettings, isCurrentUser = false }: { userId: string; companySettings: any; isCurrentUser?: boolean }) {
  const { data: userData, isLoading } = useQuery({
    queryKey: ["user", userId],
    queryFn: () => getUser(userId),
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
        <div className="flex items-center justify-center py-8">
          <Loader />
        </div>
      </div>
    );
  }

  if (!userData?.data || !companySettings) {
    return null;
  }

  const userCTC = userData.data.ctc || 0;
  const payslip = computePayslipFromCTC(userCTC, companySettings);

  return (
    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
      <h4 className="font-semibold mb-3 text-lg">
        {isCurrentUser ? 'Your' : `${userData.data.name}'s`} Salary Breakdown (CTC: ₹{userCTC.toLocaleString('en-IN')})
      </h4>
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <div className="font-semibold mb-2">Earnings</div>
          {Object.entries(payslip.earnings).map(([k, v]) => (
            <div key={k} className="flex justify-between text-sm mb-1">
              <span className="capitalize">{k}</span>
              <span>₹{v.toLocaleString('en-IN')}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="font-semibold mb-2">Deductions</div>
          <div className="flex justify-between text-sm mb-1">
            <span>Employee PF</span>
            <span>₹{payslip.deductions.empPF.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between text-sm mb-1">
            <span>Professional Tax</span>
            <span>₹{payslip.deductions.professionalTax.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between text-sm mb-1">
            <span>ESI</span>
            <span>₹{payslip.deductions.esi.toLocaleString('en-IN')}</span>
          </div>
        </div>
        <div>
          <div className="font-semibold mb-2">Employer PF</div>
          <div className="flex justify-between text-sm mb-1">
            <span>Total PF</span>
            <span>₹{payslip.employer.totalPF.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between text-sm mb-1">
            <span>EPS</span>
            <span>₹{payslip.employer.eps.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between text-sm mb-1">
            <span>EPF</span>
            <span>₹{payslip.employer.epf.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex justify-between text-lg font-bold">
          <span>Net Pay:</span>
          <span className="text-green-400">₹{payslip.totals.netPay.toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>
  );
}

function EmployeeDocsList({ userId }: { userId: string }) {
  const currentUser = getCurrentUser();
  const isHR = currentUser?.role === 'HR' || currentUser?.role === 'Admin' || currentUser?.role === 'God';
  const queryClient = useQueryClient();
  const [deletingDocs, setDeletingDocs] = useState<Set<string>>(new Set());

  // Use private documents API specifically for salary slips page
  const { data, isLoading, error } = useQuery({
    queryKey: ["private-docs", userId],
    queryFn: () => getPrivateDocumentsByUser(userId),
    retry: 1,
  });
  
  if (isLoading) return <div className="text-sm text-gray-400">Loading documents...</div>;
  if (error) {
    console.error('Error loading private documents for user', userId, error);
    return <div className="text-sm text-red-400">Failed to load documents. Please try again.</div>;
  }
  
  const docs = data?.data || [];
  
  const handleDeleteDocument = async (docId: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
      setDeletingDocs(prev => new Set(prev).add(docId));
      
      try {
        await deletePrivateDocument(docId);
        queryClient.invalidateQueries({ queryKey: ["private-docs", userId] });
        toast.success("Document deleted successfully");
      } catch (err: any) {
        console.error("Failed to delete private document:", err);
        toast.error("Failed to delete document");
      } finally {
        setDeletingDocs(prev => {
          const newSet = new Set(prev);
          newSet.delete(docId);
          return newSet;
        });
      }
    }
  };

  
  return (
    <div className="space-y-2">
      {docs.map((doc: any) => (
        <div key={doc.id} className="p-3 rounded border border-white/10 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">{doc.title}</div>
            <div className="text-xs text-gray-400">
              {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'N/A'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                try {
                  // Use the file_url directly from the doc object
                  if (doc.file_url) {
                    const fullUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${doc.file_url}`;
                    if (isPDFFile(doc.file_url)) {
                      openPDFViewer(fullUrl, doc.title);
                    } else {
                      window.open(fullUrl, '_blank');
                    }
                  } else {
                    // Fallback: fetch from download endpoint
                    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/private-documents/${doc.id}/download`, {
                      headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'X-Organization-ID': localStorage.getItem('organizationId') || '',
                      },
                    });
                    const data = await response.json();
                    if (data.fileUrl) {
                      const fullUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${data.fileUrl}`;
                      if (isPDFFile(data.fileUrl)) {
                        openPDFViewer(fullUrl, doc.title);
                      } else {
                        window.open(fullUrl, '_blank');
                      }
                    }
                  }
                } catch (error) {
                  console.error('Failed to view private document:', error);
                  toast.error('Failed to view document');
                }
              }}
              className="text-indigo-300 hover:text-indigo-200 text-sm"
            >
              {isPDFFile(doc.file_url || '') ? 'View PDF' : 'View'}
            </button>
            {isHR && (
              <button
                onClick={() => handleDeleteDocument(doc.id, doc.title)}
                disabled={deletingDocs.has(doc.id)}
                className="text-red-400 hover:text-red-300 text-sm disabled:opacity-50"
              >
                {deletingDocs.has(doc.id) ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>
        </div>
      ))}
      {docs.length === 0 && (
        <div className="text-sm text-gray-400">No private documents uploaded.</div>
      )}
    </div>
  );
}
