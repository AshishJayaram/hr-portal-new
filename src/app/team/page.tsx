"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTeam, updateUser, getCurrentUser, isManager, canManageUsers } from "../../lib/api";
import Loader from "../../components/Loader";
import Card from "../../components/Card";
import RoleGuard from "../../components/RoleGuard";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { useState } from "react";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  designation?: string;
  department?: string;
  managerId?: string;
  ctc?: number;
}

interface DepartmentNode {
  department: string;
  members: TeamMember[];
  managers: TeamMember[];
}

export default function TeamPage() {
  const user = getCurrentUser();
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    designation: "",
    role: "",
    department: "",
    ctc: "",
  });
  const [viewMode, setViewMode] = useState<"hierarchy" | "departments">("departments");
  
  const { data, isLoading } = useQuery({
    queryKey: ["team"],
    queryFn: () => getTeam(),
  });
  
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => updateUser(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      setEditingMember(null);
    },
  });

  // Build department-wise organization
  const buildDepartmentView = (members: TeamMember[]): DepartmentNode[] => {
    const departmentMap = new Map<string, DepartmentNode>();
    
    members.forEach(member => {
      const dept = member.department || "Unassigned";
      if (!departmentMap.has(dept)) {
        departmentMap.set(dept, {
          department: dept,
          members: [],
          managers: []
        });
      }
      
      const node = departmentMap.get(dept)!;
      if (member.role === "Manager" || member.role === "HR" || member.role === "Admin") {
        node.managers.push(member);
      } else {
        node.members.push(member);
      }
    });
    
    return Array.from(departmentMap.values()).sort((a, b) => a.department.localeCompare(b.department));
  };

  // Build hierarchy from flat list
  const buildHierarchy = (members: TeamMember[]): TeamMember[] => {
    const memberMap = new Map<string, TeamMember & { children: TeamMember[] }>();
    const roots: (TeamMember & { children: TeamMember[] })[] = [];

    // Create nodes
    members.forEach(member => {
      memberMap.set(member.id, { ...member, children: [] });
    });

    // Build tree
    members.forEach(member => {
      const node = memberMap.get(member.id)!;
      if (member.managerId && memberMap.has(member.managerId)) {
        memberMap.get(member.managerId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  const handleEditClick = (member: TeamMember) => {
    setEditingMember(member);
    setEditForm({
      name: member.name,
      email: member.email,
      designation: member.designation || "",
      role: member.role,
      department: member.department || "",
      ctc: member.ctc ? String(member.ctc) : "",
    });
  };

  const handleSaveEdit = () => {
    if (!editingMember) return;
    mutation.mutate({
      id: editingMember.id,
      body: {
        name: editForm.name,
        email: editForm.email,
        designation: editForm.designation,
        role: editForm.role,
        department: editForm.department,
        ctc: editForm.ctc ? Number(editForm.ctc) : undefined,
      }
    });
  };

  const renderDepartmentCard = (dept: DepartmentNode) => {
    const isClickable = canManageUsers();
    
    return (
      <Card key={dept.department} title={dept.department}>
        <div className="space-y-4">
          {/* Managers */}
          {dept.managers.length > 0 && (
            <div>
              <h4 className="font-semibold text-primary mb-2">Leadership</h4>
              <div className="grid gap-2">
                {dept.managers.map(manager => (
                  <div 
                    key={manager.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 ${
                      isClickable 
                        ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 border-card hover:border-gray-300 dark:hover:border-white/30' 
                        : 'border-card bg-gray-50 dark:bg-white/5'
                    }`}
                    onClick={() => isClickable && handleEditClick(manager)}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                      {manager.name?.charAt(0) || "M"}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-primary">{manager.name}</div>
                      <div className="text-sm text-secondary">ID: {manager.id} • {manager.role}</div>
                      {manager.designation && <div className="text-xs text-gray-500">{manager.designation}</div>}
                    </div>
                    {manager.ctc && (
                      <div className="text-sm text-secondary">
                        ₹{manager.ctc.toLocaleString('en-IN')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Employees */}
          {dept.members.length > 0 && (
            <div>
              <h4 className="font-semibold text-primary mb-2">Team Members</h4>
              <div className="grid gap-2">
                {dept.members.map(member => (
                  <div 
                    key={member.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 ${
                      isClickable 
                        ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 border-card hover:border-gray-300 dark:hover:border-white/30' 
                        : 'border-card bg-gray-50 dark:bg-white/5'
                    }`}
                    onClick={() => isClickable && handleEditClick(member)}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                      {member.name?.charAt(0) || "E"}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-primary">{member.name}</div>
                      <div className="text-sm text-secondary">ID: {member.id} • {member.role}</div>
                      {member.designation && <div className="text-xs text-gray-500">{member.designation}</div>}
                    </div>
                    {member.ctc && (
                      <div className="text-sm text-secondary">
                        ₹{member.ctc.toLocaleString('en-IN')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  };

  const renderHierarchyNode = (node: TeamMember & { children: TeamMember[] }, level: number = 0) => {
    const isClickable = canManageUsers();
    
    return (
      <div key={node.id} className="relative">
        <div 
          className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 ${
            isClickable 
              ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 border-card hover:border-gray-300 dark:hover:border-white/30' 
              : 'border-card bg-gray-50 dark:bg-white/5'
          }`}
          style={{ marginLeft: `${level * 2}rem` }}
          onClick={() => isClickable && handleEditClick(node)}
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
            {node.name?.charAt(0) || "U"}
          </div>
          <div className="flex-1">
            <div className="font-semibold text-primary">{node.name}</div>
            <div className="text-sm text-secondary">ID: {node.id}</div>
            {node.designation && <div className="text-xs text-gray-500">{node.designation}</div>}
            {node.department && (
              <div className="text-xs text-muted">{node.department}</div>
            )}
          </div>
          <div className="text-xs text-muted">
            {node.role}
          </div>
        </div>
        
        {/* Render children */}
        {node.children.length > 0 && (
          <div className="mt-2 space-y-2">
            {node.children.map(child => renderHierarchyNode(child as TeamMember & { children: TeamMember[] }, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) return <Loader />;

  const members = data?.data || [];
  const departments = buildDepartmentView(members);
  const hierarchy = buildHierarchy(members);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-primary">
          {isManager() ? "My Team" : "Team Members"}
        </h1>
        
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("departments")}
            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
              viewMode === "departments" 
                ? "bg-indigo-600 text-white" 
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            }`}
          >
            Departments
          </button>
          <button
            onClick={() => setViewMode("hierarchy")}
            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
              viewMode === "hierarchy" 
                ? "bg-indigo-600 text-white" 
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            }`}
          >
            Hierarchy
          </button>
        </div>
      </div>
      
      <RoleGuard allowedRoles={["Manager", "HR", "Admin"]}>
        {viewMode === "departments" ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {departments.map(dept => renderDepartmentCard(dept))}
            {departments.length === 0 && (
              <div className="col-span-full text-center py-8">
                <p className="text-muted">No team members found</p>
              </div>
            )}
          </div>
        ) : (
          <Card title="Team Hierarchy">
            <div className="space-y-4">
              {hierarchy.map(node => renderHierarchyNode(node as TeamMember & { children: TeamMember[] }))}
              {hierarchy.length === 0 && (
                <p className="text-muted text-center py-8">No team members found</p>
              )}
            </div>
          </Card>
        )}
      </RoleGuard>

      {/* <RoleGuard allowedRoles={["employee"]} fallback={
        <div className="text-center py-8">
          <p className="text-muted">You need manager access to view team information.</p>
        </div>
      }>
        <Card title="Access Restricted">
          <p className="text-muted text-center py-4">
            Team information is only available to managers and HR personnel.
          </p>
        </Card>
      </RoleGuard> */}

      {/* Edit Modal */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-card rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold mb-4 text-primary">Edit Employee</h2>
            <div className="space-y-4">
              <Input
                label="Name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
              <Input
                label="Email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
              <Input
                label="Designation"
                value={editForm.designation}
                onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                placeholder="e.g., Software Engineer, Manager"
              />
              <Select
                label="Role"
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                options={[
                  { value: "Employee", label: "Employee" },
                  { value: "Manager", label: "Manager" },
                  { value: "HR", label: "HR" },
                  { value: "Admin", label: "Admin" }
                ]}
              />
              <Input
                label="Department"
                value={editForm.department}
                onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
              />
              <Input
                label="CTC (Annual Salary)"
                type="number"
                value={editForm.ctc}
                onChange={(e) => setEditForm({ ...editForm, ctc: e.target.value })}
                placeholder="Enter annual CTC in rupees"
              />
            </div>
            <div className="flex gap-3 mt-6">
              <Button
                onClick={handleSaveEdit}
                loading={mutation.isPending}
                className="flex-1"
              >
                Save Changes
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditingMember(null)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
