"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getCurrentUser } from "@/lib/api";
import { 
  getUserKRAs, 
  getTeamKRAs, 
  createKRA, 
  updateKRA, 
  deleteKRA, 
  evaluateKRA,
  selfAssessKRA,
  getReporteesKRAs,
  getKRASummary,
  getUsers,
  getKRASettings,
  bulkEvaluateKRAs,
  type KRA,
  type CreateKRARequest,
  type UpdateKRARequest,
  type EvaluateKRARequest,
  type SelfAssessKRARequest,
  type KRASummary,
  type KRASettings,
  type User,
  type BulkEvaluateKRAItem
} from "@/lib/api";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Tabs from "@/components/ui/Tabs";
import RoleGuard from "@/components/RoleGuard";
import { Plus, Edit, Trash2, CheckCircle, Clock, Target, TrendingUp, Users, BookOpen, Star, BarChart3, User as UserIcon, UserCheck, Save, AlertCircle } from "lucide-react";

export default function KRAPage() {
  const user = getCurrentUser();
  const userId = user?.id || "1";
  const userRole = user?.role || "Employee";
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<'my-kras' | 'team-kras' | 'reportees-kras'>('my-kras');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showSampleSheet, setShowSampleSheet] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEvaluateModal, setShowEvaluateModal] = useState(false);
  const [showSelfAssessModal, setShowSelfAssessModal] = useState(false);
  const [selectedKRA, setSelectedKRA] = useState<KRA | null>(null);
  const [selectedUser, setSelectedUser] = useState<string>(userId);
  const [kraPeriod, setKraPeriod] = useState<'yearly' | 'quarterly' | 'half-yearly'>('yearly');
  const [currentStep, setCurrentStep] = useState<'tracker' | 'sample' | 'create'>('tracker');

  // Check if user can view team KRAs (HR, Admin, God only)
  const canViewTeamKRAs = userRole === "HR" || userRole === "Admin" || userRole === "God";
  // Managers (and any employee) can view their own reportees' KRAs. Backend safely returns empty for non-managers.
  const canViewReporteesKRAs = true;

  // Fetch users for manager selection
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers(),
    enabled: Boolean(canViewTeamKRAs),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Fetch KRA settings (only for HR/Admin/God roles)
  const canAccessKRASettings = userRole === 'HR' || userRole === 'Admin' || userRole === 'God';
  const { data: kraSettings } = useQuery({
    queryKey: ['kra-settings'],
    queryFn: () => getKRASettings(),
    enabled: canAccessKRASettings, // Only fetch if user has permission
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  // Fetch user's KRAs
  const { data: userKRAs, isLoading: loadingUserKRAs } = useQuery({
    queryKey: ['user-kras', userId, selectedYear],
    queryFn: () => getUserKRAs(userId, selectedYear),
    enabled: Boolean(activeTab === 'my-kras'),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  });

  // Fetch team KRAs
  const { data: teamKRAs, isLoading: loadingTeamKRAs } = useQuery({
    queryKey: ['team-kras', selectedYear],
    queryFn: () => getTeamKRAs(selectedYear),
    enabled: Boolean(activeTab === 'team-kras' && canViewTeamKRAs),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  });

  // Fetch reportees KRAs
  const { data: reporteesKRAs, isLoading: loadingReporteesKRAs } = useQuery({
    queryKey: ['reportees-kras', selectedYear],
    queryFn: () => getReporteesKRAs(selectedYear),
    enabled: Boolean(activeTab === 'reportees-kras' && canViewReporteesKRAs),
    staleTime: 0, // Force fresh data
    refetchOnWindowFocus: true,
  });

  // Fetch KRA summary
  const { data: kraSummary } = useQuery({
    queryKey: ['kra-summary', userId, selectedYear],
    queryFn: () => getKRASummary(userId, selectedYear),
    enabled: Boolean(activeTab === 'my-kras'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Create KRA mutation
  const createKRAMutation = useMutation({
    mutationFn: createKRA,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-kras', userId, selectedYear] });
      queryClient.invalidateQueries({ queryKey: ['team-kras', selectedYear] });
      queryClient.invalidateQueries({ queryKey: ['kra-summary', userId, selectedYear] });
      setShowCreateModal(false);
      setShowSampleSheet(false);
      setCurrentStep('tracker');
      toast.success("KRA created successfully!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create KRA");
    },
  });

  // Update KRA mutation
  const updateKRAMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateKRARequest }) => updateKRA(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-kras', userId, selectedYear] });
      queryClient.invalidateQueries({ queryKey: ['team-kras', selectedYear] });
      queryClient.invalidateQueries({ queryKey: ['kra-summary', userId, selectedYear] });
      setShowEditModal(false);
      setSelectedKRA(null);
      toast.success("KRA updated successfully!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update KRA");
    },
  });

  // Delete KRA mutation
  const deleteKRAMutation = useMutation({
    mutationFn: (id: string) => deleteKRA(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-kras', userId, selectedYear] });
      queryClient.invalidateQueries({ queryKey: ['team-kras', selectedYear] });
      queryClient.invalidateQueries({ queryKey: ['kra-summary', userId, selectedYear] });
      toast.success("KRA deleted successfully!");
    },
    onError: (error: any) => {
      console.error("Delete KRA error:", error);
      toast.error(error.response?.data?.message || "Failed to delete KRA");
    },
  });

  // Evaluate KRA mutation
  const evaluateKRAMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EvaluateKRARequest }) => evaluateKRA(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-kras', userId, selectedYear] });
      queryClient.invalidateQueries({ queryKey: ['team-kras', selectedYear] });
      queryClient.invalidateQueries({ queryKey: ['reportees-kras', selectedYear] });
      queryClient.invalidateQueries({ queryKey: ['kra-summary', userId, selectedYear] });
      setShowEvaluateModal(false);
      setSelectedKRA(null);
      toast.success("KRA evaluated successfully!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to evaluate KRA");
    },
  });

  // Self-assess KRA mutation
  const selfAssessKRAMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SelfAssessKRARequest }) => selfAssessKRA(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-kras', userId, selectedYear] });
      queryClient.invalidateQueries({ queryKey: ['team-kras', selectedYear] });
      queryClient.invalidateQueries({ queryKey: ['reportees-kras', selectedYear] });
      queryClient.invalidateQueries({ queryKey: ['kra-summary', userId, selectedYear] });
      setShowSelfAssessModal(false);
      setSelectedKRA(null);
      toast.success("Assessment submitted successfully!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to submit assessment");
    },
  });

  // Check if user has any KRAs
  const hasKRAs = userKRAs?.data && userKRAs.data.length > 0;

  // Check if total weightage has reached 100%
  const isWeightageFull = Boolean(kraSummary?.total_weight && kraSummary.total_weight >= 100);

  // Handle create KRA
  const handleCreateKRA = (data: CreateKRARequest) => {
    createKRAMutation.mutate(data);
  };

  // Handle edit KRA
  const handleEditKRA = (kra: KRA) => {
    setSelectedKRA(kra);
    setShowEditModal(true);
  };

  // Handle delete KRA
  const handleDeleteKRA = (id: string) => {
    if (confirm("Are you sure you want to delete this KRA?")) {
      deleteKRAMutation.mutate(id);
    }
  };

  // Handle evaluate KRA
  const handleEvaluateKRA = (kra: KRA) => {
    setSelectedKRA(kra);
    setShowEvaluateModal(true);
  };

  // Handle self-assess KRA
  const handleSelfAssessKRA = (kra: KRA) => {
    setSelectedKRA(kra);
    setShowSelfAssessModal(true);
  };

  // Handle update KRA
  const handleUpdateKRA = (data: UpdateKRARequest) => {
    if (selectedKRA) {
      updateKRAMutation.mutate({ id: String(selectedKRA.id), data });
    }
  };

  // Handle evaluate KRA
  const handleEvaluateKRASubmit = (data: EvaluateKRARequest) => {
    if (selectedKRA) {
      evaluateKRAMutation.mutate({ id: String(selectedKRA.id), data });
    }
  };

  // Handle self-assess KRA submit
  const handleSelfAssessKRASubmit = (data: SelfAssessKRARequest) => {
    if (selectedKRA) {
      selfAssessKRAMutation.mutate({ id: String(selectedKRA.id), data });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">KRAs & Goals</h1>
        <div className="flex items-center space-x-4">
          <Select
            value={selectedYear.toString()}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="w-32"
            options={(() => {
              // Get years from KRAs data, or default to current year if no KRAs
              const years = new Set<number>();
              if (userKRAs?.data) {
                userKRAs.data.forEach(kra => years.add(kra.year));
              }
              if (teamKRAs?.data) {
                teamKRAs.data.forEach(kra => years.add(kra.year));
              }
              
              // If no KRAs exist, show current year
              if (years.size === 0) {
                years.add(new Date().getFullYear());
              }
              
              return Array.from(years).sort((a, b) => b - a).map(year => ({
                value: year.toString(),
                label: year.toString()
              }));
            })()}
          />
          <Select
            value={kraPeriod}
            onChange={(e) => setKraPeriod(e.target.value as 'yearly' | 'quarterly' | 'half-yearly')}
            className="w-32"
            options={[
              { value: 'yearly', label: 'Yearly' },
              { value: 'half-yearly', label: 'Half-yearly' },
              { value: 'quarterly', label: 'Quarterly' }
            ]}
          />
        </div>
      </div>

      {/* KRA Summary */}
      {kraSummary && activeTab === 'my-kras' && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total KRAs</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {kraSummary.total_kras}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {kraSummary.completed_kras}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">In Progress</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {kraSummary.total_kras - kraSummary.completed_kras}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Rating</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {kraSummary.average_rating?.toFixed(1) || 'N/A'}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <BarChart3 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Weight</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {kraSummary.total_weight?.toFixed(1) || '0'}%
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'my-kras', label: 'My KRAs', icon: '🎯' },
          ...(canViewTeamKRAs ? [ { id: 'team-kras', label: 'Team KRAs', icon: '👥' } ] : []),
          ...(canViewReporteesKRAs ? [ { id: 'reportees-kras', label: 'Reportees KRAs', icon: '📊' } ] : []),
        ]}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as 'my-kras' | 'team-kras' | 'reportees-kras')}
      />

      {/* Sample Sheet Modal */}
      {showSampleSheet && (
        <SampleKRASheetModal
          isOpen={showSampleSheet}
          onClose={() => {
            setShowSampleSheet(false);
            setCurrentStep('tracker');
          }}
          onStartCreating={() => {
            setCurrentStep('create');
            setShowCreateModal(true);
          }}
          kraSettings={kraSettings}
          kraPeriod={kraPeriod}
          onKraPeriodChange={setKraPeriod}
          onCreateKRA={handleCreateKRA}
          selectedUser={selectedUser}
          usersData={usersData?.data}
          canViewTeamKRAs={Boolean(canViewTeamKRAs)}
          isWeightageFull={isWeightageFull}
          kraSummary={kraSummary}
        />
      )}

      {/* Create KRA Modal */}
      {showCreateModal && (
        <CreateKRAModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setCurrentStep('tracker');
          }}
          onSubmit={handleCreateKRA}
          kraSettings={kraSettings}
          kraPeriod={kraPeriod}
          onKraPeriodChange={setKraPeriod}
          selectedUser={selectedUser}
          usersData={usersData?.data}
          canViewTeamKRAs={Boolean(canViewTeamKRAs)}
          isWeightageFull={isWeightageFull}
          kraSummary={kraSummary}
        />
      )}

      {/* Edit KRA Modal */}
      {showEditModal && selectedKRA && (
        <EditKRAModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedKRA(null);
          }}
          onSubmit={handleUpdateKRA}
          kra={selectedKRA}
          kraSettings={kraSettings}
        />
      )}

      {/* Evaluate KRA Modal */}
      {showEvaluateModal && selectedKRA && (
        <EvaluateKRAModal
          isOpen={showEvaluateModal}
          onClose={() => {
            setShowEvaluateModal(false);
            setSelectedKRA(null);
          }}
          onSubmit={handleEvaluateKRASubmit}
          kra={selectedKRA}
          kraSettings={kraSettings}
        />
      )}

      {/* Self-Assess KRA Modal */}
      {showSelfAssessModal && selectedKRA && (
        <SelfAssessKRAModal
          isOpen={showSelfAssessModal}
          onClose={() => {
            setShowSelfAssessModal(false);
            setSelectedKRA(null);
          }}
          onSubmit={handleSelfAssessKRASubmit}
          kra={selectedKRA}
          kraSettings={kraSettings}
        />
      )}

      {/* My KRAs Tab */}
      {activeTab === 'my-kras' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">My KRAs</h2>
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => {
                  setShowSampleSheet(true);
                  // Set the modal to open to samples tab
                  setTimeout(() => {
                    const sampleTab = document.querySelector('[data-tab="samples"]') as HTMLElement;
                    if (sampleTab) sampleTab.click();
                  }, 100);
                }}
                variant="outline"
                className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900/20"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                View Sample Format
              </Button>
              <Button
                onClick={() => {
                  setShowSampleSheet(true);
                  // Set the modal to open to create tab
                  setTimeout(() => {
                    const createTab = document.querySelector('[data-tab="create"]') as HTMLElement;
                    if (createTab) createTab.click();
                  }, 100);
                }}
                disabled={isWeightageFull}
                className={`shadow-lg ${
                  isWeightageFull
                    ? 'bg-gray-400 dark:bg-gray-600 text-gray-600 dark:text-gray-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 dark:from-blue-500 dark:to-purple-500 dark:hover:from-blue-600 dark:hover:to-purple-600 text-white'
                }`}
                title={isWeightageFull ? "Cannot create more KRAs - weightage limit reached (100%)" : ""}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create KRA
              </Button>
            </div>
          </div>

          {loadingUserKRAs ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Loading KRAs...</p>
            </div>
          ) : userKRAs?.data && userKRAs.data.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {userKRAs.data.map((kra) => (
                <KRACard
                  key={kra.id}
                  kra={kra}
                  onEdit={() => handleEditKRA(kra)}
                  onDelete={() => handleDeleteKRA(String(kra.id))}
                  onEvaluate={() => handleEvaluateKRA(kra)}
                  onSelfAssess={() => handleSelfAssessKRA(kra)}
                  userRole={userRole}
                  currentUserId={userId}
                  currentUserManagerId={user?.manager_id}
                  isDirectReportee={false} // In "My KRAs", user is evaluating their own KRAs
                  showSelfAssessButton={true}
                />
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <Target className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No KRAs Found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                You haven't created any KRAs yet. Start by exploring sample formats or creating your first KRA.
              </p>
              <div className="flex items-center justify-center space-x-3">
                <Button
                  onClick={() => {
                    setShowSampleSheet(true);
                    // Set the modal to open to samples tab
                    setTimeout(() => {
                      const sampleTab = document.querySelector('[data-tab="samples"]') as HTMLElement;
                      if (sampleTab) sampleTab.click();
                    }, 100);
                  }}
                  variant="outline"
                  className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900/20"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  View Sample Format
                </Button>
                <Button
                  onClick={() => {
                    setShowSampleSheet(true);
                    // Set the modal to open to create tab
                    setTimeout(() => {
                      const createTab = document.querySelector('[data-tab="create"]') as HTMLElement;
                      if (createTab) createTab.click();
                    }, 100);
                  }}
                  disabled={isWeightageFull}
                  className={`shadow-lg ${
                    isWeightageFull
                      ? 'bg-gray-400 dark:bg-gray-600 text-gray-600 dark:text-gray-300 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 dark:from-blue-500 dark:to-purple-500 dark:hover:from-blue-600 dark:hover:to-purple-600 text-white'
                  }`}
                  title={isWeightageFull ? "Cannot create more KRAs - weightage limit reached (100%)" : ""}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create KRA
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Team KRAs Tab */}
      {activeTab === 'team-kras' && canViewTeamKRAs && (
        <TeamKRASection
          selectedYear={selectedYear}
          selectedUser={selectedUser}
          setSelectedUser={setSelectedUser}
          usersData={usersData?.data}
          teamKRAs={teamKRAs?.data}
          loadingTeamKRAs={loadingTeamKRAs}
          onShowCreateModal={() => setShowCreateModal(true)}
          onShowEditModal={handleEditKRA}
          onShowEvaluateModal={handleEvaluateKRA}
          onShowSelfAssessModal={handleSelfAssessKRA}
          onDeleteKRA={handleDeleteKRA}
          userRole={userRole}
          kraSettings={kraSettings}
          kraPeriod={kraPeriod}
          onKraPeriodChange={setKraPeriod}
          isWeightageFull={isWeightageFull}
          userId={userId}
          user={user}
        />
      )}

      {activeTab === 'reportees-kras' && canViewReporteesKRAs && (
        <ReporteesKRASection
          selectedYear={selectedYear}
          reporteesKRAs={reporteesKRAs?.data}
          loadingReporteesKRAs={loadingReporteesKRAs}
          onShowEditModal={handleEditKRA}
          onShowEvaluateModal={handleEvaluateKRA}
          onShowSelfAssessModal={handleSelfAssessKRA}
          onDeleteKRA={handleDeleteKRA}
          userRole={userRole}
          userId={userId}
          user={user}
        />
      )}

    </div>
  );
}

