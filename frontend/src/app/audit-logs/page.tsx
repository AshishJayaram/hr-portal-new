"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { getAuditLogs, hasRole, getCurrentUser } from "@/lib/api";
import Card from "@/components/ui/Card";
import Loader from "@/components/Loader";
import RoleGuard from "@/components/RoleGuard";

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  change_summary: string;
  old_values?: string;
  new_values?: string;
  changed_by_user?: {
    name: string;
    email: string;
  };
  created_at: string;
  ip_address?: string;
}

export default function AuditLogsPage() {
  const [filters, setFilters] = useState({
    entity_type: "",
    action: "",
    changed_by: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const user = getCurrentUser();

  const { data: auditLogs, isLoading, error } = useQuery({
    queryKey: ["audit-logs", filters, currentPage, pageSize],
    queryFn: () => getAuditLogs({ ...filters, page: currentPage, limit: pageSize }),
    enabled: hasRole(["Admin", "HR", "God"]),
  });

  const filteredLogs = auditLogs?.data || [];
  const pagination = auditLogs?.pagination;

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case "create":
        return "bg-green-500/20 text-green-300 border-green-500/30";
      case "update":
        return "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 border-blue-300 dark:border-blue-500/30";
      case "delete":
        return "bg-red-500/20 text-red-300 border-red-500/30";
      default:
        return "bg-gray-500/20 text-gray-300 border-gray-500/30";
    }
  };


  return (
    <RoleGuard allowedRoles={["Admin", "HR", "God"]}>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl font-bold text-white mb-2">📊 Audit Logs</h1>
            <p className="text-gray-400">Track all changes and activities in the system</p>
          </motion.div>
        </div>

        {/* Filters */}
        <Card title="Filters" className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Entity Type
              </label>
              <select
                value={filters.entity_type}
                onChange={(e) => handleFilterChange("entity_type", e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Types</option>
                <option value="USER">Users</option>
                <option value="DOCUMENT">Documents</option>
                <option value="LEAVE">Leaves</option>
                <option value="SALARY_SLIP">Salary Slips</option>
                <option value="HOLIDAY">Holidays</option>
                <option value="LEAVE_CATEGORY">Leave Categories</option>
                <option value="LEAVE_ALLOCATION">Leave Allocations</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Action
              </label>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange("action", e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Actions</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Changed By
              </label>
              <input
                type="text"
                placeholder="User ID or email..."
                value={filters.changed_by}
                onChange={(e) => handleFilterChange("changed_by", e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </Card>

        {/* Audit Logs List */}
        <Card title={`Audit Logs ${pagination ? `(${pagination.total} total)` : ''}`}>
          {isLoading ? (
            <Loader />
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-400">Failed to load audit logs</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">No audit logs found</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {filteredLogs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-800/70 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400 font-mono text-sm">
                        {log.entity_type}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(log.created_at)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Changed by: </span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {log.changed_by_user?.name || log.changed_by_user?.email || 'Unknown User'}
                      </span>
                    </div>

                    <div className="text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Summary: </span>
                      <span className="text-gray-900 dark:text-white">{log.change_summary}</span>
                    </div>

                    {(log.old_values || log.new_values) && (
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-3">
                        {log.old_values && (
                          <details className="mb-2">
                            <summary className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-500 dark:hover:text-gray-300">
                              View Old Values
                            </summary>
                            <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-x-auto text-gray-900 dark:text-gray-100">
                              {JSON.stringify(JSON.parse(log.old_values), null, 2)}
                            </pre>
                          </details>
                        )}
                        
                        {log.new_values && (
                          <details>
                            <summary className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-500 dark:hover:text-gray-300">
                              View New Values
                            </summary>
                            <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-x-auto text-gray-900 dark:text-gray-100">
                              {JSON.stringify(JSON.parse(log.new_values), null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
            
            {/* Pagination */}
            {pagination && pagination.total_pages > 1 && (
              <div className="flex justify-center mt-6 pt-4 border-t border-gray-700">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === 1
                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                    }`}
                  >
                    Previous
                  </button>
                  
                  {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                    const startPage = Math.max(1, currentPage - 2);
                    const page = startPage + i;
                    return page <= pagination.total_pages ? page : null;
                  }).filter(Boolean).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page!)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        page === currentPage
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === pagination.total_pages}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === pagination.total_pages
                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                    }`}
                  >
                    Next
                  </button>
                </div>
                
                {/* Page info */}
                <div className="ml-6 text-sm text-gray-400">
                  Page {currentPage} of {pagination.total_pages} ({pagination.total} total logs)
                </div>
              </div>
              )}
            </>
          )}
        </Card>
      </div>
    </RoleGuard>
  );
}
