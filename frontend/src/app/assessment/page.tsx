'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Star, 
  Save, 
  Users, 
  Target, 
  BarChart3,
  CheckCircle,
  AlertCircle,
  User,
  UserCheck
} from 'lucide-react';
import { 
  getUserKRAs, 
  getReporteesKRAs, 
  evaluateKRA, 
  selfAssessKRA,
  bulkEvaluateKRAs,
  bulkSelfAssessKRAs,
  getUser,
  KRA,
  EvaluateKRARequest,
  SelfAssessKRARequest,
  BulkEvaluateKRAItem,
  BulkSelfAssessKRAItem,
  BulkAssessmentResponse,
  User as UserType
} from '@/lib/api';

interface AssessmentData {
  kraId: string;
  actualValue: string;
  rating: number;
  comments: string;
  managerFeedbackVisible?: boolean; // Only for manager assessments
}

interface UserAssessmentData {
  userId: string;
  userName: string;
  kras: AssessmentData[];
}

export default function AssessmentPage() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [assessmentMode, setAssessmentMode] = useState<'self' | 'manager'>('self');
  const [assessmentData, setAssessmentData] = useState<UserAssessmentData[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const queryClient = useQueryClient();

  // Get current user
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: getUser,
    staleTime: 10 * 60 * 1000,
  });

  const userRole = user?.role || 'Employee';
  const userId = user?.id || '';

  // Get user's own KRAs
  const { data: userKRAs, isLoading: loadingUserKRAs } = useQuery({
    queryKey: ['user-kras', userId, selectedYear],
    queryFn: () => getUserKRAs(userId, selectedYear),
    enabled: Boolean(userId),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Get reportees KRAs (for managers)
  const { data: reporteesKRAs, isLoading: loadingReporteesKRAs } = useQuery({
    queryKey: ['reportees-kras', selectedYear],
    queryFn: () => getReporteesKRAs(selectedYear),
    enabled: Boolean(userId && (userRole === 'HR' || userRole === 'Admin' || userRole === 'God' || assessmentMode === 'manager')),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Filter reportees KRAs to only direct reportees
  const directReporteesKRAs = (reporteesKRAs?.data || []).filter((kra) => {
    const managerIdOfOwner = kra.user?.manager_id;
    return Number(managerIdOfOwner) === Number(userId) && Number(kra.user_id) !== Number(userId);
  });

  // Initialize assessment data when KRAs are loaded
  useEffect(() => {
    if (assessmentMode === 'self' && userKRAs?.data) {
      const selfAssessmentData: UserAssessmentData = {
        userId: userId,
        userName: user?.name || 'You',
        kras: userKRAs.data.map((kra) => ({
          kraId: String(kra.id),
          actualValue: kra.employee_actual_value || '',
          rating: kra.employee_rating || 0,
          comments: kra.employee_comments || '',
        }))
      };
      setAssessmentData([selfAssessmentData]);
    } else if (assessmentMode === 'manager' && directReporteesKRAs.length > 0) {
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

      const managerAssessmentData: UserAssessmentData[] = Object.values(krasByUser).map(({ user, kras }) => ({
        userId: String(user.id),
        userName: user.name,
        kras: kras.map((kra) => ({
          kraId: String(kra.id),
          actualValue: kra.manager_actual_value || '',
          rating: kra.rating || 0,
          comments: kra.comments || '',
          managerFeedbackVisible: kra.manager_feedback_visible || false,
        }))
      }));
      setAssessmentData(managerAssessmentData);
    }
  }, [assessmentMode, userKRAs, directReporteesKRAs, userId, user?.name]);

  // Mutations
  const evaluateKRAMutation = useMutation({
    mutationFn: ({ kraId, data }: { kraId: string; data: EvaluateKRARequest }) =>
      evaluateKRA(kraId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reportees-kras'] });
      queryClient.invalidateQueries({ queryKey: ['user-kras'] });
    },
  });

  const selfAssessKRAMutation = useMutation({
    mutationFn: ({ kraId, data }: { kraId: string; data: SelfAssessKRARequest }) =>
      selfAssessKRA(kraId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-kras'] });
    },
  });

  const handleAssessmentChange = (userIndex: number, kraIndex: number, field: keyof AssessmentData, value: any) => {
    setAssessmentData(prev => {
      const newData = [...prev];
      newData[userIndex].kras[kraIndex] = {
        ...newData[userIndex].kras[kraIndex],
        [field]: value
      };
      return newData;
    });
  };

  const handleSubmitAll = async () => {
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      let response: BulkAssessmentResponse;

      if (assessmentMode === 'self') {
        // Prepare bulk self-assessment data
        const assessments: BulkSelfAssessKRAItem[] = [];
        for (const userData of assessmentData) {
          for (const kraData of userData.kras) {
            assessments.push({
              kra_id: kraData.kraId,
              employee_actual_value: kraData.actualValue,
              employee_rating: kraData.rating,
              employee_comments: kraData.comments,
            });
          }
        }
        response = await bulkSelfAssessKRAs(assessments);
      } else {
        // Prepare bulk manager assessment data
        const assessments: BulkEvaluateKRAItem[] = [];
        for (const userData of assessmentData) {
          for (const kraData of userData.kras) {
            assessments.push({
              kra_id: kraData.kraId,
              manager_actual_value: kraData.actualValue,
              rating: kraData.rating,
              comments: kraData.comments,
              manager_feedback_visible: kraData.managerFeedbackVisible,
            });
          }
        }
        response = await bulkEvaluateKRAs(assessments);
      }

      // Check if all assessments were successful
      if (response.error_count === 0) {
        setSubmitStatus('success');
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['user-kras'] });
        queryClient.invalidateQueries({ queryKey: ['reportees-kras'] });
        
        // Reset form after successful submission
        setTimeout(() => {
          setSubmitStatus('idle');
          // Reload data to show updated assessments
          window.location.reload();
        }, 2000);
      } else {
        setSubmitStatus('error');
        console.error('Some assessments failed:', response.results.filter(r => !r.success));
      }

    } catch (error) {
      console.error('Assessment submission failed:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'text-green-600 dark:text-green-400';
    if (rating >= 3) return 'text-yellow-600 dark:text-yellow-400';
    if (rating >= 2) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const isLoading = loadingUserKRAs || loadingReporteesKRAs;
  const hasData = assessmentData.length > 0 && assessmentData.some(user => user.kras.length > 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {assessmentMode === 'self' ? 'Self Assessment' : 'Manager Assessment'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {assessmentMode === 'self' 
                  ? 'Assess all your KRAs for the selected year'
                  : 'Assess all your reportees\' KRAs for the selected year'
                }
              </p>
            </div>
            
            {/* Mode Toggle */}
            <div className="flex items-center space-x-4">
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setAssessmentMode('self')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    assessmentMode === 'self'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <User className="w-4 h-4 mr-2 inline" />
                  Self Assessment
                </button>
                <button
                  onClick={() => setAssessmentMode('manager')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    assessmentMode === 'manager'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Users className="w-4 h-4 mr-2 inline" />
                  Manager Assessment
                </button>
              </div>
            </div>
          </div>

          {/* Year Selector */}
          <div className="mt-6 flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Assessment Year:
            </label>
            <Select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              options={[
                { value: '2024', label: '2024' },
                { value: '2025', label: '2025' },
                { value: '2026', label: '2026' },
              ]}
            />
          </div>
        </div>

        {/* Status Messages */}
        {submitStatus === 'success' && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-3" />
              <p className="text-green-800 dark:text-green-300 font-medium">
                All assessments submitted successfully!
              </p>
            </div>
          </div>
        )}

        {submitStatus === 'error' && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-3" />
              <p className="text-red-800 dark:text-red-300 font-medium">
                Failed to submit assessments. Please try again.
              </p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-4">Loading KRAs...</p>
          </div>
        )}

        {/* No Data State */}
        {!isLoading && !hasData && (
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <Target className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No KRAs Found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {assessmentMode === 'self' 
                ? 'You don\'t have any KRAs for the selected year.'
                : 'Your reportees don\'t have any KRAs for the selected year.'
              }
            </p>
          </div>
        )}

        {/* Assessment Forms */}
        {!isLoading && hasData && (
          <div className="space-y-8">
            {assessmentData.map((userData, userIndex) => (
              <Card key={userData.userId} className="p-6">
                <div className="mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-4">
                        <UserCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                          {userData.userName}
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {userData.kras.length} KRA{userData.kras.length !== 1 ? 's' : ''} to assess
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Total Weight</div>
                        <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                          {userData.kras.reduce((sum, kra) => {
                            // Get the original KRA data to access weight
                            const originalKra = assessmentMode === 'self' 
                              ? userKRAs?.data?.find(k => String(k.id) === kra.kraId)
                              : directReporteesKRAs.find(k => String(k.id) === kra.kraId);
                            return sum + (originalKra?.weight || 0);
                          }, 0).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* KRAs Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {userData.kras.map((kraData, kraIndex) => {
                    const originalKra = assessmentMode === 'self' 
                      ? userKRAs?.data?.find(k => String(k.id) === kraData.kraId)
                      : directReporteesKRAs.find(k => String(k.id) === kraData.kraId);

                    if (!originalKra) return null;

                    return (
                      <div key={kraData.kraId} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                        <div className="mb-4">
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                            {originalKra.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {originalKra.description}
                          </p>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">
                              Target: {originalKra.target_value} {originalKra.measurement_unit}
                            </span>
                            <span className="font-medium text-blue-600 dark:text-blue-400">
                              {originalKra.weight}% weight
                            </span>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {/* Actual Value */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Actual Value *
                            </label>
                            <Input
                              type="text"
                              value={kraData.actualValue}
                              onChange={(e) => handleAssessmentChange(userIndex, kraIndex, 'actualValue', e.target.value)}
                              placeholder="Enter actual value achieved"
                              required
                            />
                          </div>

                          {/* Rating */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Rating (1-5) *
                            </label>
                            <Select
                              value={kraData.rating}
                              onChange={(e) => handleAssessmentChange(userIndex, kraIndex, 'rating', parseInt(e.target.value))}
                              options={[
                                { value: '0', label: 'Select Rating' },
                                { value: '1', label: '1 - Poor' },
                                { value: '2', label: '2 - Below Average' },
                                { value: '3', label: '3 - Average' },
                                { value: '4', label: '4 - Good' },
                                { value: '5', label: '5 - Excellent' },
                              ]}
                            />
                          </div>

                          {/* Comments */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Comments
                            </label>
                            <textarea
                              value={kraData.comments}
                              onChange={(e) => handleAssessmentChange(userIndex, kraIndex, 'comments', e.target.value)}
                              placeholder="Add your comments..."
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                              rows={3}
                            />
                          </div>

                          {/* Manager Feedback Visibility (only for manager assessments) */}
                          {assessmentMode === 'manager' && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <Checkbox
                                  id={`feedback-visible-${kraData.kraId}`}
                                  checked={kraData.managerFeedbackVisible || false}
                                  onChange={(checked) => handleAssessmentChange(userIndex, kraIndex, 'managerFeedbackVisible', checked)}
                                />
                                <label htmlFor={`feedback-visible-${kraData.kraId}`} className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Make feedback visible to employee
                                </label>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
                                When checked, the employee will be able to see your rating and comments
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}

            {/* Submit Button */}
            <div className="flex justify-center pt-6">
              <Button
                onClick={handleSubmitAll}
                disabled={isSubmitting}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg px-8 py-3 text-lg"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-3" />
                    Submit All Assessments
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
