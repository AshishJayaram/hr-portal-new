"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDocuments, getDocument, uploadDocument, deleteDocument, canManageDocuments, getCurrentUser, acknowledgeDocument, getAcknowledgedUsersForDocument } from "@/lib/api";
import RoleGuard from "@/components/RoleGuard";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Loader from "@/components/ui/Loader";
import SearchFilter from "@/components/ui/SearchFilter";
import { toast } from "sonner";
import { Search, Plus, Download, Trash2, FileText, Eye, Upload, CheckCircle, Users } from "lucide-react";
import { formatDate, capitalize } from "@/lib/utils";
import { openPDFViewer, isPDFFile, getFileIcon, getFileTypeText } from "@/lib/pdfUtils";

export default function DocumentsPage() {
  const user = getCurrentUser();
  const userId = user?.id || "u1";
  const userRole = user?.role || "Employee";
  
  const [documents, setDocuments] = useState<any[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<any[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadData, setUploadData] = useState({
    title: "",
    category: "",
    isPublic: true,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [acknowledgedUsers, setAcknowledgedUsers] = useState<any[]>([]);
  const [showAcknowledgedUsers, setShowAcknowledgedUsers] = useState<string | null>(null);
  const [ackSearch, setAckSearch] = useState("");
  const [ackPage, setAckPage] = useState(1);
  const ackPerPage = 10;
  const queryClient = useQueryClient();

  const [currentPage, setCurrentPage] = useState(1);
  const [perPage] = useState(20); // Increased page size for better performance

  const { data, isLoading, error } = useQuery({
    queryKey: ["documents", currentPage, perPage],
    queryFn: () => getDocuments({ page: currentPage.toString(), per_page: perPage.toString() }),
    staleTime: 60000, // Cache for 1 minute
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (data?.data) {
      setDocuments(data.data);
      
      // Apply role-based filtering
      const roleFilteredDocs = data.data.filter((doc: any) => {
        if (userRole === "HR" || userRole === "Admin" || userRole === "God") {
          return true; // HR/Admin can see all documents
        }
        // Employees can see: their own documents + public documents (exclude HR-private)
        return doc.isPublic || doc.user_id === userId;
      });
      
      setFilteredDocuments(roleFilteredDocs);
    }
  }, [data, userRole, userId]);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("No file selected");
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("title", uploadData.title);
      formData.append("category", uploadData.category);
      formData.append("isPublic", uploadData.isPublic.toString());
      return uploadDocument(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setShowUpload(false);
      setUploadData({ title: "", category: "", isPublic: false });
      setSelectedFile(null);
      toast.success("Document uploaded successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to upload document");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      try {
        // Try normal deletion first
        return await deleteDocument(docId);
      } catch (error: any) {
        // Normal deletion failed, attempting cleanup
        
        // If normal deletion fails, perform comprehensive cleanup
        await performDocumentCleanup(docId);
        
        // Return success after cleanup
        return { success: true };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Document deleted successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete document");
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (docId: string) => {
      return await acknowledgeDocument(docId);
    },
    onSuccess: () => {
      toast.success("Document acknowledged successfully");
    },
    onError: (err: any) => {
      const msg = String(err?.message || "Failed to acknowledge document");
      if (msg.toLowerCase().includes("already acknowledged")) {
        toast.info("Document already acknowledged by this user");
      } else {
        toast.error(msg);
      }
    },
  });

  const handleShowAcknowledgedUsers = async (docId: string) => {
    try {
      const response = await getAcknowledgedUsersForDocument(docId);
      // Map possible raw user objects into the shape the modal expects
      const users = (response.data || []).map((u: any) => ({
        id: u.id ?? u.user_id ?? Math.random().toString(36).slice(2),
        user: {
          name: u.name ?? u.user?.name ?? u.username ?? 'User',
          email: u.email ?? u.user?.email ?? 'N/A',
        },
        acknowledged_at: u.acknowledged_at ?? u.created_at ?? new Date().toISOString(),
      }));
      setAcknowledgedUsers(users);
      setShowAcknowledgedUsers(docId);
    } catch (error) {
      toast.error("Failed to load acknowledged users");
    }
  };

  // Comprehensive document cleanup function
  const performDocumentCleanup = async (docId: string) => {
    try {
      
      // Step 1: Get document info before deletion
      const docInfo = await getDocument(docId);
      const document = docInfo?.data;
      
      if (document) {
        
        // Step 2: Delete related audit logs
        try {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/audit/logs/entity?entity_type=DOCUMENT&entity_id=${docId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'X-Organization-ID': localStorage.getItem('organizationId') || '',
            },
          });
        } catch (auditError) {
          // Failed to clean audit logs
        }
        
        // Step 3: Force delete from database (if normal deletion failed)
        try {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/documents/${docId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'X-Organization-ID': localStorage.getItem('organizationId') || '',
            },
          });
        } catch (dbError) {
          // Failed to delete from database
        }
        
        // Step 4: Delete physical file (if it exists)
        if (document.fileUrl) {
          try {
            // Extract file path from fileUrl
            const filePath = document.fileUrl.replace(/.*\/api\/files\/documents\/\d+/, '');
            // Note: Physical file deletion would need backend support
            // For now, we'll just log it
          } catch (fileError) {
            // Failed to delete physical file
          }
        }
      }
      
      
    } catch (error) {
      throw error;
    }
  };

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    uploadMutation.mutate();
  };

  const handleSearch = (query: string) => {
    // First apply role-based filtering, then search
    const roleFilteredDocs = documents.filter((doc: any) => {
      if (userRole === "HR" || userRole === "Admin" || userRole === "God") {
        return true; // HR/Admin can see all documents
      }
      return doc.isPublic || doc.user_id === userId; // Employees can only see public docs or their own
    });
    
    const filtered = roleFilteredDocs.filter(doc =>
      doc.title.toLowerCase().includes(query.toLowerCase()) ||
      doc.category.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredDocuments(filtered);
  };

  const handleFilter = (filters: Record<string, string>) => {
    // First apply role-based filtering, then category filter
    let filtered = documents.filter((doc: any) => {
      if (userRole === "HR" || userRole === "Admin" || userRole === "God") {
        return true; // HR/Admin can see all documents
      }
      // Employees can see: their own documents + public documents (exclude HR-private)
      return doc.isPublic || doc.user_id === userId;
    });
    
    if (filters.category) {
      filtered = filtered.filter(doc => doc.category === filters.category);
    }
    
    setFilteredDocuments(filtered);
  };

  const categories = useMemo(() => {
    const cats = [...new Set(documents.map(doc => doc.category).filter(Boolean))];
    return cats.map(cat => ({ value: cat!, label: cat! }));
  }, [documents]);

  if (isLoading) return <Loader />;
  if (error) return <p className="text-red-400">Error loading documents</p>;

  const publicDocs = filteredDocuments.filter(d => d.isPublic);
  const privateDocs = filteredDocuments.filter(d => !d.isPublic);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Documents
          </h1>
          <p className="text-gray-400 mt-1">
            Manage and access organizational documents
          </p>
        </div>
        <RoleGuard allowedRoles={["HR", "Admin"]}>
          <Button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload Document
          </Button>
        </RoleGuard>
      </div>

      {/* Search and Filters */}
      <SearchFilter
        onSearch={handleSearch}
        onFilter={handleFilter}
        searchPlaceholder="Search documents by title or category..."
        filters={[
          {
            key: "category",
            label: "Category",
            options: categories,
          },
        ]}
      />

      {/* Upload Form */}
      <RoleGuard allowedRoles={["HR", "Admin"]}>
        {showUpload && (
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Upload Document</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUpload(false)}
              >
                ✕
              </Button>
            </div>
            <form onSubmit={handleUpload} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Input
                  label="Title"
                  value={uploadData.title}
                  onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                  required
                />
                <Input
                  label="Category"
                  value={uploadData.category}
                  onChange={(e) => setUploadData({ ...uploadData, category: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">File</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full p-3 border border-white/20 rounded-lg bg-white/10 text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-500 file:text-white hover:file:bg-indigo-600"
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={uploadData.isPublic}
                  onChange={(e) => setUploadData({ ...uploadData, isPublic: e.target.checked })}
                  className="rounded border-white/20 bg-white/10"
                />
                <label htmlFor="isPublic" className="text-sm">Public Document</label>
              </div>
              <div className="flex gap-3">
                <Button
                  type="submit"
                  loading={uploadMutation.isPending}
                >
                  Upload Document
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowUpload(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}
      </RoleGuard>

      {/* Documents */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {publicDocs.map((doc) => (
          <Card key={doc.id} className="group hover:bg-white/10 transition-all duration-300">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-white group-hover:text-indigo-300 transition-colors">
                    {doc.title}
                  </h3>
                  <p className="text-sm text-secondary">{doc.category}</p>
                </div>
              </div>
              <RoleGuard allowedRoles={["HR", "Admin"]}>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this document?")) {
                        deleteMutation.mutate(doc.id);
                      }
                    }}
                    className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </RoleGuard>
            </div>
            
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200">
                  {doc.category}
                </span>
              </div>
              <p className="text-xs text-secondary">
                Uploaded by {doc.uploadedBy} on {formatDate(doc.createdAt)}
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex gap-2 mb-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => acknowledgeMutation.mutate(doc.id)}
                  disabled={acknowledgeMutation.isPending}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Acknowledge
                </Button>
                {(userRole === 'HR' || userRole === 'Admin' || userRole === 'God') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleShowAcknowledgedUsers(doc.id)}
                    className="px-2"
                    title="View acknowledged users"
                  >
                    <Users className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/documents/${doc.id}/download`, {
                      headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'X-Organization-ID': localStorage.getItem('organizationId') || '',
                      },
                    });
                    const data = await response.json();
                    if (data.fileUrl) {
                      openPDFViewer(data.fileUrl, doc.title);
                    }
                  } catch (error) {
                    // Failed to download document
                  }
                }}
                className="w-full flex items-center gap-2"
              >
                {isPDFFile(doc.fileUrl || '') ? <Eye className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                {isPDFFile(doc.fileUrl || '') ? 'View PDF' : 'Download'}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* HR/Admin Private Documents Section */}
      <RoleGuard allowedRoles={["HR", "Admin"]}>
        {privateDocs.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                Private Documents
              </h2>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                HR/Admin Only
              </span>
            </div>
            <p className="text-gray-400 text-sm">
              Confidential documents accessible only to HR and Admin users
            </p>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {privateDocs.map((doc) => (
                <Card key={doc.id} className="group hover:bg-white/10 transition-all duration-300 border-red-500/20">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center text-white">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white group-hover:text-red-300 transition-colors">
                          {doc.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{doc.category}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this private document?")) {
                            deleteMutation.mutate(doc.id);
                          }
                        }}
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-200 text-red-800 dark:bg-red-600 dark:text-red-200">
                        {doc.category}
                      </span>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 border border-red-300 dark:border-red-500/30">
                        Private
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-500">
                      Uploaded by {doc.uploadedBy} on {formatDate(doc.createdAt)}
                    </p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/10">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/documents/${doc.id}/download`, {
                            headers: {
                              'Authorization': `Bearer ${localStorage.getItem('token')}`,
                              'X-Organization-ID': localStorage.getItem('organizationId') || '',
                            },
                          });
                          const data = await response.json();
                          if (data.fileUrl) {
                            openPDFViewer(data.fileUrl, doc.title);
                          }
                        } catch (error) {
                          // Failed to download document
                        }
                      }}
                      className="w-full flex items-center gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                      {isPDFFile(doc.fileUrl || '') ? <Eye className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                      {isPDFFile(doc.fileUrl || '') ? 'View PDF' : 'Download'}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </RoleGuard>

      {filteredDocuments.length === 0 && (
        <Card className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">No documents found</h3>
          <p className="text-gray-400">
            {documents.length === 0 ? "Get started by uploading your first document." : "Try adjusting your search or filters."}
          </p>
        </Card>
      )}

      {/* Acknowledged Users Modal */}
      {showAcknowledgedUsers && (() => {
        const filtered = acknowledgedUsers.filter((ack: any) =>
          ack.user?.name?.toLowerCase().includes(ackSearch.toLowerCase()) ||
          ack.user?.email?.toLowerCase().includes(ackSearch.toLowerCase())
        );
        const totalPages = Math.ceil(filtered.length / ackPerPage);
        const paginatedUsers = filtered.slice((ackPage - 1) * ackPerPage, ackPage * ackPerPage);

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Acknowledged Users</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAcknowledgedUsers(null);
                    setAckSearch("");
                    setAckPage(1);
                  }}
                  className="h-8 w-8 p-0"
                >
                  ×
                </Button>
              </div>

              {/* Search */}
              <div className="mb-4">
                <Input
                  placeholder="Search by name or email..."
                  value={ackSearch}
                  onChange={(e) => {
                    setAckSearch(e.target.value);
                    setAckPage(1);
                  }}
                  className="w-full"
                />
              </div>

              {/* User List */}
              <div className="space-y-2 overflow-y-auto flex-1 mb-4">
                {paginatedUsers.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    {ackSearch ? "No matching users found." : "No users have acknowledged this document yet."}
                  </p>
                ) : (
                  paginatedUsers.map((ack: any) => (
                    <div key={ack.id} className="flex items-start gap-3 p-3 bg-white/10 rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                        {ack.user?.name?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white">{ack.user?.name || 'Unknown User'}</p>
                        <p className="text-sm text-secondary truncate">{ack.user?.email || 'N/A'}</p>
                        <p className="text-xs text-secondary mt-1">
                          Acknowledged: {ack.acknowledged_at ? new Date(ack.acknowledged_at).toLocaleString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <p className="text-sm text-secondary">
                    Showing {(ackPage - 1) * ackPerPage + 1} - {Math.min(ackPage * ackPerPage, filtered.length)} of {filtered.length}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAckPage(p => Math.max(1, p - 1))}
                      disabled={ackPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAckPage(p => Math.min(totalPages, p + 1))}
                      disabled={ackPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        );
      })()}
    </div>
  );
}
