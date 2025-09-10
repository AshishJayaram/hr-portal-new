"use client";

import { useQuery } from "@tanstack/react-query";
import { getTeam, getCurrentUser } from "../../lib/api";
import Loader from "../../components/Loader";
import Card from "../../components/Card";
import { User } from "../../lib/api";
import { useState } from "react";

interface TeamNode {
  user: User;
  children: TeamNode[];
  level: number;
}

export default function TeamPage() {
  const currentUser = getCurrentUser();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'hierarchy' | 'network'>('grid');
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const { data: teamData, isLoading } = useQuery({
    queryKey: ["team"],
    queryFn: () => getTeam(),
  });

  const team = teamData?.data || [];

  // Pan and zoom handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.3, Math.min(2, prev * delta)));
  };

  const resetView = () => {
    setPanOffset({ x: 0, y: 0 });
    setZoom(1);
  };

  // Build hierarchical tree structure
  const buildTeamTree = (users: User[]): TeamNode[] => {
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
        }
      } else {
        rootNodes.push(node);
      }
    });

    return rootNodes;
  };

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'god':
        return 'bg-gradient-to-r from-purple-600 to-pink-600';
      case 'admin':
        return 'bg-gradient-to-r from-red-600 to-orange-600';
      case 'hr':
        return 'bg-gradient-to-r from-blue-600 to-cyan-600';
      case 'manager':
        return 'bg-gradient-to-r from-green-600 to-emerald-600';
      case 'employee':
        return 'bg-gradient-to-r from-indigo-600 to-purple-600';
      default:
        return 'bg-gradient-to-r from-gray-600 to-gray-700';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case 'god':
        return '👑';
      case 'admin':
        return '👑';
      case 'hr':
        return '👥';
      case 'manager':
        return '👔';
      case 'employee':
        return '👤';
      default:
        return '👤';
    }
  };

  const renderTeamCard = (user: User) => {
    return (
      <div
        key={user.id}
        className="group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl border border-gray-200/50 dark:border-gray-700/50 cursor-pointer transition-all duration-300 hover:scale-105 hover:bg-white dark:hover:bg-gray-800"
        onClick={() => setSelectedUser(user)}
      >
        {/* Role Badge */}
        <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full ${getRoleColor(user.role)} flex items-center justify-center text-white text-sm shadow-lg`}>
          {getRoleIcon(user.role)}
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
            {user.name?.charAt(0) || "U"}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {user.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
              {user.designation}
            </p>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span>{user.department}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <span className="capitalize">{user.role}</span>
          </div>
          {user.manager && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              <span>Reports to: {user.manager.name}</span>
            </div>
          )}
        </div>

        {/* Hover Effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
      </div>
    );
  };

  const renderNetworkView = () => {
    // Calculate better positioning for network view
    const cols = Math.ceil(Math.sqrt(team.length));
    const cardWidth = 200;
    const cardHeight = 120;
    const spacing = 50;

    return (
      <div className="relative min-h-[600px] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-2xl overflow-hidden">
        {/* Controls */}
        <div className="absolute top-4 right-4 z-20 flex gap-2">
          <button
            onClick={resetView}
            className="px-3 py-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 shadow-lg hover:bg-white dark:hover:bg-gray-800 transition-colors"
          >
            🔄 Reset View
          </button>
          <div className="px-3 py-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 shadow-lg">
            Zoom: {Math.round(zoom * 100)}%
          </div>
        </div>

        {/* Interactive Canvas */}
        <div
          className="w-full h-[600px] cursor-grab active:cursor-grabbing overflow-hidden"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          style={{ userSelect: 'none' }}
        >
          {/* SVG Container with Transform */}
          <div
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              width: '100%',
              height: '100%',
              position: 'relative',
            }}
          >
            {/* Connection Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minWidth: cols * (cardWidth + spacing), minHeight: Math.ceil(team.length / cols) * (cardHeight + spacing) }}>
              {team.map(user => {
                if (!user.manager_id) return null;
                const manager = team.find(m => m.id === user.manager_id?.toString());
                if (!manager) return null;
                
                const userIndex = team.indexOf(user);
                const managerIndex = team.indexOf(manager);
                
                const userX = spacing + (userIndex % cols) * (cardWidth + spacing) + cardWidth / 2;
                const userY = spacing + Math.floor(userIndex / cols) * (cardHeight + spacing) + cardHeight / 2;
                const managerX = spacing + (managerIndex % cols) * (cardWidth + spacing) + cardWidth / 2;
                const managerY = spacing + Math.floor(managerIndex / cols) * (cardHeight + spacing) + cardHeight / 2;
                
                return (
                  <line
                    key={`${user.id}-${manager.id}`}
                    x1={userX}
                    y1={userY}
                    x2={managerX}
                    y2={managerY}
                    stroke="url(#gradient)"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    className="animate-pulse"
                  />
                );
              })}
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>

            {/* Team Members */}
            <div className="absolute inset-0" style={{ minWidth: cols * (cardWidth + spacing), minHeight: Math.ceil(team.length / cols) * (cardHeight + spacing) }}>
              {team.map((user, index) => {
                const x = spacing + (index % cols) * (cardWidth + spacing);
                const y = spacing + Math.floor(index / cols) * (cardHeight + spacing);
                
                return (
                  <div
                    key={user.id}
                    className="absolute"
                    style={{ left: x, top: y }}
                  >
                    <div
                      className="group relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg hover:shadow-xl border border-gray-200/50 dark:border-gray-700/50 cursor-pointer transition-all duration-300 hover:scale-110 hover:bg-white dark:hover:bg-gray-800"
                      style={{ width: cardWidth, height: cardHeight }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedUser(user);
                      }}
                    >
                      {/* Role Badge */}
                      <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full ${getRoleColor(user.role)} flex items-center justify-center text-white text-xs shadow-lg`}>
                        {getRoleIcon(user.role)}
                      </div>

                      {/* Avatar */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                          {user.name?.charAt(0) || "U"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-sm text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                            {user.name}
                          </h3>
                          <p className="text-xs text-gray-600 dark:text-gray-300 font-medium truncate">
                            {user.designation}
                          </p>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                          <span className="truncate">{user.department}</span>
                        </div>
                        {user.manager && (
                          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                            <span className="truncate">→ {user.manager.name}</span>
                          </div>
                        )}
                      </div>

                      {/* Hover Effect */}
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 shadow-lg z-20">
          <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Controls:</div>
          <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
              <span>Reports to</span>
            </div>
            <div>🖱️ Drag to pan</div>
            <div>🎯 Scroll to zoom</div>
          </div>
        </div>
      </div>
    );
  };

  const renderHierarchyLevel = (users: User[], level: number = 0) => {
    if (users.length === 0) return null;

    return (
      <div className="space-y-6">
        {/* Level Header */}
        {level > 0 && (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full text-sm font-medium text-gray-600 dark:text-gray-400">
              <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
              Level {level}
            </div>
          </div>
        )}

        {/* Users Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {users.map(user => renderTeamCard(user))}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader />
      </div>
    );
  }

  const teamTree = buildTeamTree(team);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
          🏢 Team Organization Chart
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Hierarchical view of your organization structure
        </p>
        
        {/* View Toggle */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'grid'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            📋 Grid View
          </button>
          <button
            onClick={() => setViewMode('hierarchy')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'hierarchy'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            🌳 Hierarchy View
          </button>
          <button
            onClick={() => setViewMode('network')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'network'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            🔗 Network View
          </button>
        </div>
      </div>

      {/* Statistics - Moved to top */}
      {team.length > 0 && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {team.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Members</div>
          </Card>
          <Card className="p-4 text-center bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {team.filter(u => u.role === 'Manager').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Managers</div>
          </Card>
          <Card className="p-4 text-center bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {team.filter(u => u.role === 'Employee').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Employees</div>
          </Card>
          <Card className="p-4 text-center bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-800">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {new Set(team.map(u => u.department)).size}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Departments</div>
          </Card>
        </div>
      )}

      {/* Legend */}
      <Card className="mb-6 p-4">
        <h3 className="font-semibold mb-3">Role Legend</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gradient-to-r from-purple-600 to-pink-600"></div>
            <span className="text-sm">👑 God</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gradient-to-r from-red-600 to-orange-600"></div>
            <span className="text-sm">👑 Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gradient-to-r from-blue-600 to-cyan-600"></div>
            <span className="text-sm">👥 HR</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gradient-to-r from-green-600 to-emerald-600"></div>
            <span className="text-sm">👔 Manager</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gradient-to-r from-indigo-600 to-purple-600"></div>
            <span className="text-sm">👤 Employee</span>
          </div>
        </div>
      </Card>

      {/* Team Chart */}
      <Card className="p-6">
        {team.length > 0 ? (
          <div className="space-y-8">
            {viewMode === 'grid' ? (
              /* Grid View - All Team Members */
              <div>
                <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full text-sm font-medium text-indigo-700 dark:text-indigo-300">
                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                    All Team Members ({team.length})
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {team.map(user => renderTeamCard(user))}
                </div>
              </div>
            ) : viewMode === 'hierarchy' ? (
              /* Hierarchy View */
              <div>
                <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-full text-sm font-medium text-green-700 dark:text-green-300">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    Organizational Hierarchy
                  </div>
                </div>
                <div className="space-y-8">
                  {teamTree.map((rootNode, index) => (
                    <div key={index}>
                      {renderHierarchyLevel([rootNode.user], 0)}
                      {rootNode.children.length > 0 && (
                        <div className="mt-6">
                          {renderHierarchyLevel(rootNode.children.map(child => child.user), 1)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Network View */
              <div>
                <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 rounded-full text-sm font-medium text-purple-700 dark:text-purple-300">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    Team Network & Connections
                  </div>
                </div>
                {renderNetworkView()}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏢</div>
            <h3 className="text-xl font-medium mb-2">No Team Data Available</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Team structure will appear here once data is available.
            </p>
          </div>
        )}
      </Card>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full p-6 bg-white dark:bg-gray-800">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold">Employee Details</h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full ${getRoleColor(selectedUser.role)} flex items-center justify-center text-white text-xl`}>
                  {getRoleIcon(selectedUser.role)}
                </div>
                <div>
                  <h4 className="font-semibold text-lg">{selectedUser.name}</h4>
                  <p className="text-gray-600 dark:text-gray-400">{selectedUser.designation}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Role:</span>
                  <p className="text-gray-600 dark:text-gray-400">{selectedUser.role}</p>
                </div>
                <div>
                  <span className="font-medium">Department:</span>
                  <p className="text-gray-600 dark:text-gray-400">{selectedUser.department}</p>
                </div>
                <div>
                  <span className="font-medium">Email:</span>
                  <p className="text-gray-600 dark:text-gray-400">{selectedUser.email}</p>
                </div>
                <div>
                  <span className="font-medium">CTC:</span>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedUser.ctc ? `₹${selectedUser.ctc.toLocaleString()}` : 'Not specified'}
                  </p>
                </div>
              </div>
              
              {selectedUser.manager && (
                <div>
                  <span className="font-medium">Reports to:</span>
                  <p className="text-gray-600 dark:text-gray-400">{selectedUser.manager.name}</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}