// KRA Card Component
function KRACard({ 
  kra, 
  onEdit, 
  onDelete, 
  onEvaluate, 
  onSelfAssess,
  userRole,
  currentUserId,
  currentUserManagerId,
  isDirectReportee,
  showSelfAssessButton
}: { 
  kra: KRA; 
  onEdit: () => void; 
  onDelete: () => void; 
  onEvaluate: () => void; 
  onSelfAssess: () => void;
  userRole: string;
  currentUserId: string;
  currentUserManagerId?: number;
  isDirectReportee?: boolean;
  showSelfAssessButton?: boolean;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'not_started': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getRatingColor = (rating?: number) => {
    if (!rating) return 'text-gray-500';
    if (rating >= 4) return 'text-green-600 dark:text-green-400';
    if (rating >= 3) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow min-w-0">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0 pr-3">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1 truncate">{kra.title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{kra.description}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getStatusColor(kra.status)}`}>
          {kra.status.replace('_', ' ')}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Target:</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {kra.target_value} {kra.measurement_unit}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Weight:</span>
          <span className="font-medium text-gray-900 dark:text-white">{kra.weight}%</span>
        </div>
        {(() => {
          const isKraOwner = Number(kra.user_id) === Number(currentUserId);
          const isManagerViewingReportee = isDirectReportee && !isKraOwner;
          const isHrAdminGod = userRole === 'HR' || userRole === 'Admin' || userRole === 'God';
          if (isManagerViewingReportee || isHrAdminGod) {
            return (
              <div className="flex justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">
                  Employee rating: <span className={`${getRatingColor(kra.employee_rating)} font-medium`}>{kra.employee_rating ? `${kra.employee_rating}/5` : '—'}</span>
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  Manager rating: <span className={`${getRatingColor(kra.rating)} font-medium`}>{kra.rating ? `${kra.rating}/5` : '—'}</span>
                </span>
              </div>
            );
          }
          return null;
        })()}
        {(kra.employee_actual_value || kra.manager_actual_value) && (
          <div className="grid grid-cols-1 gap-1 text-sm">
            {kra.employee_actual_value && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Employee Actual:</span>
                <span className="font-medium text-gray-900 dark:text-white">{kra.employee_actual_value} {kra.measurement_unit}</span>
              </div>
            )}
            {kra.manager_actual_value && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Manager Actual:</span>
                <span className="font-medium text-gray-900 dark:text-white">{kra.manager_actual_value} {kra.measurement_unit}</span>
              </div>
            )}
          </div>
        )}
        {/* Assessment Display - Role-based visibility */}
        {(() => {
          const isKraOwner = Number(kra.user_id) === Number(currentUserId);
          const isManagerViewingReportee = isDirectReportee && !isKraOwner;
          const isHrAdminGod = userRole === 'HR' || userRole === 'Admin' || userRole === 'God';
          
          // Employee can see their own assessment + manager feedback (if visible)
          if (isKraOwner) {
            return (
              <div className="space-y-4">
                {/* Employee's Self Assessment */}
                {kra.employee_rating && (
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border-l-4 border-purple-200 dark:border-purple-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                        <span className="text-purple-700 dark:text-purple-300 font-medium text-sm">Your Self Assessment</span>
                      </div>
                      <span className={`font-bold text-lg ${getRatingColor(kra.employee_rating)}`}>
                        {kra.employee_rating}/5
                      </span>
                    </div>
                    {kra.employee_comments && (
                      <p className="text-gray-700 dark:text-gray-300 text-sm mt-2">{kra.employee_comments}</p>
                    )}
                    {kra.employee_actual_value && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Actual Value: <span className="font-medium">{kra.employee_actual_value} {kra.measurement_unit}</span>
                      </p>
                    )}
                  </div>
                )}
                
                {/* Manager Assessment (only if visible) */}
                {kra.manager_feedback_visible && kra.rating && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border-l-4 border-blue-200 dark:border-blue-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                        <span className="text-blue-700 dark:text-blue-300 font-medium text-sm">Manager Assessment</span>
                      </div>
                      <span className={`font-bold text-lg ${getRatingColor(kra.rating)}`}>
                        {kra.rating}/5
                      </span>
                    </div>
                    {kra.comments && (
                      <p className="text-gray-700 dark:text-gray-300 text-sm mt-2">{kra.comments}</p>
                    )}
                    {kra.manager_actual_value && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Actual Value: <span className="font-medium">{kra.manager_actual_value} {kra.measurement_unit}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          }
          
          // Manager can see reportee's assessment + their own assessment
          if (isManagerViewingReportee) {
            return (
              <div className="space-y-4">
                {/* Reportee's Self Assessment */}
                {kra.employee_rating && (
                  <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border-l-4 border-green-200 dark:border-green-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                        <span className="text-green-700 dark:text-green-300 font-medium text-sm">Reportee Self Assessment</span>
                      </div>
                      <span className={`font-bold text-lg ${getRatingColor(kra.employee_rating)}`}>
                        {kra.employee_rating}/5
                      </span>
                    </div>
                    {kra.employee_comments && (
                      <p className="text-gray-700 dark:text-gray-300 text-sm mt-2">{kra.employee_comments}</p>
                    )}
                    {kra.employee_actual_value && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Actual Value: <span className="font-medium">{kra.employee_actual_value} {kra.measurement_unit}</span>
                      </p>
                    )}
                  </div>
                )}
                
                {/* Manager's Assessment */}
                {kra.rating && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border-l-4 border-blue-200 dark:border-blue-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                        <span className="text-blue-700 dark:text-blue-300 font-medium text-sm">Your Manager Assessment</span>
                      </div>
                      <span className={`font-bold text-lg ${getRatingColor(kra.rating)}`}>
                        {kra.rating}/5
                      </span>
                    </div>
                    {kra.comments && (
                      <p className="text-gray-700 dark:text-gray-300 text-sm mt-2">{kra.comments}</p>
                    )}
                    {kra.manager_actual_value && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Actual Value: <span className="font-medium">{kra.manager_actual_value} {kra.measurement_unit}</span>
                      </p>
                    )}
                    <div className="mt-2 text-xs">
                      <span className={`px-2 py-1 rounded-full ${kra.manager_feedback_visible ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                        {kra.manager_feedback_visible ? 'Visible to employee' : 'Hidden from employee'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          }
          
          // HR/Admin/God can see everything
          if (isHrAdminGod) {
            return (
              <div className="space-y-4">
                {/* Employee Self Assessment */}
                {kra.employee_rating && (
                  <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border-l-4 border-green-200 dark:border-green-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                        <span className="text-green-700 dark:text-green-300 font-medium text-sm">Employee Self Assessment</span>
                      </div>
                      <span className={`font-bold text-lg ${getRatingColor(kra.employee_rating)}`}>
                        {kra.employee_rating}/5
                      </span>
                    </div>
                    {kra.employee_comments && (
                      <p className="text-gray-700 dark:text-gray-300 text-sm mt-2">{kra.employee_comments}</p>
                    )}
                    {kra.employee_actual_value && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Actual Value: <span className="font-medium">{kra.employee_actual_value} {kra.measurement_unit}</span>
                      </p>
                    )}
                  </div>
                )}
                
                {/* Manager Assessment */}
                {kra.rating && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border-l-4 border-blue-200 dark:border-blue-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                        <span className="text-blue-700 dark:text-blue-300 font-medium text-sm">Manager Assessment</span>
                      </div>
                      <span className={`font-bold text-lg ${getRatingColor(kra.rating)}`}>
                        {kra.rating}/5
                      </span>
                    </div>
                    {kra.comments && (
                      <p className="text-gray-700 dark:text-gray-300 text-sm mt-2">{kra.comments}</p>
                    )}
                    {kra.manager_actual_value && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Actual Value: <span className="font-medium">{kra.manager_actual_value} {kra.measurement_unit}</span>
                      </p>
                    )}
                    <div className="mt-2 text-xs">
                      <span className={`px-2 py-1 rounded-full ${kra.manager_feedback_visible ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                        {kra.manager_feedback_visible ? 'Visible to employee' : 'Hidden from employee'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          }
          
          // Default case - no assessments visible
          return null;
        })()}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Created: {new Date(kra.created_at).toLocaleDateString()}
        </div>
        <div className="flex flex-wrap gap-1">
          {/* Manager Assessment Button - Only for managers evaluating their reportees */}
          {isDirectReportee && Number(kra.user_id) !== Number(currentUserId) && (
            <Button
              size="sm"
              variant="outline"
              onClick={onEvaluate}
              title={kra.rating ? "Edit your assessment of this KRA" : "Evaluate your reportee's KRA"}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 whitespace-nowrap text-xs px-2 py-1 order-first"
            >
              <Star className="w-3 h-3 mr-1" />
              {kra.rating ? "Edit Assessment" : "Assess"}
            </Button>
          )}
          
          {/* HR/Admin Assessment Button - For HR/Admin evaluating any KRA */}
          {(userRole === 'HR' || userRole === 'Admin' || userRole === 'God') && Number(kra.user_id) !== Number(currentUserId) && !isDirectReportee && (
            <Button
              size="sm"
              variant="outline"
              onClick={onEvaluate}
              title={kra.rating ? "Edit your assessment of this KRA" : "Evaluate this KRA as HR/Admin"}
              className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 whitespace-nowrap text-xs px-2 py-1 order-first"
            >
              <Star className="w-3 h-3 mr-1" />
              {kra.rating ? "Edit Assessment" : "Assess"}
            </Button>
          )}
          
          {/* Employee Self-Assessment Button - Only for KRA owners in "My KRAs" context */}
          {showSelfAssessButton !== false && Number(kra.user_id) === Number(currentUserId) && !isDirectReportee && (
            <Button
              size="sm"
              variant="outline"
              onClick={onSelfAssess}
              title={kra.employee_rating ? "Edit your self-assessment" : "Self assess your KRA"}
              className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 whitespace-nowrap text-xs px-2 py-1"
            >
              <Star className="w-3 h-3 mr-1" />
              {kra.employee_rating ? "Edit Assessment" : "Self Assess"}
            </Button>
          )}
          
          <Button
            size="sm"
            variant="outline"
            onClick={onEdit}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 whitespace-nowrap text-xs px-2 py-1"
          >
            <Edit className="w-3 h-3 mr-1" />
            Edit KRA
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onDelete}
            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 whitespace-nowrap text-xs px-2 py-1"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
}

// Sample KRA Sheet Modal Component
function SampleKRASheetModal({
  isOpen,
  onClose,
  onStartCreating,
  kraSettings,
  kraPeriod,
  onKraPeriodChange,
  onCreateKRA,
  selectedUser,
  usersData,
  canViewTeamKRAs,
  isWeightageFull,
  kraSummary
}: {
  isOpen: boolean;
  onClose: () => void;
  onStartCreating: () => void;
  kraSettings?: KRASettings;
  kraPeriod: 'yearly' | 'quarterly' | 'half-yearly';
  onKraPeriodChange: (period: 'yearly' | 'quarterly' | 'half-yearly') => void;
  onCreateKRA: (data: CreateKRARequest) => void;
  selectedUser: string;
  usersData?: any[];
  canViewTeamKRAs: boolean;
  isWeightageFull: boolean;
  kraSummary?: KRASummary;
}) {
  const [activeTab, setActiveTab] = useState<'samples' | 'create'>('samples');
  
  // Switch to samples tab if weightage is full and user is on create tab
  useEffect(() => {
    if (isWeightageFull && activeTab === 'create') {
      setActiveTab('samples');
    }
  }, [isWeightageFull, activeTab]);
  const [formData, setFormData] = useState<CreateKRARequest>({
    title: '',
    description: '',
    target_value: '0',
    measurement_unit: '',
    weight: 1,
    year: new Date().getFullYear(),
    user_id: selectedUser,
  });

  const sampleKRAs = [
    {
      title: "Sales Revenue Target",
      description: "Achieve monthly sales revenue target of ₹50,00,000",
      target_value: 5000000,
      measurement_unit: "INR",
      weight: 30,
      domain: "Sales"
    },
    {
      title: "Customer Satisfaction Score",
      description: "Maintain customer satisfaction score above 4.5/5",
      target_value: 4.5,
      measurement_unit: "Rating",
      weight: 25,
      domain: "Customer Service"
    },
    {
      title: "Project Delivery Timeline",
      description: "Complete 95% of projects within agreed timeline",
      target_value: 95,
      measurement_unit: "Percentage",
      weight: 20,
      domain: "Project Management"
    },
    {
      title: "Team Training Hours",
      description: "Conduct 40 hours of team training per quarter",
      target_value: 40,
      measurement_unit: "Hours",
      weight: 15,
      domain: "Human Resources"
    },
    {
      title: "Process Improvement Initiatives",
      description: "Implement 3 process improvement initiatives",
      target_value: 3,
      measurement_unit: "Count",
      weight: 10,
      domain: "Operations"
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateKRA(formData);
  };

  const handleInputChange = (field: keyof CreateKRARequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculateRemainingWeight = () => {
    // Get existing KRAs total weight for the current user and year
    const existingWeight = kraSummary?.total_weight || 0;
    return Math.max(0, 100 - existingWeight - formData.weight);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Sample KRA Formats & Creation
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          <Tabs
            tabs={[
              { id: 'samples', label: 'Sample Formats', icon: '📋' },
              ...(isWeightageFull ? [] : [{ id: 'create', label: 'Create KRA', icon: '➕' }]),
            ]}
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab as 'samples' | 'create')}
          />

          {activeTab === 'samples' && (
            <div className="mt-6">
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Sample KRA Formats
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Here are some sample KRAs to help you understand the format and structure. 
                  You can use these as templates for creating your own KRAs.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {sampleKRAs.map((sample, index) => (
                  <Card key={index} className="p-4">
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">{sample.title}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{sample.description}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Target:</span>
                          <span className="ml-2 font-medium text-gray-900 dark:text-white">
                            {sample.target_value} {sample.measurement_unit}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Weight:</span>
                          <span className="ml-2 font-medium text-gray-900 dark:text-white">
                            {sample.weight}%
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-500 dark:text-gray-400">Domain:</span>
                          <span className="ml-2 font-medium text-gray-900 dark:text-white">
                            {sample.domain}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">💡 Tips for Creating Effective KRAs:</h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Make your KRAs specific and measurable</li>
                  <li>• Set realistic but challenging targets</li>
                  <li>• Ensure KRAs align with company objectives</li>
                  <li>• Use appropriate measurement units</li>
                  <li>• Distribute weight across different areas</li>
                </ul>
              </div>

              <div className="flex justify-end mt-6">
                <Button
                  onClick={onStartCreating}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 dark:from-blue-500 dark:to-purple-500 dark:hover:from-blue-600 dark:hover:to-purple-600 text-white shadow-lg"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Start Creating KRAs
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'create' && (
            <div className="mt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      KRA Title *
                    </label>
                    <Input
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      placeholder="Enter KRA title"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Period *
                    </label>
                    <Select
                      value={kraPeriod}
                      onChange={(e) => onKraPeriodChange(e.target.value as 'yearly' | 'quarterly' | 'half-yearly')}
                      options={[
                        { value: 'yearly', label: 'Yearly' },
                        { value: 'half-yearly', label: 'Half-yearly' },
                        { value: 'quarterly', label: 'Quarterly' }
                      ]}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Describe the KRA in detail"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      rows={3}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Target Value *
                    </label>
                <Input
                  type="text"
                  value={formData.target_value}
                  onChange={(e) => handleInputChange('target_value', e.target.value)}
                  placeholder="Enter target value"
                  required
                />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Measurement Unit *
                    </label>
                    <Input
                      value={formData.measurement_unit}
                      onChange={(e) => handleInputChange('measurement_unit', e.target.value)}
                      placeholder="e.g., INR, Hours, Percentage"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Weightage (%) *
                    </label>
                    <div className="space-y-2">
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={formData.weight}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          const existingWeight = kraSummary?.total_weight || 0;
                          const maxAllowed = Math.min(100, 100 - existingWeight);
                          const clampedValue = Math.min(maxAllowed, Math.max(1, value));
                          handleInputChange('weight', clampedValue);
                        }}
                        placeholder="Enter weight percentage"
                        required
                      />
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Remaining weight: {calculateRemainingWeight()}%
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, formData.weight)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {canViewTeamKRAs && usersData && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Assign to User
                      </label>
                      <Select
                        value={selectedUser}
                        onChange={(e) => handleInputChange('user_id', parseInt(e.target.value))}
                        options={usersData?.map((user) => ({
                          value: user.id.toString(),
                          label: `${user.name} (${user.email})`
                        })) || []}
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isWeightageFull}
                    className={`shadow-lg ${
                      isWeightageFull 
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
                    }`}
                    title={isWeightageFull ? "Cannot create more KRAs - weightage limit reached (100%)" : ""}
                  >
                    Create KRA
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Create KRA Modal Component
function CreateKRAModal({
  isOpen,
  onClose,
  onSubmit,
  kraSettings,
  kraPeriod,
  onKraPeriodChange,
  selectedUser,
  usersData,
  canViewTeamKRAs,
  isWeightageFull,
  kraSummary
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateKRARequest) => void;
  kraSettings?: KRASettings;
  kraPeriod: 'yearly' | 'quarterly' | 'half-yearly';
  onKraPeriodChange: (period: 'yearly' | 'quarterly' | 'half-yearly') => void;
  selectedUser: string;
  usersData?: any[];
  canViewTeamKRAs: boolean;
  isWeightageFull: boolean;
  kraSummary?: KRASummary;
}) {
  const [formData, setFormData] = useState<CreateKRARequest>({
    title: '',
    description: '',
    target_value: '0',
    measurement_unit: '',
    weight: 1,
    year: new Date().getFullYear(),
    user_id: selectedUser,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleInputChange = (field: keyof CreateKRARequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculateRemainingWeight = () => {
    // Get existing KRAs total weight for the current user and year
    const existingWeight = kraSummary?.total_weight || 0;
    return Math.max(0, 100 - existingWeight - formData.weight);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create New KRA</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                KRA Title *
              </label>
              <Input
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter KRA title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Period *
              </label>
              <Select
                value={kraPeriod}
                onChange={(e) => onKraPeriodChange(e.target.value as 'yearly' | 'quarterly' | 'half-yearly')}
                options={[
                  { value: 'yearly', label: 'Yearly' },
                  { value: 'half-yearly', label: 'Half-yearly' },
                  { value: 'quarterly', label: 'Quarterly' }
                ]}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe the KRA in detail"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                rows={3}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Target Value *
              </label>
                <Input
                  type="text"
                  value={formData.target_value}
                  onChange={(e) => handleInputChange('target_value', e.target.value)}
                  placeholder="Enter target value"
                  required
                />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Measurement Unit *
              </label>
              <Input
                value={formData.measurement_unit}
                onChange={(e) => handleInputChange('measurement_unit', e.target.value)}
                placeholder="e.g., INR, Hours, Percentage"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Weightage (%) *
              </label>
              <div className="space-y-2">
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={formData.weight}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          const existingWeight = kraSummary?.total_weight || 0;
                          const maxAllowed = Math.min(100, 100 - existingWeight);
                          const clampedValue = Math.min(maxAllowed, Math.max(1, value));
                          handleInputChange('weight', clampedValue);
                        }}
                        placeholder="Enter weight percentage"
                        required
                      />
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Remaining weight: {calculateRemainingWeight()}%
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${formData.weight}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {canViewTeamKRAs && usersData && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Assign to User
                </label>
                <Select
                  value={selectedUser}
                  onChange={(e) => handleInputChange('user_id', parseInt(e.target.value))}
                  options={usersData?.map((user) => ({
                    value: user.id.toString(),
                    label: `${user.name} (${user.email})`
                  })) || []}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isWeightageFull}
              className={`shadow-lg ${
                isWeightageFull 
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
              }`}
              title={isWeightageFull ? "Cannot create more KRAs - weightage limit reached (100%)" : ""}
            >
              Create KRA
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit KRA Modal Component
function EditKRAModal({
  isOpen,
  onClose,
  onSubmit,
  kra,
  kraSettings
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UpdateKRARequest) => void;
  kra: KRA;
  kraSettings?: KRASettings;
}) {
  const [formData, setFormData] = useState<UpdateKRARequest>({
    title: kra.title,
    description: kra.description,
    target_value: kra.target_value,
    measurement_unit: kra.measurement_unit,
    weight: kra.weight,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleInputChange = (field: keyof UpdateKRARequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Edit KRA</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                KRA Title *
              </label>
              <Input
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter KRA title"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe the KRA in detail"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                rows={3}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Target Value *
              </label>
                <Input
                  type="text"
                  value={formData.target_value}
                  onChange={(e) => handleInputChange('target_value', e.target.value)}
                  placeholder="Enter target value"
                  required
                />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Measurement Unit *
              </label>
              <Input
                value={formData.measurement_unit}
                onChange={(e) => handleInputChange('measurement_unit', e.target.value)}
                placeholder="e.g., INR, Hours, Percentage"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Weightage (%) *
              </label>
              <Input
                type="number"
                min="1"
                max="100"
                value={formData.weight}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  const clampedValue = Math.min(100, Math.max(1, value));
                  handleInputChange('weight', clampedValue);
                }}
                placeholder="Enter weight percentage"
                required
              />
            </div>

          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 dark:from-blue-500 dark:to-purple-500 dark:hover:from-blue-600 dark:hover:to-purple-600 text-white shadow-lg"
            >
              Update KRA
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Evaluate KRA Modal Component
function EvaluateKRAModal({
  isOpen,
  onClose,
  onSubmit,
  kra,
  kraSettings
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EvaluateKRARequest) => void;
  kra: KRA;
  kraSettings?: KRASettings;
}) {
  const [employeeSide, setEmployeeSide] = useState({
    actual_value: kra.employee_actual_value || '',
    rating: kra.employee_rating || 0,
    comments: kra.employee_comments || '',
  });
  const [managerSide, setManagerSide] = useState<EvaluateKRARequest>({
    rating: kra.rating || 0,
    comments: kra.comments || '',
    actual_value: kra.manager_actual_value || '',
    manager_feedback_visible: kra.manager_feedback_visible || false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(managerSide);
  };

  const handleManagerChange = (field: keyof EvaluateKRARequest, value: any) => {
    setManagerSide(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Assess KRA</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">{kra.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{kra.description}</p>
            <div className="mt-2 text-sm">
              <span className="text-gray-500 dark:text-gray-400">Target: </span>
              <span className="font-medium text-gray-900 dark:text-white">
                {kra.target_value} {kra.measurement_unit}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Employee side (read-only for manager) */}
            <div className="p-4 rounded-lg border-l-4 border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20">
              <div className="flex items-center mb-3">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <h4 className="font-medium text-green-800 dark:text-green-300">Employee Assessment</h4>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-green-700 dark:text-green-400 mb-2">Actual Value</label>
                  <Input type="text" value={employeeSide.actual_value || 'Not provided'} disabled className="bg-green-100 dark:bg-green-800/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-green-700 dark:text-green-400 mb-2">Employee Rating</label>
                  <Input type="text" value={employeeSide.rating ? `${employeeSide.rating}/5` : 'Not rated'} disabled className="bg-green-100 dark:bg-green-800/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-green-700 dark:text-green-400 mb-2">Employee Comments</label>
                  <textarea 
                    value={employeeSide.comments || 'No comments provided'} 
                    disabled 
                    className="w-full px-3 py-2 border border-green-300 dark:border-green-600 rounded-md bg-green-100 dark:bg-green-800/50 text-green-800 dark:text-green-300" 
                    rows={4} 
                  />
                </div>
              </div>
            </div>

            {/* Manager side (editable for manager) */}
            <div className="p-4 rounded-lg border-l-4 border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-center mb-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                <h4 className="font-medium text-blue-800 dark:text-blue-300">Manager Assessment</h4>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Actual Value *</label>
                  <Input type="text" value={managerSide.actual_value} onChange={(e) => handleManagerChange('actual_value', e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Manager Rating (1-5) *</label>
                  <Select value={managerSide.rating} onChange={(e) => handleManagerChange('rating', parseInt(e.target.value))} options={[{ value: '0', label: 'Select Rating' }, { value: '1', label: '1 - Poor' }, { value: '2', label: '2 - Below Average' }, { value: '3', label: '3 - Average' }, { value: '4', label: '4 - Good' }, { value: '5', label: '5 - Excellent' }]} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Manager Comments</label>
                  <textarea value={managerSide.comments} onChange={(e) => handleManagerChange('comments', e.target.value)} placeholder="Provide detailed feedback on performance" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white" rows={4} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="manager_feedback_visible"
                checked={managerSide.manager_feedback_visible || false}
                onChange={(e) => handleManagerChange('manager_feedback_visible', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="manager_feedback_visible" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Make manager feedback visible to employee
              </label>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-7">
              When checked, the employee will be able to see your rating and comments
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 dark:from-green-500 dark:to-blue-500 dark:hover:from-green-600 dark:hover:to-blue-600 text-white shadow-lg"
            >
              Submit Assessment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Self-Assess KRA Modal Component
function SelfAssessKRAModal({
  isOpen,
  onClose,
  onSubmit,
  kra,
  kraSettings
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SelfAssessKRARequest) => void;
  kra: KRA;
  kraSettings?: KRASettings;
}) {
  const [formData, setFormData] = useState<SelfAssessKRARequest>({
    actual_value: kra.actual_value || '',
    employee_rating: kra.employee_rating || 1,
    employee_comments: kra.employee_comments || '',
  });

  const handleInputChange = (field: keyof SelfAssessKRARequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
              <h2 className="text-xl font-semibold text-purple-800 dark:text-purple-300">
                Self Assessment: {kra.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Actual Value */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Actual Value Achieved *
                </label>
                <Input
                  type="text"
                  value={formData.actual_value}
                  onChange={(e) => handleInputChange('actual_value', e.target.value)}
                  placeholder={`Enter actual value in ${kra.measurement_unit}`}
                  className="w-full"
                  required
                />
              </div>

              {/* Employee Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Employee Rating (1-5) *
                </label>
                <Select
                  value={formData.employee_rating.toString()}
                  onChange={(e) => handleInputChange('employee_rating', parseFloat(e.target.value))}
                  className="w-full"
                  options={[
                    { value: '1', label: '1 - Needs Improvement' },
                    { value: '2', label: '2 - Below Expectations' },
                    { value: '3', label: '3 - Meets Expectations' },
                    { value: '4', label: '4 - Exceeds Expectations' },
                    { value: '5', label: '5 - Outstanding' },
                  ]}
                />
              </div>
            </div>

            {/* Assessment Comments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Assessment Comments
              </label>
              <textarea
                value={formData.employee_comments}
                onChange={(e) => handleInputChange('employee_comments', e.target.value)}
                placeholder="Describe your achievements, challenges faced, and areas for improvement"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                rows={4}
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 dark:from-purple-500 dark:to-pink-500 dark:hover:from-purple-600 dark:hover:to-pink-600 text-white shadow-lg"
              >
                Submit Assessment
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Team KRAs Section Component
function TeamKRASection({
  selectedYear,
  selectedUser,
  setSelectedUser,
  usersData,
  teamKRAs,
  loadingTeamKRAs,
  onShowCreateModal,
  onShowEditModal,
  onShowEvaluateModal,
  onShowSelfAssessModal,
  onDeleteKRA,
  userRole,
  kraSettings,
  kraPeriod,
  onKraPeriodChange,
  isWeightageFull,
  userId,
  user
}: {
  selectedYear: number;
  selectedUser: string;
  setSelectedUser: (userId: string) => void;
  usersData?: any[];
  teamKRAs?: KRA[];
  loadingTeamKRAs: boolean;
  onShowCreateModal: () => void;
  onShowEditModal: (kra: KRA) => void;
  onShowEvaluateModal: (kra: KRA) => void;
  onShowSelfAssessModal: (kra: KRA) => void;
  onDeleteKRA: (id: string) => void;
  userRole: string;
  kraSettings?: KRASettings;
  kraPeriod: 'yearly' | 'quarterly' | 'half-yearly';
  onKraPeriodChange: (period: 'yearly' | 'quarterly' | 'half-yearly') => void;
  isWeightageFull: boolean;
  userId: string;
  user?: any;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const getManagerName = (managerId?: number) => {
    if (!managerId) return '';
    const mgr = usersData?.find((u: any) => Number(u.id) === Number(managerId));
    return mgr?.name || '';
  };

  // Filter users based on search term
  const filteredUsers = usersData?.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Also fetch current user's own KRAs so their tile shows correct counts even if team API excludes self
  const { data: ownKRAsForTiles } = useQuery({
    queryKey: ['team-tiles-own-kras', userId, selectedYear],
    queryFn: () => getUserKRAs(String(userId), selectedYear),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Paginate users
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const selectedUserData = usersData?.find(user => String(user.id) === selectedUser);

  // Calculate selected user's weightage for button state
  // Fallback: if viewing own profile in Team KRAs, include own KRAs (not returned by /kras/team)
  const { data: ownKRAsFallback } = useQuery({
    queryKey: ['team-selected-user-kras', selectedUser, selectedYear],
    queryFn: () => getUserKRAs(String(selectedUser), selectedYear),
    enabled: Boolean(selectedUser && String(selectedUser) === String(userId)),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const selectedUserKRAsRaw = teamKRAs?.filter(kra => kra.user_id === Number(selectedUser)) || [];
  const selectedUserKRAs = (selectedUserKRAsRaw.length > 0)
    ? selectedUserKRAsRaw
    : (String(selectedUser) === String(userId) ? (ownKRAsFallback?.data || []) : []);
  const totalWeightage = selectedUserKRAs.reduce((sum, kra) => sum + kra.weight, 0);
  const isSelectedUserWeightageFull = selectedUser ? totalWeightage >= 100 : false;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Team KRAs</h2>
        <Button
          onClick={onShowCreateModal}
          disabled={!selectedUser || isSelectedUserWeightageFull}
          className={`shadow-lg ${
            !selectedUser || isSelectedUserWeightageFull
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
              : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
          }`}
          title={!selectedUser ? "Please select a team member first" : isSelectedUserWeightageFull ? "Cannot create more KRAs - weightage limit reached (100%)" : ""}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create KRA for Team Member
        </Button>
      </div>

      {/* User Selection */}
      <Card className="p-4">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search Team Members
            </label>
            <Input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by name or email..."
              className="w-full"
            />
          </div>

          {paginatedUsers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {paginatedUsers.map((user) => {
                // Calculate total weightage for this user
                const teamSideKRAs = teamKRAs?.filter(kra => kra.user_id === Number(user.id)) || [];
                const isCurrentUser = Number(user.id) === Number(userId);
                const userKRAs = isCurrentUser ? (ownKRAsForTiles?.data || teamSideKRAs) : teamSideKRAs;
                const totalWeightage = userKRAs.reduce((sum, kra) => sum + kra.weight, 0);
                
                return (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUser(String(user.id))}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      selectedUser === String(user.id)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{user.email}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-500 capitalize">{user.role}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      Manager: {getManagerName(user.manager_id) || '—'}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-500">
                        {userKRAs.length} KRA{userKRAs.length !== 1 ? 's' : ''}
                      </span>
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                        {userKRAs.length > 0 ? `${totalWeightage.toFixed(1)}% weight` : 'No KRAs'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              No team members found
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="flex items-center px-3 py-1 text-sm text-gray-600 dark:text-gray-400">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Selected User's KRAs */}
      {selectedUserData && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                KRAs for {selectedUserData.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedUserData.email} • {selectedUserData.role}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Select
                value={kraPeriod}
                onChange={(e) => onKraPeriodChange(e.target.value as 'yearly' | 'quarterly' | 'half-yearly')}
                className="w-32"
                options={[
                  { value: 'yearly', label: 'Yearly' },
                  { value: 'half-yearly', label: 'Half-yearly' },
                  { value: 'quarterly', label: 'Quarterly' }
                ]}
              />
            </div>
          </div>

          {loadingTeamKRAs ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Loading KRAs...</p>
            </div>
          ) : (() => {
            return selectedUserKRAs.length > 0 ? (
              <div className="space-y-4">
                {/* Summary for selected user */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total KRAs</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {selectedUserKRAs.length}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                      <BarChart3 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Weight</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {totalWeightage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* KRAs Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {selectedUserKRAs.map((kra) => (
                    <KRACard
                      key={kra.id}
                      kra={kra}
                      onEdit={() => onShowEditModal(kra)}
                      onDelete={() => onDeleteKRA(String(kra.id))}
                      onEvaluate={() => onShowEvaluateModal(kra)}
                      onSelfAssess={() => onShowSelfAssessModal(kra)}
                      userRole={userRole}
                      currentUserId={userId}
                      currentUserManagerId={user?.manager_id}
                      isDirectReportee={kra.user?.manager_id === Number(userId)} // Check if this user's manager is the current user
                      showSelfAssessButton={false}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <Target className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No KRAs Found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {selectedUserData.name} doesn't have any KRAs for {selectedYear}.
              </p>
              <Button
                onClick={onShowCreateModal}
                disabled={isSelectedUserWeightageFull}
                className={`shadow-lg ${
                  isSelectedUserWeightageFull 
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
                }`}
                title={isSelectedUserWeightageFull ? "Cannot create more KRAs - weightage limit reached (100%)" : ""}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create KRA
              </Button>
            </div>
            );
          })()}
        </Card>
      )}
    </div>
  );
}

// Reportees KRAs Section Component
function ReporteesKRASection({
  selectedYear,
  reporteesKRAs,
  loadingReporteesKRAs,
  onShowEditModal,
  onShowEvaluateModal,
  onShowSelfAssessModal,
  onDeleteKRA,
  userRole,
  userId,
  user
}: {
  selectedYear: number;
  reporteesKRAs?: KRA[];
  loadingReporteesKRAs: boolean;
  onShowEditModal: (kra: KRA) => void;
  onShowEvaluateModal: (kra: KRA) => void;
  onShowSelfAssessModal: (kra: KRA) => void;
  onDeleteKRA: (id: string) => void;
  userRole: string;
  userId: string;
  user?: any;
}) {
  // Use server-scoped data (backend already returns direct reportees only)
  const directReporteesKRAs = (reporteesKRAs || []);

  // Group KRAs by user
  const krasByUser = directReporteesKRAs.reduce((acc, kra) => {
    const userId = kra.user_id;
    if (!acc[userId]) {
      acc[userId] = {
        user: kra.user,
        kras: []
      };
    }
    acc[userId].kras.push(kra);
    return acc;
  }, {} as Record<number, { user: any; kras: KRA[] }>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            All Reportees KRAs - {selectedYear}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            View and manage KRAs for all your direct reportees
          </p>
        </div>
        {directReporteesKRAs.length > 0 && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {directReporteesKRAs.length} reportee{directReporteesKRAs.length !== 1 ? 's' : ''} with KRAs
          </div>
        )}
      </div>

      {loadingReporteesKRAs ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading reportees KRAs...</p>
        </div>
      ) : Object.keys(krasByUser).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(krasByUser).map(([userKey, { user, kras }]) => (
            <ReporteeGroupCard
              key={userKey}
              user={user}
              kras={kras}
              userRole={userRole}
              currentUserId={userId}
              currentUserManagerId={user?.manager_id}
              onShowEditModal={onShowEditModal}
              onShowEvaluateModal={onShowEvaluateModal}
              onShowSelfAssessModal={onShowSelfAssessModal}
              onDeleteKRA={onDeleteKRA}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Reportees Found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            You don't have any direct reportees with KRAs for {selectedYear}.
          </p>
        </div>
      )}
    </div>
  );
}

// Reportee group card with bulk assess and ratings visibility
function ReporteeGroupCard({
  user,
  kras,
  userRole,
  currentUserId,
  currentUserManagerId,
  onShowEditModal,
  onShowEvaluateModal,
  onShowSelfAssessModal,
  onDeleteKRA,
}: {
  user: any;
  kras: KRA[];
  userRole: string;
  currentUserId: string;
  currentUserManagerId?: number;
  onShowEditModal: (kra: KRA) => void;
  onShowEvaluateModal: (kra: KRA) => void;
  onShowSelfAssessModal: (kra: KRA) => void;
  onDeleteKRA: (id: string) => void;
}) {
  const totalWeightage = kras.reduce((sum, k) => sum + k.weight, 0);
  const queryClient = useQueryClient();
  const [showBulkAssess, setShowBulkAssess] = useState(false);
  const [bulkItems, setBulkItems] = useState<BulkEvaluateKRAItem[]>(kras.map(k => ({
    kra_id: String(k.id),
    manager_actual_value: k.manager_actual_value || '',
    rating: k.rating || 0,
    comments: k.comments || '',
    manager_feedback_visible: k.manager_feedback_visible || false,
  })));
  const [allVisible, setAllVisible] = useState<boolean>(false);
  const bulkMutation = useMutation({
    mutationFn: bulkEvaluateKRAs,
    onSuccess: () => {
      toast.success('Assessments submitted');
      // Refresh relevant caches so ratings show up immediately
      queryClient.invalidateQueries({ queryKey: ['reportees-kras'] });
      queryClient.invalidateQueries({ queryKey: ['team-kras'] });
      queryClient.invalidateQueries({ queryKey: ['user-kras'] });
      queryClient.invalidateQueries({ queryKey: ['kra-summary'] });
      setShowBulkAssess(false);
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to submit assessments'),
  });

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {user?.name || 'Unknown User'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {user?.email || 'No email'} • {user?.role || 'No role'}
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {kras.length} KRA{kras.length !== 1 ? 's' : ''}
          </div>
          <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
            {kras.length > 0 ? `${totalWeightage.toFixed(1)}% total weight` : 'No KRAs'}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {kras.length} KRA{kras.length !== 1 ? 's' : ''} • {totalWeightage.toFixed(1)}% total weight
        </div>
        <Button
          onClick={() => setShowBulkAssess(true)}
          className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white shadow"
        >
          Assess All
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {kras.map((kra) => (
          <KRACard
            key={kra.id}
            kra={kra}
            onEdit={() => onShowEditModal(kra)}
            onDelete={() => onDeleteKRA(String(kra.id))}
            onEvaluate={() => onShowEvaluateModal(kra)}
            onSelfAssess={() => onShowSelfAssessModal(kra)}
            userRole={userRole}
            currentUserId={currentUserId}
            currentUserManagerId={currentUserManagerId}
            isDirectReportee={true}
            showSelfAssessButton={false}
          />
        ))}
      </div>

      {showBulkAssess && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Assess All KRAs - {user?.name}</h3>
              <button onClick={() => setShowBulkAssess(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <input
                  id={`visible_all_${user?.id || 'user'}`}
                  type="checkbox"
                  checked={allVisible}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setAllVisible(checked);
                    setBulkItems(prev => prev.map(item => ({ ...item, manager_feedback_visible: checked })));
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor={`visible_all_${user?.id || 'user'}`} className="text-sm text-gray-700 dark:text-gray-300">
                  Visible to all
                </label>
              </div>
              {kras.map((k, idx) => (
                <div key={k.id} className="p-3 rounded border border-gray-200 dark:border-gray-700">
                  <div className="font-medium text-gray-900 dark:text-white mb-2">{k.title}</div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <Input
                      label="Actual Value"
                      value={bulkItems[idx]?.manager_actual_value || ''}
                      onChange={(e) => {
                        const copy = [...bulkItems];
                        copy[idx] = { ...copy[idx], manager_actual_value: e.target.value };
                        setBulkItems(copy);
                      }}
                    />
                    <Select
                      label="Rating"
                      value={String(bulkItems[idx]?.rating || 0)}
                      onChange={(e) => {
                        const copy = [...bulkItems];
                        copy[idx] = { ...copy[idx], rating: parseInt(e.target.value) };
                        setBulkItems(copy);
                      }}
                      options={[{ value: '0', label: 'Select' }, { value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' }, { value: '4', label: '4' }, { value: '5', label: '5' }]}
                    />
                  </div>
                  <div className="mt-2">
                    <textarea
                      placeholder="Manager comments"
                      value={bulkItems[idx]?.comments || ''}
                      onChange={(e) => {
                        const copy = [...bulkItems];
                        copy[idx] = { ...copy[idx], comments: e.target.value };
                        setBulkItems(copy);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      rows={3}
                    />
                  </div>
                </div>
              ))}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowBulkAssess(false)}>Cancel</Button>
                <Button
                  onClick={() => bulkMutation.mutate(bulkItems)}
                  disabled={bulkMutation.isPending}
                  className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
                >
                  {bulkMutation.isPending ? 'Submitting…' : 'Submit All'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
