"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Loader from "@/components/Loader";
import { getUserAuditLogs, getEmployeeGrowth, getGrowthStats, createGrowthRecord, updateGrowthRecord, deleteGrowthRecord, EmployeeGrowthRecord, getUser } from "@/lib/api";
import { toast } from "sonner";
import { 
  Calendar, 
  DollarSign, 
  FileText, 
  TrendingUp, 
  User, 
  Award,
  GraduationCap,
  Target,
  Star,
  Briefcase
} from "lucide-react";

export default function EmployeeDocumentationPage() {
  const params = useParams();
  const userId = params.userId as string;
  const [selectedTab, setSelectedTab] = useState<'growth' | 'activity' | 'summary'>('growth');
  const [growthType, setGrowthType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [editingRecord, setEditingRecord] = useState<EmployeeGrowthRecord | null>(null);

  const { data: auditData, isLoading: auditLoading, error: auditError } = useQuery({
    queryKey: ["user-audit-logs", userId],
    queryFn: () => getUserAuditLogs(userId),
    enabled: !!userId,
  });

  const { data: growthData, isLoading: growthLoading, error: growthError } = useQuery({
    queryKey: ["employee-growth", userId],
    queryFn: () => getEmployeeGrowth(userId),
    enabled: !!userId,
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["growth-stats", userId],
    queryFn: () => getGrowthStats(userId),
    enabled: !!userId,
  });

  const { data: userData, isLoading: userLoading, error: userError } = useQuery({
    queryKey: ["user", userId],
    queryFn: () => getUser(userId),
    enabled: !!userId,
  });

  const queryClient = useQueryClient();

  const auditLogs = auditData?.data || [];
  const growthRecords = growthData?.data || [];
  const stats = statsData?.data || {};
  const user = userData?.data;

  const createGrowthMutation = useMutation({
    mutationFn: createGrowthRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-growth", userId] });
      queryClient.invalidateQueries({ queryKey: ["growth-stats", userId] });
      setTitle('');
      setDescription('');
      setDate('');
      setGrowthType('');
      toast.success("Growth record added successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add growth record");
    },
  });

  const updateGrowthMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateGrowthRecord(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-growth", userId] });
      queryClient.invalidateQueries({ queryKey: ["growth-stats", userId] });
      toast.success("Growth record updated successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update growth record");
    },
  });

  const deleteGrowthMutation = useMutation({
    mutationFn: deleteGrowthRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-growth", userId] });
      queryClient.invalidateQueries({ queryKey: ["growth-stats", userId] });
      toast.success("Growth record deleted successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete growth record");
    },
  });

  const getActionIcon = (action: string, entityType: string) => {
    switch (entityType) {
      case "USER":
        return <User className="h-4 w-4" />;
      case "DOCUMENT":
        return <FileText className="h-4 w-4" />;
      case "LEAVE":
        return <Calendar className="h-4 w-4" />;
      case "SALARY_SLIP":
        return <DollarSign className="h-4 w-4" />;
      default:
        return <TrendingUp className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "CREATE":
        return "text-green-400";
      case "UPDATE":
        return "text-blue-600 dark:text-blue-400";
      case "DELETE":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getGrowthIcon = (type: string) => {
    switch (type) {
      case 'promotion':
        return <Award className="h-5 w-5 text-yellow-400" />;
      case 'skill_development':
        return <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
      case 'certification':
        return <FileText className="h-5 w-5 text-green-400" />;
      case 'project_completion':
        return <Target className="h-5 w-5 text-purple-400" />;
      case 'achievement':
        return <Star className="h-5 w-5 text-orange-400" />;
      case 'milestone':
        return <Briefcase className="h-5 w-5 text-indigo-400" />;
      default:
        return <TrendingUp className="h-5 w-5 text-gray-400" />;
    }
  };

  const handleSubmitGrowth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !growthType || !date) {
      toast.error("Please fill in all required fields");
      return;
    }

    createGrowthMutation.mutate({
      user_id: userId,
      title,
      description,
      type: growthType,
      date,
    });
  };

  const handleDeleteGrowth = (id: string) => {
    if (confirm('Are you sure you want to delete this growth record?')) {
      deleteGrowthMutation.mutate(id);
    }
  };

  const handleEditGrowth = (record: EmployeeGrowthRecord) => {
    setEditingRecord(record);
    setTitle(record.title);
    setDescription(record.description || '');
    setGrowthType(record.type);
    setDate(record.date);
  };

  const handleUpdateGrowth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord || !title || !growthType || !date) {
      toast.error("Please fill in all required fields");
      return;
    }

    updateGrowthMutation.mutate({
      id: editingRecord.id!,
      data: {
        title,
        description,
        type: growthType,
        date,
      }
    });
    setEditingRecord(null);
  };

  const handleCancelEdit = () => {
    setEditingRecord(null);
    setTitle('');
    setDescription('');
    setGrowthType('');
    setDate('');
  };

  const calculateTenure = (startDate: string) => {
    if (!startDate) return 'N/A';
    
    const start = new Date(startDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    
    if (years > 0 && months > 0) {
      return `${years} year${years > 1 ? 's' : ''}, ${months} month${months > 1 ? 's' : ''}`;
    } else if (years > 0) {
      return `${years} year${years > 1 ? 's' : ''}`;
    } else if (months > 0) {
      return `${months} month${months > 1 ? 's' : ''}`;
    } else {
      return 'Less than a month';
    }
  };

  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const tabs = [
    { id: 'growth', label: 'Growth Tracker', icon: <TrendingUp className="h-4 w-4" /> },
    { id: 'activity', label: 'Activity Log', icon: <FileText className="h-4 w-4" /> },
    { id: 'summary', label: 'Employment Summary', icon: <User className="h-4 w-4" /> }
  ];

  if (auditLoading || growthLoading || statsLoading || userLoading) return <Loader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
          Employee Documentation
        </h1>
      </div>

      {/* Tab Navigation */}
      <Card className="p-4">
        <div className="flex space-x-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                selectedTab === tab.id
                  ? 'bg-indigo-500 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Growth Tracker Tab */}
      {selectedTab === 'growth' && (
        <div className="space-y-6">
          {/* Add/Edit Growth Record Form */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              {editingRecord ? 'Edit Growth Record' : 'Add Growth Record'}
            </h2>
            <form onSubmit={editingRecord ? handleUpdateGrowth : handleSubmitGrowth}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
                <Select
                  value={growthType}
                  onChange={(e) => setGrowthType(e.target.value)}
                  options={[
                    { value: '', label: 'Select type' },
                    { value: 'promotion', label: 'Promotion' },
                    { value: 'skill_development', label: 'Skill Development' },
                    { value: 'certification', label: 'Certification' },
                    { value: 'project_completion', label: 'Project Completion' },
                    { value: 'achievement', label: 'Achievement' },
                    { value: 'milestone', label: 'Milestone' }
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date</label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter growth record title"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter description"
                  className="w-full px-3 py-2 bg-white border border-gray-300 dark:bg-white/10 dark:border-white/20 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows={3}
                />
              </div>
              </div>
              <div className="mt-4 flex gap-3">
                <Button type="submit" disabled={createGrowthMutation.isPending || updateGrowthMutation.isPending}>
                  {editingRecord 
                    ? (updateGrowthMutation.isPending ? 'Updating...' : 'Update Growth Record')
                    : (createGrowthMutation.isPending ? 'Adding...' : 'Add Growth Record')
                  }
                </Button>
                {editingRecord && (
                  <Button type="button" onClick={handleCancelEdit} variant="outline">
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </Card>

          {/* Growth Records List */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Growth History</h2>
            <div className="space-y-4">
              {growthRecords.length === 0 ? (
                <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                  No growth records found. Add one above to get started.
                  {growthError && (
                    <p className="text-red-400 text-sm mt-2">Error: {growthError.message}</p>
                  )}
                </div>
              ) : (
                growthRecords.map((record: EmployeeGrowthRecord) => (
                  <div key={record.id} className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
                    <div className="flex-shrink-0">
                      {getGrowthIcon(record.type)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{record.title}</h3>
                      {record.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{record.description}</p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">{formatDate(record.date)}</p>
                    </div>
                    <div className="flex-shrink-0 flex gap-2">
                      <button
                        onClick={() => handleEditGrowth(record)}
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                        disabled={updateGrowthMutation.isPending}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteGrowth(record.id!)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm"
                        disabled={deleteGrowthMutation.isPending}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Activity Log Tab */}
      {selectedTab === 'activity' && (
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Recent Activity</h2>
          <div className="space-y-3">
            {auditLogs.length > 0 ? (
              auditLogs.map((log: any, index: number) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
                  <div className={`flex-shrink-0 mt-1 ${getActionColor(log.action)}`}>
                    {getActionIcon(log.action, log.entity_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-900 dark:text-gray-300">
                      {log.change_summary || `${log.action} ${log.entity_type}`}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-500 mt-1 flex items-center gap-2">
                      <span>{formatDate(log.created_at)}</span>
                      {log.changed_by_user && (
                        <>
                          <span>•</span>
                          <span>by {log.changed_by_user.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">📊</div>
                <p className="text-gray-600 dark:text-gray-400">No recent activity found for this employee</p>
                {auditError && (
                  <p className="text-red-400 text-sm mt-2">Error: {auditError.message}</p>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Employment Summary Tab */}
      {selectedTab === 'summary' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Employment Summary</h2>
            {user ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Basic Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Employee ID:</span>
                      <span className="text-gray-900 dark:text-white font-medium">{user.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Name:</span>
                      <span className="text-gray-900 dark:text-white font-medium">{user.name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Email:</span>
                      <span className="text-gray-900 dark:text-white font-medium">{user.email || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Department:</span>
                      <span className="text-gray-900 dark:text-white font-medium">{user.department || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Position:</span>
                      <span className="text-gray-900 dark:text-white font-medium">{user.designation || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Role:</span>
                      <span className="text-gray-900 dark:text-white font-medium">{user.role || 'N/A'}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Employment Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Start Date:</span>
                      <span className="text-gray-900 dark:text-white font-medium">{formatDateForDisplay(user.created_at)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Employment Type:</span>
                      <span className="text-gray-900 dark:text-white font-medium">Full-time</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Status:</span>
                      <span className="text-green-600 dark:text-green-400 font-medium">Active</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Tenure:</span>
                      <span className="text-gray-900 dark:text-white font-medium">{calculateTenure(user.created_at)}</span>
                    </div>
                    {user.ctc && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">CTC:</span>
                        <span className="text-gray-900 dark:text-white font-medium">₹{user.ctc.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">👤</div>
                <p className="text-gray-600 dark:text-gray-400">User information not available</p>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Performance Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{growthRecords.length}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Growth Records</div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.promotion || 0}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Promotions</div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.certification || 0}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Certifications</div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.project_completion || 0}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Projects Completed</div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
