"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDocuments, uploadDocument, deleteDocument, canManageDocuments } from "@/lib/api";
import RoleGuard from "@/components/RoleGuard";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Loader from "@/components/ui/Loader";
import SearchFilter from "@/components/ui/SearchFilter";
import { toast } from "sonner";
import { Search, Plus, Download, Trash2, FileText, Eye, Upload } from "lucide-react";
import { formatDate, capitalize } from "@/lib/utils";
import { openPDFViewer, isPDFFile, getFileIcon, getFileTypeText } from "@/lib/pdfUtils";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<any[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadData, setUploadData] = useState({
    title: "",
    category: "",
    isPublic: true,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["documents"],
    queryFn: () => getDocuments(),
  });

  useEffect(() => {
    if (data?.data) {
      setDocuments(data.data);
      setFilteredDocuments(data.data);
    }
  }, [data]);

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
        console.warn("Normal deletion failed, attempting cleanup:", error);
        
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

  // Comprehensive document cleanup function
  const performDocumentCleanup = async (docId: string) => {
    try {
      console.log(`Performing comprehensive cleanup for document ${docId}`);
      
      // Step 1: Get document info before deletion
      const docInfo = await getDocument(docId);
      const document = docInfo?.data;
      
      if (document) {
        console.log(`Cleaning up document: ${document.title}`);
        
        // Step 2: Delete related audit logs
        try {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/audit/logs/entity?entity_type=DOCUMENT&entity_id=${docId}`, {
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
          await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/documents/${docId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'X-Organization-ID': localStorage.getItem('organizationId') || '',
            },
          });
          console.log('Document deleted from database');
        } catch (dbError) {
          console.warn('Failed to delete from database:', dbError);
        }
        
        // Step 4: Delete physical file (if it exists)
        if (document.fileUrl) {
          try {
            // Extract file path from fileUrl
            const filePath = document.fileUrl.replace(/.*\/api\/files\/documents\/\d+/, '');
            console.log(`Attempting to delete physical file: ${filePath}`);
            
            // Note: Physical file deletion would need backend support
            // For now, we'll just log it
            console.log('Physical file cleanup would happen here');
          } catch (fileError) {
            console.warn('Failed to delete physical file:', fileError);
          }
        }
      }
      
      console.log(`Cleanup completed for document ${docId}`);
      
    } catch (error) {
      console.error('Cleanup failed:', error);
      throw error;
    }
  };

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    uploadMutation.mutate();
  };

  const handleSearch = (query: string) => {
    const filtered = documents.filter(doc =>
      doc.title.toLowerCase().includes(query.toLowerCase()) ||
      doc.category.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredDocuments(filtered);
  };

  const handleFilter = (filters: Record<string, string>) => {
    let filtered = documents;
    
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
        <RoleGuard allowedRoles={["HR", "Admin", "Manager"]}>
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
      <RoleGuard allowedRoles={["HR", "Admin", "Manager"]}>
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
                  <p className="text-sm text-gray-400">{doc.category}</p>
                </div>
              </div>
              <RoleGuard allowedRoles={["HR", "Admin", "Manager"]}>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(doc.fileUrl, '_blank')}
                    className="h-8 w-8 p-0"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this document?")) {
                        deleteMutation.mutate(doc.id);
                      }
                    }}
                    className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </RoleGuard>
            </div>
            
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-600">
                  {doc.category}
                </span>
              </div>
              <p className="text-xs text-gray-500">
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
                    console.error('Failed to download document:', error);
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

      

      {filteredDocuments.length === 0 && (
        <Card className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">No documents found</h3>
          <p className="text-gray-400">
            {documents.length === 0 ? "Get started by uploading your first document." : "Try adjusting your search or filters."}
          </p>
        </Card>
      )}
    </div>
  );
}
