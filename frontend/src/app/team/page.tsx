"use client";

import { useQuery } from "@tanstack/react-query";
import { getTeam, getCurrentUser } from "../../lib/api";
import Loader from "../../components/Loader";
import Card from "../../components/Card";
import { User } from "../../lib/api";
import { useState } from "react";
import { ChevronDown, ChevronRight, Users, Crown, Shield, UserCheck, User as UserIcon, Building, RefreshCw } from "lucide-react";
import Button from "@/components/ui/Button";

interface TeamNode {
  user: User;
  children: TeamNode[];
  level: number;
}

export default function TeamPage() {
  const currentUser = getCurrentUser();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  
  const { data: teamData, isLoading, refetch } = useQuery({
    queryKey: ["team"],
    queryFn: () => {
      console.log("Fetching team data...");
      return getTeam();
    },
    onSuccess: (data) => {
      console.log("Team data refreshed:", data);
      console.log("Team data length:", data?.data?.length || 0);
    },
    onError: (error) => {
      console.error("Error fetching team data:", error);
    },
    // Force fresh data so manager changes reflect immediately
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const team = teamData?.data || [];

  // Build hierarchical tree structure with managers on top
  const buildTeamTree = (users: User[]): TeamNode[] => {
    console.log("Building team tree with users:", users.length);
    const userMap = new Map<string, TeamNode>();
    const rootNodes: TeamNode[] = [];

    // Create nodes for all users
    users.forEach(user => {
      userMap.set(user.id, {
        user,
        children: [],
        level: 0
      });
    });

    // Build parent-child relationships
    users.forEach(user => {
      const node = userMap.get(user.id)!;

      if (user.manager_id) {
        const managerNode = userMap.get(user.manager_id.toString());
        if (managerNode) {
          managerNode.children.push(node);
          node.level = managerNode.level + 1;
        } else {
          console.warn("User", user.id, "has manager_id", user.manager_id, "but manager not found in user list");
        }
      } else {
        rootNodes.push(node);
      }
    });

    console.log("Root nodes:", rootNodes.length);
    console.log("Total nodes:", userMap.size);

    // Sort root nodes by role priority (God > Admin > HR > Employee)
    const rolePriority = { 'God': 0, 'Admin': 1, 'HR': 2, 'Employee': 3 };
    rootNodes.sort((a, b) => {
      const aPriority = rolePriority[a.user.role as keyof typeof rolePriority] ?? 4;
      const bPriority = rolePriority[b.user.role as keyof typeof rolePriority] ?? 4;
      return aPriority - bPriority;
    });

    // Sort children by role priority and then by name
    const sortChildren = (node: TeamNode) => {
      node.children.sort((a, b) => {
        const aPriority = rolePriority[a.user.role as keyof typeof rolePriority] ?? 4;
        const bPriority = rolePriority[b.user.role as keyof typeof rolePriority] ?? 4;
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        return a.user.name.localeCompare(b.user.name);
      });
      node.children.forEach(sortChildren);
    };

    rootNodes.forEach(sortChildren);

    return rootNodes;
  };

  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case 'god':
        return <Crown className="h-4 w-4 text-purple-500" />;
      case 'admin':
        return <Shield className="h-4 w-4 text-red-500" />;
      case 'hr':
        return <UserCheck className="h-4 w-4 text-blue-500" />;
      default:
        return <UserIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'god':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'hr':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const toggleUser = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  const renderUserNode = (node: TeamNode) => {
    const isExpanded = expandedUsers.has(node.user.id);
    const hasChildren = node.children.length > 0;
    const isManager = hasChildren; // Anyone with direct reports is considered a manager

    return (
      <div key={node.user.id} className="ml-4">
        <div 
          className={`flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors border-l-2 ${
            selectedUser?.id === node.user.id ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500' : 
            isManager ? 'border-green-500' : 'border-gray-200 dark:border-gray-700'
          }`}
          onClick={() => setSelectedUser(node.user)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleUser(node.user.id);
              }}
              className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-6" />}
          
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
            isManager ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-indigo-500 to-purple-600'
          }`}>
            {node.user.name?.charAt(0) || 'U'}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-white truncate">
                {node.user.name}
              </span>
              {getRoleIcon(node.user.role)}
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(node.user.role)}`}>
                {node.user.role}
              </span>
              {isManager && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  Manager
                </span>
              )}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {node.user.designation || node.user.email}
            </div>
            {node.user.department && (
              <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                <Building className="h-3 w-3" />
                {node.user.department}
              </div>
            )}
          </div>
          
          {hasChildren && (
            <div className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-white/10 px-2 py-1 rounded">
              {node.children.length} report{node.children.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
        
        {hasChildren && isExpanded && (
          <div className="ml-4 border-l-2 border-gray-200 dark:border-gray-700 pl-2">
            {node.children.map(child => renderUserNode(child))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) return <Loader />;

  const tree = buildTeamTree(team);
  const totalEmployees = team.length;
  const totalManagers = team.filter(user => team.some(u => String(u.manager_id ?? '') === String(user.id))).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
          Employee Hierarchy
        </h1>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {totalEmployees} employees • {totalManagers} managers
          </div>
          <Button
            onClick={() => {
              console.log("Manual refresh triggered");
              refetch();
            }}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Employee Tree */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="h-5 w-5" />
              Organization Tree
            </h2>
            
            <div className="space-y-2">
              {tree.length > 0 ? (
                tree.map(rootNode => renderUserNode(rootNode))
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No team data available</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Selected User Details */}
        <div className="lg:col-span-1">
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              Employee Details
            </h2>
            
            {selectedUser ? (
              <div className="space-y-4">
                <div className="text-center">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-3 ${
                    team.some(u => u.manager_id === selectedUser.id) 
                      ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                      : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                  }`}>
                    {selectedUser.name?.charAt(0) || 'U'}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedUser.name}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    {selectedUser.designation}
                  </p>
                  {team.some(u => u.manager_id === selectedUser.id) && (
                    <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 mt-1">
                      Manager
                    </span>
                  )}
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {getRoleIcon(selectedUser.role)}
                    <span className="text-sm text-gray-600 dark:text-gray-400">Role:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(selectedUser.role)}`}>
                      {selectedUser.role}
                    </span>
                  </div>
                  
                  {selectedUser.department && (
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Department:</span>
                      <span className="text-gray-900 dark:text-white">{selectedUser.department}</span>
                    </div>
                  )}
                  
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Email:</span>
                    <p className="text-gray-900 dark:text-white">{selectedUser.email}</p>
                  </div>
                  
                  {selectedUser.manager_id && (
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Manager:</span>
                      <p className="text-gray-900 dark:text-white">
                        {team.find(u => u.id === selectedUser.manager_id?.toString())?.name || 'Unknown'}
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Direct Reports:</span>
                    <p className="text-gray-900 dark:text-white">
                      {team.filter(u => u.manager_id?.toString() === selectedUser.id.toString()).length} employee{team.filter(u => u.manager_id?.toString() === selectedUser.id.toString()).length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <UserIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Select an employee to view details</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}