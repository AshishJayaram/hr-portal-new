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
import { Plus, Edit, Trash2, CheckCircle, Clock, Target, TrendingUp, Users } from "lucide-react";

export default function KRAPage() {
  const user = getCurrentUser();
  const userId = user?.id || "1";
  const userRole = user?.role || "Employee";
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<'my-kras' | 'team-kras'>('my-kras');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEvaluateModal, setShowEvaluateModal] = useState(false);
  const [selectedKRA, setSelectedKRA] = useState<KRA | null>(null);
  const [selectedUser, setSelectedUser] = useState<string>(userId);

  // Check if user can view team KRAs (managers, HR, Admin, God)
  const canViewTeamKRAs = userRole === "HR" || userRole === "Admin" || userRole === "God" || 
    (userRole === "Employee" && user?.manager_id); // Employees with managers can view their team

  // Fetch users for manager selection
  const { data: usersData } = useQuery({
    queryKey: ["users"],
    queryFn: () => getUsers({}),
    staleTime: 300000, // Cache for 5 minutes
  });

  // Fetch KRA settings for customizable fields
  const { data: kraSettings } = useQuery({
    queryKey: ["kra-settings"],
    queryFn: getKRASettings,
    staleTime: 300000, // Cache for 5 minutes
  });

  // Fetch user's KRAs
  const { data: userKRAs, isLoading: loadingUserKRAs } = useQuery({
    queryKey: ["user-kras", selectedUser, selectedYear],
    queryFn: () => getUserKRAs(selectedUser, selectedYear),
    enabled: activeTab === 'my-kras',
    staleTime: 60000,
  });

  // Fetch team KRAs
  const { data: teamKRAs, isLoading: loadingTeamKRAs } = useQuery({
    queryKey: ["team-kras", selectedYear],
    queryFn: () => getTeamKRAs(selectedYear),
    enabled: Boolean(activeTab === 'team-kras' && canViewTeamKRAs),
    staleTime: 60000,
  });

  // Fetch KRA summary
  const { data: kraSummary } = useQuery({
    queryKey: ["kra-summary", selectedUser, selectedYear],
    queryFn: () => getKRASummary(selectedUser, selectedYear),
    enabled: activeTab === 'my-kras',
    staleTime: 60000,
  });

  // Create KRA mutation
  const createKRAMutation = useMutation({
    mutationFn: (data: CreateKRARequest) => createKRA(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-kras"] });
      queryClient.invalidateQueries({ queryKey: ["team-kras"] });
      queryClient.invalidateQueries({ queryKey: ["kra-summary"] });
      setShowCreateModal(false);
      toast.success("KRA created successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create KRA");
    },
  });

  // Update KRA mutation
  const updateKRAMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateKRARequest }) => updateKRA(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-kras"] });
      queryClient.invalidateQueries({ queryKey: ["team-kras"] });
      queryClient.invalidateQueries({ queryKey: ["kra-summary"] });
      setShowEditModal(false);
      setSelectedKRA(null);
      toast.success("KRA updated successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update KRA");
    },
  });

  // Delete KRA mutation
  const deleteKRAMutation = useMutation({
    mutationFn: (id: string) => deleteKRA(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-kras"] });
      queryClient.invalidateQueries({ queryKey: ["team-kras"] });
      queryClient.invalidateQueries({ queryKey: ["kra-summary"] });
      toast.success("KRA deleted successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete KRA");
    },
  });

  // Evaluate KRA mutation
  const evaluateKRAMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EvaluateKRARequest }) => evaluateKRA(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-kras"] });
      queryClient.invalidateQueries({ queryKey: ["team-kras"] });
      queryClient.invalidateQueries({ queryKey: ["kra-summary"] });
      setShowEvaluateModal(false);
      setSelectedKRA(null);
      toast.success("KRA evaluated successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to evaluate KRA");
    },
  });

  const handleCreateKRA = (data: CreateKRARequest) => {
    createKRAMutation.mutate(data);
  };

  const handleUpdateKRA = (data: UpdateKRARequest) => {
    if (selectedKRA) {
      updateKRAMutation.mutate({ id: selectedKRA.id, data });
    }
  };

  const handleDeleteKRA = (id: string) => {
    if (confirm("Are you sure you want to delete this KRA?")) {
      deleteKRAMutation.mutate(id);
    }
  };

  const handleEvaluateKRA = (data: EvaluateKRARequest) => {
    if (selectedKRA) {
      evaluateKRAMutation.mutate({ id: selectedKRA.id, data });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20';
      case 'active': return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20';
      case 'draft': return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20';
      case 'cancelled': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20';
    }
  };

  const getRatingColor = (rating?: number) => {
    if (!rating) return 'text-gray-500';
    if (rating >= 4.5) return 'text-green-600 dark:text-green-400';
    if (rating >= 3.5) return 'text-blue-600 dark:text-blue-400';
    if (rating >= 2.5) return 'text-yellow-600 dark:text-yellow-400';
    if (rating >= 1.5) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const tabs = [
    {
      id: 'my-kras',
      label: 'My KRAs',
      icon: <Target className="h-4 w-4" />,
      count: userKRAs?.data?.length || 0,
    },
    ...(canViewTeamKRAs ? [{
      id: 'team-kras',
      label: 'Team KRAs',
      icon: <Users className="h-4 w-4" />,
      count: teamKRAs?.data?.length || 0,
    }] : []),
  ];

  return (
    <RoleGuard allowedRoles={["Employee", "HR", "Admin", "God"]}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Key Result Areas (KRA)
          </h1>
          <div className="flex items-center gap-4">
            <Select
              value={selectedYear.toString()}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              options={[
                { value: (new Date().getFullYear() - 1).toString(), label: (new Date().getFullYear() - 1).toString() },
                { value: new Date().getFullYear().toString(), label: new Date().getFullYear().toString() },
                { value: (new Date().getFullYear() + 1).toString(), label: (new Date().getFullYear() + 1).toString() },
              ]}
            />
            {activeTab === 'my-kras' && (userRole === "HR" || userRole === "Admin" || userRole === "God") && (
              <Select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                options={usersData?.data?.map((u: any) => ({
                  value: u.id.toString(),
                  label: u.name,
                })) || []}
              />
            )}
            {activeTab === 'my-kras' && (
              <Button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add KRA
              </Button>
            )}
          </div>
        </div>

        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as 'my-kras' | 'team-kras')}
        />

        {activeTab === 'my-kras' && (
          <div className="space-y-6">
            {/* KRA Summary */}
            {kraSummary && (
              <Card>
                <h2 className="text-xl font-semibold mb-4">Performance Summary - {selectedYear}</h2>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {kraSummary.total_kras}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total KRAs</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {kraSummary.completed_kras}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {kraSummary.average_rating.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Avg Rating</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {kraSummary.overall_rating}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Overall</div>
                  </div>
                </div>
              </Card>
            )}

            {/* User KRAs */}
            <Card>
              <h2 className="text-xl font-semibold mb-4">My KRAs - {selectedYear}</h2>
              {loadingUserKRAs ? (
                <div className="text-center py-8">Loading KRAs...</div>
              ) : userKRAs?.data?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No KRAs found for {selectedYear}. Create your first KRA to get started.
                </div>
              ) : (
                <div className="space-y-4">
                  {userKRAs?.data?.map((kra: KRA) => (
                    <div key={kra.id} className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{kra.title}</h3>
                          {kra.description && (
                            <p className="text-gray-600 dark:text-gray-400 mt-1">{kra.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(kra.status)}`}>
                            {kra.status}
                          </span>
                          {kra.rating && (
                            <span className={`text-sm font-medium ${getRatingColor(kra.rating)}`}>
                              {kra.rating}/5
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Weight:</span>
                          <span className="ml-2 font-medium">{kra.weight}%</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Target:</span>
                          <span className="ml-2 font-medium">{kra.target_value} {kra.measurement_unit}</span>
                        </div>
                        {kra.actual_value && (
                          <div>
                            <span className="text-gray-500">Actual:</span>
                            <span className="ml-2 font-medium">{kra.actual_value} {kra.measurement_unit}</span>
                          </div>
                        )}
                      </div>

                      {kra.comments && (
                        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="text-sm text-gray-600 dark:text-gray-400">Manager Comments:</div>
                          <div className="text-sm mt-1">{kra.comments}</div>
                        </div>
                      )}

                      {kra.employee_comments && (
                        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <div className="text-sm text-gray-600 dark:text-gray-400">Employee Comments:</div>
                          <div className="text-sm mt-1">{kra.employee_comments}</div>
                        </div>
                      )}

                      <div className="flex justify-end gap-2 mt-4">
                        {kra.status !== 'completed' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedKRA(kra);
                                setShowEditModal(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {(userRole === "HR" || userRole === "Admin" || userRole === "God") && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedKRA(kra);
                                  setShowEvaluateModal(true);
                                }}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteKRA(kra.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {activeTab === 'team-kras' && canViewTeamKRAs && (
          <div className="space-y-6">
            <Card>
              <h2 className="text-xl font-semibold mb-4">Team KRAs - {selectedYear}</h2>
              {loadingTeamKRAs ? (
                <div className="text-center py-8">Loading team KRAs...</div>
              ) : teamKRAs?.data?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No team KRAs found for {selectedYear}.
                </div>
              ) : (
                <div className="space-y-4">
                  {teamKRAs?.data?.map((kra: KRA) => (
                    <div key={kra.id} className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{kra.title}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Employee: {kra.user?.name || 'Unknown'}
                          </p>
                          {kra.description && (
                            <p className="text-gray-600 dark:text-gray-400 mt-1">{kra.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(kra.status)}`}>
                            {kra.status}
                          </span>
                          {kra.rating && (
                            <span className={`text-sm font-medium ${getRatingColor(kra.rating)}`}>
                              {kra.rating}/5
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Weight:</span>
                          <span className="ml-2 font-medium">{kra.weight}%</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Target:</span>
                          <span className="ml-2 font-medium">{kra.target_value} {kra.measurement_unit}</span>
                        </div>
                        {kra.actual_value && (
                          <div>
                            <span className="text-gray-500">Actual:</span>
                            <span className="ml-2 font-medium">{kra.actual_value} {kra.measurement_unit}</span>
                          </div>
                        )}
                      </div>

                      {kra.comments && (
                        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="text-sm text-gray-600 dark:text-gray-400">Manager Comments:</div>
                          <div className="text-sm mt-1">{kra.comments}</div>
                        </div>
                      )}

                      <div className="flex justify-end gap-2 mt-4">
                        {kra.status !== 'completed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedKRA(kra);
                              setShowEvaluateModal(true);
                            }}
                          >
                            <CheckCircle className="h-4 w-4" />
                            Evaluate
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Create KRA Modal */}
        {showCreateModal && (
          <CreateKRAModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreateKRA}
            isLoading={createKRAMutation.isPending}
            year={selectedYear}
            userId={selectedUser}
            users={usersData?.data || []}
            kraSettings={kraSettings}
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
            isLoading={updateKRAMutation.isPending}
            kra={selectedKRA}
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
            onSubmit={handleEvaluateKRA}
            isLoading={evaluateKRAMutation.isPending}
            kra={selectedKRA}
          />
        )}
      </div>
    </RoleGuard>
  );
}

// Create KRA Modal Component
function CreateKRAModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  isLoading, 
  year, 
  userId, 
  users,
  kraSettings
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateKRARequest) => void;
  isLoading: boolean;
  year: number;
  userId: string;
  users: any[];
  kraSettings?: KRASettings;
}) {
  const [formData, setFormData] = useState<CreateKRARequest>({
    user_id: userId,
    year,
    title: '',
    description: '',
    weight: 0,
    target_value: '',
    measurement_unit: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.title && formData.target_value && formData.measurement_unit && formData.weight > 0) {
      onSubmit(formData);
    }
  };

  const renderField = (field: any) => {
    const value = formData[field.id as keyof CreateKRARequest] || '';
    
    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            value={value as string}
            onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
            placeholder={field.placeholder}
            rows={3}
          />
        );
      case 'select':
        return (
          <select
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            value={value as string}
            onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
          >
            <option value="">Select {field.name}</option>
            {field.options?.map((option: string) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
      case 'number':
      case 'percentage':
        return (
          <input
            type="number"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            value={value as string}
            onChange={(e) => setFormData({ ...formData, [field.id]: parseFloat(e.target.value) || 0 })}
            placeholder={field.placeholder}
            min={field.type === 'percentage' ? 0 : undefined}
            max={field.type === 'percentage' ? 100 : undefined}
            step={field.type === 'percentage' ? 0.1 : undefined}
          />
        );
      default:
        return (
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            value={value as string}
            onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
            placeholder={field.placeholder}
          />
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Create New KRA</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {kraSettings?.default_fields?.map((field) => (
            <div key={field.id}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {field.name}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {renderField(field)}
              {field.help_text && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{field.help_text}</p>
              )}
            </div>
          ))}
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create KRA"}
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
  isLoading, 
  kra 
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UpdateKRARequest) => void;
  isLoading: boolean;
  kra: KRA;
}) {
  const [formData, setFormData] = useState<UpdateKRARequest>({
    title: kra.title,
    description: kra.description || '',
    weight: kra.weight,
    target_value: kra.target_value,
    measurement_unit: kra.measurement_unit,
    status: kra.status,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Edit KRA</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Title"
            value={formData.title || ''}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
          <Input
            label="Description"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Weight (%)"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={formData.weight || 0}
              onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
              required
            />
            <Input
              label="Measurement Unit"
              value={formData.measurement_unit || ''}
              onChange={(e) => setFormData({ ...formData, measurement_unit: e.target.value })}
              required
            />
          </div>
          <Input
            label="Target Value"
            value={formData.target_value || ''}
            onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
            required
          />
          <Select
            label="Status"
            value={formData.status || 'draft'}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            options={[
              { value: 'draft', label: 'Draft' },
              { value: 'active', label: 'Active' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update KRA"}
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
  isLoading, 
  kra 
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EvaluateKRARequest) => void;
  isLoading: boolean;
  kra: KRA;
}) {
  const [formData, setFormData] = useState<EvaluateKRARequest>({
    actual_value: kra.actual_value || '',
    rating: kra.rating || 0,
    comments: kra.comments || '',
    employee_comments: kra.employee_comments || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.actual_value && formData.rating > 0) {
      onSubmit(formData);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Evaluate KRA: {kra.title}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Actual Value"
            value={formData.actual_value}
            onChange={(e) => setFormData({ ...formData, actual_value: e.target.value })}
            required
          />
          <Input
            label="Rating (1-5)"
            type="number"
            min="1"
            max="5"
            step="0.1"
            value={formData.rating}
            onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) || 0 })}
            required
          />
          <Input
            label="Manager Comments"
            value={formData.comments}
            onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
          />
          <Input
            label="Employee Comments"
            value={formData.employee_comments}
            onChange={(e) => setFormData({ ...formData, employee_comments: e.target.value })}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Evaluating..." : "Evaluate KRA"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
