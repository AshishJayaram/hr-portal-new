"use client";

import { useQuery } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import Loader from "@/components/ui/Loader";
import { getFeedback } from "@/lib/api";
import { useState } from "react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

export default function GodFeedbackPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch feedback
  const { data: feedback, isLoading } = useQuery({
    queryKey: ["god-feedback"],
    queryFn: async () => {
      const result = await getFeedback();
      return result;
    },
  });

  // Filter feedback
  const filteredFeedback = (feedback?.data || []).filter((item: any) => {
    const matchesSearch = 
      item.message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.user?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredFeedback.length / itemsPerPage);
  const paginatedFeedback = filteredFeedback.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          💬 Feedback & Bug Reports
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          View and manage all user feedback and bug reports
        </p>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            placeholder="Search by message, user name, or email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            options={[
              { value: "all", label: "All Status" },
              { value: "pending", label: "Pending" },
              { value: "in_progress", label: "In Progress" },
              { value: "resolved", label: "Resolved" },
            ]}
          />
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {feedback?.data?.length || 0}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Pending</div>
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {feedback?.data?.filter((f: any) => f.status === 'pending').length || 0}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">In Progress</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {feedback?.data?.filter((f: any) => f.status === 'in_progress').length || 0}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Resolved</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {feedback?.data?.filter((f: any) => f.status === 'resolved').length || 0}
          </div>
        </Card>
      </div>

      {/* Feedback List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader />
        </div>
      ) : paginatedFeedback.length > 0 ? (
        <>
          <div className="space-y-4">
            {paginatedFeedback.map((item: any) => (
              <Card key={item.id} className="p-6">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    {/* User Info */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold">
                        {item.user?.name?.charAt(0) || 'A'}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          {item.user?.name || 'Anonymous'}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {item.user?.email || 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Message */}
                    <p className="text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">
                      {item.message}
                    </p>

                    {/* Images */}
                    {item.images && item.images.length > 0 && (
                      <div className="flex gap-2 flex-wrap mb-3">
                        {item.images.map((img: string, idx: number) => (
                          <a
                            key={idx}
                            href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${img}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
                          >
                            <span>📷</span>
                            <span>Image {idx + 1}</span>
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Timestamp */}
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Submitted: {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>

                  {/* Status Badge */}
                  <div className="flex-shrink-0">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status || 'pending')}`}>
                      {(item.status || 'pending').replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredFeedback.length)} of {filteredFeedback.length}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    Previous
                  </button>
                  <span className="px-4 py-2 text-gray-700 dark:text-gray-300">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </Card>
          )}
        </>
      ) : (
        <Card className="p-12 text-center">
          <div className="text-gray-500 dark:text-gray-400">
            <div className="text-6xl mb-4">💬</div>
            <h3 className="text-xl font-medium mb-2">
              {searchQuery || statusFilter !== "all" ? "No Matching Feedback" : "No Feedback Yet"}
            </h3>
            <p>
              {searchQuery || statusFilter !== "all" 
                ? "Try adjusting your search or filters."
                : "All user feedback and bug reports will appear here."}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}

