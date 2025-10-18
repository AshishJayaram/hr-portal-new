"use client";

import { useState, useEffect } from "react";
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
  getKRASummary,
  getUsers,
  getKRASettings,
  type KRA,
  type CreateKRARequest,
  type UpdateKRARequest,
  type EvaluateKRARequest,
  type KRASummary,
  type KRASettings
} from "@/lib/api";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Tabs from "@/components/ui/Tabs";
import RoleGuard from "@/components/RoleGuard";
import { Plus, Edit, Trash2, CheckCircle, Clock, Target, TrendingUp, Users, BookOpen, Star } from "lucide-react";

export default function KRAPage() {
  const user = getCurrentUser();
  const userId = user?.id || "1";
  const userRole = user?.role || "Employee";
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<'my-kras' | 'team-kras'>('my-kras');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showSampleSheet, setShowSampleSheet] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEvaluateModal, setShowEvaluateModal] = useState(false);
  const [selectedKRA, setSelectedKRA] = useState<KRA | null>(null);
  const [selectedUser, setSelectedUser] = useState<string>(userId);
  const [kraPeriod, setKraPeriod] = useState<'yearly' | 'quarterly' | 'half-yearly'>('yearly');
  const [currentStep, setCurrentStep] = useState<'tracker' | 'sample' | 'create'>('tracker');

  // Check if user can view team KRAs (managers, HR, Admin, God)
  const canViewTeamKRAs = userRole === "HR" || userRole === "Admin" || userRole === "God" || 
    (userRole === "Employee" && user?.manager_id); // Employees with managers can view their team

  // Fetch users for manager selection
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers(),
    enabled: Boolean(canViewTeamKRAs),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Fetch KRA settings
  const { data: kraSettings } = useQuery({
    queryKey: ['kra-settings'],
    queryFn: () => getKRASettings(),
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
      queryClient.invalidateQueries({ queryKey: ['user-kras'] });
      queryClient.invalidateQueries({ queryKey: ['team-kras'] });
      queryClient.invalidateQueries({ queryKey: ['kra-summary'] });
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
      queryClient.invalidateQueries({ queryKey: ['user-kras'] });
      queryClient.invalidateQueries({ queryKey: ['team-kras'] });
      queryClient.invalidateQueries({ queryKey: ['kra-summary'] });
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
      queryClient.invalidateQueries({ queryKey: ['user-kras'] });
      queryClient.invalidateQueries({ queryKey: ['team-kras'] });
      queryClient.invalidateQueries({ queryKey: ['kra-summary'] });
      toast.success("KRA deleted successfully!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete KRA");
    },
  });

  // Evaluate KRA mutation
  const evaluateKRAMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EvaluateKRARequest }) => evaluateKRA(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-kras'] });
      queryClient.invalidateQueries({ queryKey: ['team-kras'] });
      queryClient.invalidateQueries({ queryKey: ['kra-summary'] });
      setShowEvaluateModal(false);
      setSelectedKRA(null);
      toast.success("KRA evaluated successfully!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to evaluate KRA");
    },
  });

  // Check if user has any KRAs
  const hasKRAs = userKRAs?.data && userKRAs.data.length > 0;

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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
        </div>
      )}

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'my-kras', label: 'My KRAs', icon: '🎯' },
          ...(canViewTeamKRAs ? [{ id: 'team-kras', label: 'Team KRAs', icon: '👥' }] : []),
        ]}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as 'my-kras' | 'team-kras')}
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
                className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900"
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
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userKRAs.data.map((kra) => (
                <KRACard
                  key={kra.id}
                  kra={kra}
                  onEdit={() => handleEditKRA(kra)}
                  onDelete={() => handleDeleteKRA(String(kra.id))}
                  onEvaluate={() => handleEvaluateKRA(kra)}
                  userRole={userRole}
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
              </p>You haven't created any KRAs yet. Start by exploring sample formats or creating your first KRA.


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
          onDeleteKRA={handleDeleteKRA}
          userRole={userRole}
          kraSettings={kraSettings}
          kraPeriod={kraPeriod}
          onKraPeriodChange={setKraPeriod}
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
  userRole 
}: { 
  kra: KRA; 
  onEdit: () => void; 
  onDelete: () => void; 
  onEvaluate: () => void; 
  userRole: string; 
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
    <Card className="p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{kra.title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{kra.description}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(kra.status)}`}>
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
        {kra.actual_value && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Current:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {kra.actual_value} {kra.measurement_unit}
            </span>
          </div>
        )}
        {kra.rating && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Rating:</span>
            <span className={`font-medium ${getRatingColor(kra.rating)}`}>
              {kra.rating}/5
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Created: {new Date(kra.created_at).toLocaleDateString()}
        </div>
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onEdit}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <Edit className="w-3 h-3 mr-1" />
            Edit
          </Button>
          {(userRole === 'HR' || userRole === 'Admin' || userRole === 'God') && (
            <Button
              size="sm"
              variant="outline"
              onClick={onEvaluate}
              className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
            >
              <Star className="w-3 h-3 mr-1" />
              Evaluate
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={onDelete}
            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
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
  canViewTeamKRAs
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
}) {
  const [activeTab, setActiveTab] = useState<'samples' | 'create'>('samples');
  const [formData, setFormData] = useState<CreateKRARequest>({
    title: '',
    description: '',
    target_value: '0',
    measurement_unit: '',
    weight: 0,
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
    return Math.max(0, 100 - formData.weight);
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
              { id: 'create', label: 'Create KRA', icon: '➕' },
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
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
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
                        min="0"
                        max="100"
                        value={formData.weight}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          const clampedValue = Math.min(100, Math.max(0, value));
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
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
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
  canViewTeamKRAs
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
}) {
  const [formData, setFormData] = useState<CreateKRARequest>({
    title: '',
    description: '',
    target_value: '0',
    measurement_unit: '',
    weight: 0,
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
    return Math.max(0, 100 - formData.weight);
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
                        min="0"
                        max="100"
                        value={formData.weight}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          const clampedValue = Math.min(100, Math.max(0, value));
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
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
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
                min="0"
                max="100"
                value={formData.weight}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  const clampedValue = Math.min(100, Math.max(0, value));
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
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
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
  const [formData, setFormData] = useState<EvaluateKRARequest>({
    rating: kra.rating || 0,
    comments: kra.comments || '',
    actual_value: kra.actual_value || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleInputChange = (field: keyof EvaluateKRARequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Evaluate KRA</h2>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Actual Value *
              </label>
              <Input
                type="text"
                value={formData.actual_value}
                onChange={(e) => handleInputChange('actual_value', e.target.value)}
                placeholder="Enter actual achieved value"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rating (1-5) *
              </label>
              <Select
                value={formData.rating}
                onChange={(e) => handleInputChange('rating', parseInt(e.target.value))}
                options={[
                  { value: '0', label: 'Select Rating' },
                  { value: '1', label: '1 - Poor' },
                  { value: '2', label: '2 - Below Average' },
                  { value: '3', label: '3 - Average' },
                  { value: '4', label: '4 - Good' },
                  { value: '5', label: '5 - Excellent' }
                ]}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Evaluation Comments
              </label>
              <textarea
                value={formData.comments}
                onChange={(e) => handleInputChange('comments', e.target.value)}
                placeholder="Provide detailed feedback on performance"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                rows={4}
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
              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white shadow-lg"
            >
              Submit Evaluation
            </Button>
          </div>
        </form>
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
  onDeleteKRA,
  userRole,
  kraSettings,
  kraPeriod,
  onKraPeriodChange
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
  onDeleteKRA: (id: string) => void;
  userRole: string;
  kraSettings?: KRASettings;
  kraPeriod: 'yearly' | 'quarterly' | 'half-yearly';
  onKraPeriodChange: (period: 'yearly' | 'quarterly' | 'half-yearly') => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter users based on search term
  const filteredUsers = usersData?.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Paginate users
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const selectedUserData = usersData?.find(user => String(user.id) === selectedUser);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Team KRAs</h2>
        <Button
          onClick={onShowCreateModal}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
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
              {paginatedUsers.map((user) => (
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
                </button>
              ))}
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
          ) : teamKRAs && teamKRAs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teamKRAs.map((kra) => (
                <KRACard
                  key={kra.id}
                  kra={kra}
                  onEdit={() => onShowEditModal(kra)}
                  onDelete={() => onDeleteKRA(String(kra.id))}
                  onEvaluate={() => onShowEvaluateModal(kra)}
                  userRole={userRole}
                />
              ))}
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
                This team member doesn't have any KRAs yet.
              </p>
              <Button
                onClick={onShowCreateModal}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create KRA
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}