"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUsers, canManageUsers, deleteUser } from "@/lib/api";
import Loader from "@/components/Loader";
import Card from "@/components/ui/Card";
import { GlassCard } from "@/components/ui/glass";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import GrowthTracker from "@/components/GrowthTracker";

export default function EmployeesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  const queryClient = useQueryClient();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: () => getUsers(),
  });

  const deleteUserMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setDeleteConfirm(null);
    },
    onError: (error) => {
      // Failed to delete user
      alert("Failed to delete user. Please try again.");
    },
  });

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Filter users based on search and filters
  const filteredUsers = useMemo(() => {
    if (!data?.data) return [];
    
    return data.data.filter((user: any) => {
      const matchesSearch = debouncedSearchTerm === "" || 
        user.name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        user.designation?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      
      const matchesRole = roleFilter === "" || user.role === roleFilter;
      const matchesDepartment = departmentFilter === "" || user.department === departmentFilter;
      
      return matchesSearch && matchesRole && matchesDepartment;
    });
  }, [data?.data, debouncedSearchTerm, roleFilter, departmentFilter]);

  // Get unique values for filters
  const uniqueRoles = useMemo(() => {
    if (!data?.data) return [];
    return [...new Set(data.data.map((user: any) => user.role))].filter(Boolean);
  }, [data?.data]);

  const uniqueDepartments = useMemo(() => {
    if (!data?.data) return [];
    return [...new Set(data.data.map((user: any) => user.department))].filter(Boolean);
  }, [data?.data]);

  if (!canManageUsers()) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">You do not have permission to view employees.</p>
      </div>
    );
  }

  if (isLoading) return <Loader />;
  if (error) return <div className="text-red-400">Failed to load employees</div>;

  const users = data?.data || [];

  return (
    <div className="space-y-6">
      <GlassCard variant="gradient" className="p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">Employees</h1>
          <Link href="/employees/add">
            <Button>New Employee</Button>
          </Link>
        </div>
      </GlassCard>

      {/* Search and Filters */}
      <GlassCard>
        <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <Input
              type="text"
              placeholder="Search employees by name, email, or designation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full"
            options={[
              { value: "", label: "All Roles" },
              ...uniqueRoles.map((role) => ({ value: role, label: role }))
            ]}
          />
          <Select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="w-full"
            options={[
              { value: "", label: "All Departments" },
              ...uniqueDepartments.map((dept) => ({ value: dept, label: dept }))
            ]}
          />
        </div>
        
        {/* Clear Filters */}
        {(searchTerm || roleFilter || departmentFilter) && (
          <div className="mt-3 flex justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setRoleFilter("");
                setDepartmentFilter("");
              }}
              className="text-sm"
            >
              Clear Filters
            </Button>
          </div>
        )}
        </div>
      </GlassCard>

      {/* Results Count */}
      <div className="text-sm text-gray-400">
        Showing {filteredUsers.length} of {data?.data?.length || 0} employees
      </div>

      <GlassCard>
        <div className="p-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map((u: any) => (
              <div key={u.id} className="p-4 rounded-liquid-lg bg-liquid-glass-white dark:bg-liquid-glass-black border border-white/20 shadow-liquid hover:shadow-liquid-glass transition-all">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-liquid-md bg-liquid-primary flex items-center justify-center text-white font-bold shadow-liquid">
                  {u.name?.charAt(0) || "U"}
                </div>
                <div className="flex-1">
                  <p className="font-bold">{u.name}</p>
                  <p className="text-sm text-gray-400">{u.email}</p>
                  {u.designation && <p className="text-xs text-gray-500">{u.designation}</p>}
                </div>
              </div>
              <div className="flex flex-col gap-3 text-sm text-gray-400">
                <div className="flex flex-col">
                  <span className="font-medium">{u.role}</span>
                  {u.department && <span className="text-xs">{u.department}</span>}
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:justify-start">
                  <Link href={`/employees/documentation/${u.id}`} className="text-blue-600 dark:text-blue-400 hover:underline text-sm">Docs</Link>
                  <Link href={`/employees/edit?id=${u.id}`} className="text-indigo-400 hover:underline text-sm">Edit</Link>
                  <button
                    onClick={() => setDeleteConfirm({ id: u.id, name: u.name })}
                    className="text-red-400 hover:underline text-sm text-left sm:text-right"
                  >
                    Delete
                  </button>
                </div>
              </div>
              
              {/* Growth Tracker */}
              <GrowthTracker userId={u.id} userName={u.name} maxItems={2} />
            </div>
            ))}
          </div>
          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-liquid-lg bg-liquid-glass-white dark:bg-liquid-glass-black flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🔍</span>
              </div>
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm || roleFilter || departmentFilter
                  ? "No employees match your search criteria."
                  : "No employees found."}
              </p>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Confirm Delete</h3>
            <p className="text-gray-400 mb-6">
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirm(null)}
                disabled={deleteUserMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteUserMutation.mutate(deleteConfirm.id)}
                disabled={deleteUserMutation.isPending}
              >
                {deleteUserMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}


