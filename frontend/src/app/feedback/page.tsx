"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Loader from "@/components/Loader";
import { 
  Bug, 
  Lightbulb, 
  MessageSquare, 
  AlertCircle, 
  Plus,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Info,
  TrendingUp,
  TrendingDown,
  BarChart3,
  HelpCircle,
  Zap,
  Target,
  Calendar
} from "lucide-react";
import { getCurrentUser, createFeedback, getFeedback, getFeedbackStats, updateFeedbackStatus, deleteFeedback } from "@/lib/api";
import RoleGuard from "@/components/RoleGuard";
import { useMemo } from "react";

interface Feedback {
  id: string;
  title: string;
  description: string;
  type: 'bug' | 'feature' | 'improvement' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  user: {
    name: string;
    email: string;
  };
}

export default function FeedbackPage() {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('');
  const [priority, setPriority] = useState('medium');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showGuidelines, setShowGuidelines] = useState(false);
  // Track editing state per feedback item
  const [editingStates, setEditingStates] = useState<Record<string, { status: string; resolution: string }>>({});

  const queryClient = useQueryClient();

  const { data: feedback, isLoading } = useQuery({
    queryKey: ["feedback", statusFilter, typeFilter],
    queryFn: async () => {
      const res = await getFeedback();
      // Optionally filter client-side until server supports filters
      let items = res?.data || [];
      if (statusFilter) items = items.filter((i: any) => i.status === statusFilter);
      if (typeFilter) items = items.filter((i: any) => i.type === typeFilter);
      return { data: items };
    }
  });

  // Calculate comprehensive statistics from feedback data
  const stats = useMemo(() => {
    const items = feedback?.data || [];
    const now = Date.now();
    
    // Calculate average resolution time for resolved items
    const resolvedItems = items.filter((i: any) => i.status === 'resolved' || i.status === 'closed');
    let avgResolutionDays = 0;
    if (resolvedItems.length > 0) {
      const totalDays = resolvedItems.reduce((sum: number, item: any) => {
        const created = new Date(item.created_at).getTime();
        const updated = item.updated_at ? new Date(item.updated_at).getTime() : now;
        const days = (updated - created) / (1000 * 60 * 60 * 24);
        return sum + days;
      }, 0);
      avgResolutionDays = Math.round(totalDays / resolvedItems.length);
    }

    // Calculate items by this week/month
    const thisWeek = items.filter((i: any) => {
      const daysAgo = (now - new Date(i.created_at).getTime()) / (1000 * 60 * 60 * 24);
      return daysAgo <= 7;
    }).length;
    
    const thisMonth = items.filter((i: any) => {
      const daysAgo = (now - new Date(i.created_at).getTime()) / (1000 * 60 * 60 * 24);
      return daysAgo <= 30;
    }).length;

    // Find most common type
    const typeCounts = {
      bug: items.filter((i: any) => i.type === 'bug').length,
      feature: items.filter((i: any) => i.type === 'feature').length,
      improvement: items.filter((i: any) => i.type === 'improvement').length,
      other: items.filter((i: any) => i.type === 'other').length,
    };
    const mostCommonType = Object.entries(typeCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0];

    return {
      total: items.length,
      byStatus: {
        open: items.filter((i: any) => i.status === 'open').length,
        in_progress: items.filter((i: any) => i.status === 'in_progress').length,
        resolved: items.filter((i: any) => i.status === 'resolved').length,
        closed: items.filter((i: any) => i.status === 'closed').length,
      },
      byType: {
        bug: typeCounts.bug,
        feature: typeCounts.feature,
        improvement: typeCounts.improvement,
        other: typeCounts.other,
      },
      byPriority: {
        critical: items.filter((i: any) => i.priority === 'critical').length,
        high: items.filter((i: any) => i.priority === 'high').length,
        medium: items.filter((i: any) => i.priority === 'medium').length,
        low: items.filter((i: any) => i.priority === 'low').length,
      },
      recent: thisWeek,
      thisMonth,
      avgResolutionDays,
      mostCommonType,
      resolutionRate: items.length > 0 
        ? Math.round(((resolvedItems.length) / items.length) * 100)
        : 0,
      urgentCount: items.filter((i: any) => i.priority === 'critical' || i.priority === 'high').length,
    };
  }, [feedback]);

  const createFeedbackMutation = useMutation({
    mutationFn: async (data: any) => {
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('description', data.description);
      formData.append('type', data.type);
      formData.append('priority', data.priority);
      
      return await createFeedback(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
      setShowForm(false);
      resetForm();
    }
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setType('');
    setPriority('medium');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !type) {
      alert("Please fill in all required fields");
      return;
    }

    createFeedbackMutation.mutate({
      title,
      description,
      type,
      priority
    });
  };

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, resolution }: { id: string; status: string; resolution?: string }) => {
      return await updateFeedbackStatus(id, status, resolution);
    },
    onSuccess: (_, variables) => {
      // Invalidate all feedback queries to refresh list and stats
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
      queryClient.invalidateQueries({ queryKey: ["god-feedback"] });
      queryClient.invalidateQueries({ queryKey: ["feedback-stats"] });
      // Clear editing state for this specific item
      setEditingStates(prev => {
        const next = { ...prev };
        delete next[variables.id];
        return next;
      });
    },
    onError: (error: any) => {
      alert(`Failed to update status: ${error?.message || 'Unknown error'}`);
    },
  });

  const deleteFeedbackMutation = useMutation({
    mutationFn: async (id: string) => {
      return await deleteFeedback(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
    },
  });

  const handleStatusUpdate = (id: string) => {
    // Ensure we're using a numeric ID, not a fallback string like "idx-0"
    if (id.startsWith('idx-')) {
      console.error('❌ Cannot update feedback: Invalid ID format', id);
      alert("Error: Invalid feedback ID. Please refresh the page and try again.");
      return;
    }
    
    const editingState = editingStates[id];
    if (!editingState || !editingState.status) {
      alert("Please select a status");
      return;
    }
    updateStatusMutation.mutate({ 
      id: String(id), // Ensure it's a string of the numeric ID
      status: editingState.status,
      resolution: editingState.resolution || undefined 
    });
  };

  const startEditing = (id: string, currentStatus: string) => {
    setEditingStates(prev => ({
      ...prev,
      [id]: {
        status: currentStatus,
        resolution: ''
      }
    }));
  };

  const cancelEditing = (id: string) => {
    setEditingStates(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const updateEditingStatus = (id: string, status: string) => {
    setEditingStates(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        status
      }
    }));
  };

  const updateEditingResolution = (id: string, resolution: string) => {
    setEditingStates(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        resolution
      }
    }));
  };

  const handleDelete = (id: string) => {
    // Ensure we're using a numeric ID, not a fallback string like "idx-0"
    if (id.startsWith('idx-')) {
      console.error('❌ Cannot delete feedback: Invalid ID format', id);
      alert("Error: Invalid feedback ID. Please refresh the page and try again.");
      return;
    }
    
    if (!confirm("Are you sure you want to delete this feedback?")) {
      return;
    }
    deleteFeedbackMutation.mutate(String(id));
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bug':
        return <Bug className="h-4 w-4 text-red-400" />;
      case 'feature':
        return <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case 'improvement':
        return <MessageSquare className="h-4 w-4 text-green-400" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'text-red-600 dark:text-red-300 bg-red-500/30 border-red-500/40 dark:border-red-500/40 border';
      case 'high':
        return 'text-orange-600 dark:text-orange-300 bg-orange-500/30 border-orange-500/40 dark:border-orange-500/40 border';
      case 'medium':
        return 'text-amber-600 dark:text-amber-300 bg-amber-500/30 border-amber-500/40 dark:border-amber-500/40 border';
      case 'low':
        return 'text-green-600 dark:text-green-300 bg-green-500/30 border-green-500/40 dark:border-green-500/40 border';
      default:
        return 'text-gray-600 dark:text-gray-300 bg-gray-500/30 border-gray-500/40 dark:border-gray-500/40 border';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case 'in_progress':
        return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'closed':
        return <XCircle className="h-4 w-4 text-gray-400" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'text-blue-600 dark:text-blue-300 bg-blue-500/30 border-blue-500/40 dark:border-blue-500/40 border';
      case 'in_progress':
        return 'text-amber-600 dark:text-amber-300 bg-amber-500/30 border-amber-500/40 dark:border-amber-500/40 border';
      case 'resolved':
        return 'text-green-600 dark:text-green-300 bg-green-500/30 border-green-500/40 dark:border-green-500/40 border';
      case 'closed':
        return 'text-gray-600 dark:text-gray-300 bg-gray-500/30 border-gray-500/40 dark:border-gray-500/40 border';
      default:
        return 'text-gray-600 dark:text-gray-300 bg-gray-500/30 border-gray-500/40 dark:border-gray-500/40 border';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) return <Loader />;

  return (
    <RoleGuard allowedRoles={["God"]} fallback={<div className="p-6">You do not have permission to view feedback.</div>}>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Feedback & Bug Reports
          </h1>
          <p className="text-secondary dark:text-gray-400 mt-2 text-sm max-w-2xl">
            Track and manage all user feedback, bug reports, and feature requests. Use the comprehensive statistics and insights below to monitor trends, identify patterns, and prioritize your development efforts effectively.
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowGuidelines(!showGuidelines)}
            title="View submission guidelines"
          >
            <HelpCircle className="h-4 w-4 mr-2" />
            Guidelines
          </Button>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Submit Feedback
        </Button>
      </div>
      </div>

      {/* Guidelines Modal */}
      {showGuidelines && (
        <Card className="p-6 bg-card/95 backdrop-blur-sm border border-card dark:bg-gray-900/60 dark:border-gray-700/50">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
              <h3 className="text-lg font-semibold text-primary dark:text-white">Feedback Submission Guidelines</h3>
            </div>
            <button
              onClick={() => setShowGuidelines(false)}
              className="text-muted hover:text-primary dark:text-gray-400 dark:hover:text-white transition-colors"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-4 text-sm text-secondary dark:text-gray-300">
            <div>
              <h4 className="font-semibold text-primary dark:text-white mb-2 flex items-center gap-2">
                <Bug className="h-4 w-4 text-red-500 dark:text-red-400" />
                Bug Reports
              </h4>
              <ul className="list-disc list-inside space-y-1 text-secondary dark:text-gray-400 ml-4">
                <li>Describe what happened vs. what you expected</li>
                <li>Include steps to reproduce the issue</li>
                <li>Mention your browser/device and any error messages</li>
                <li>Attach screenshots if possible</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-primary dark:text-white mb-2 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                Feature Requests
              </h4>
              <ul className="list-disc list-inside space-y-1 text-secondary dark:text-gray-400 ml-4">
                <li>Explain the problem you're trying to solve</li>
                <li>Describe how the feature would work from your perspective</li>
                <li>Explain the benefit/value it would provide</li>
                <li>Consider if existing features already solve this need</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-primary dark:text-white mb-2 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-green-500 dark:text-green-400" />
                Improvements
              </h4>
              <ul className="list-disc list-inside space-y-1 text-secondary dark:text-gray-400 ml-4">
                <li>Identify the current limitation or friction point</li>
                <li>Suggest specific enhancements</li>
                <li>Explain the expected improvement in user experience</li>
              </ul>
            </div>
            <div className="pt-3 border-t border-card dark:border-white/20">
              <p className="text-xs text-muted dark:text-gray-500">
                <strong className="text-secondary dark:text-gray-400">Priority Guide:</strong> Use <span className="text-red-500 dark:text-red-400">Critical</span> for blocking issues, 
                <span className="text-orange-500 dark:text-orange-400"> High</span> for important items, 
                <span className="text-amber-500 dark:text-amber-400"> Medium</span> for moderate impact, 
                and <span className="text-green-500 dark:text-green-400"> Low</span> for nice-to-have items.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Info Banner */}
      <Card className="p-4 bg-indigo-500/10 border-indigo-500/20 dark:border-indigo-500/30">
        <div className="flex items-start gap-3">
          <Lightbulb className="h-5 w-5 text-indigo-500 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-primary dark:text-white mb-1">Understanding Feedback Types</h3>
            <div className="text-xs text-secondary dark:text-gray-400 leading-relaxed space-y-1">
              <p>
                <strong className="text-primary dark:text-white">Bug Reports</strong> help us identify and fix issues quickly. Include reproduction steps and error details.
              </p>
              <p>
                <strong className="text-primary dark:text-white">Feature Requests</strong> guide our product roadmap. Describe the problem and proposed solution.
              </p>
              <p>
                <strong className="text-primary dark:text-white">Improvements</strong> help us enhance existing features. Specify what needs refinement and why.
              </p>
              <p className="text-muted dark:text-gray-500 mt-2">
                All feedback is reviewed within 2-3 business days and tracked through its lifecycle from submission to resolution.
            </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Create Feedback Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-primary dark:text-white">Submit Feedback</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-muted hover:text-primary dark:text-gray-400 dark:hover:text-white transition-colors"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-primary dark:text-white mb-2">
                  Title *
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Brief description of the issue or suggestion"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-primary dark:text-white mb-2">
                  Type *
                </label>
                <Select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  options={[
                    { value: '', label: 'Select type' },
                    { value: 'bug', label: 'Bug Report' },
                    { value: 'feature', label: 'Feature Request' },
                    { value: 'improvement', label: 'Improvement' },
                    { value: 'other', label: 'Other' }
                  ]}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-primary dark:text-white mb-2">
                  Priority
                </label>
                <Select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  options={[
                    { value: 'low', label: 'Low' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'high', label: 'High' },
                    { value: 'critical', label: 'Critical' }
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-primary dark:text-white mb-2">
                  Description *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please provide detailed information about the issue or suggestion..."
                  className="w-full px-3 py-2 bg-card border border-card text-primary placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/20 dark:bg-white/30 dark:text-white dark:placeholder:text-gray-400 dark:focus:ring-offset-transparent rounded-lg"
                  rows={6}
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createFeedbackMutation.isPending}
                >
                  {createFeedbackMutation.isPending ? "Submitting..." : "Submit Feedback"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-blue-500/10 border-blue-500/20 dark:border-blue-500/30 hover:border-blue-500/40 transition-colors group">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm text-secondary dark:text-gray-400">Total Feedback</p>
                <div className="relative group/tooltip">
                  <Info className="h-3 w-3 text-muted dark:text-gray-500 cursor-help" />
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover/tooltip:block w-48 bg-card border border-card dark:bg-white/30 dark:border-white/20 rounded-lg p-2 text-xs text-secondary dark:text-gray-300 z-10 shadow-lg">
                    Total number of feedback submissions across all types and statuses
                  </div>
                </div>
              </div>
              <p className="text-2xl font-bold text-primary dark:text-white">{stats.total}</p>
              <p className="text-xs text-muted dark:text-gray-500 mt-1">{stats.thisMonth} this month</p>
            </div>
            <MessageSquare className="h-8 w-8 text-blue-500 dark:text-blue-400 opacity-50 group-hover:opacity-75 transition-opacity" />
          </div>
        </Card>
        <Card className="p-4 bg-amber-500/10 border-amber-500/20 dark:border-amber-500/30 hover:border-amber-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm text-secondary dark:text-gray-400">Open Issues</p>
                <div className="relative group/tooltip">
                  <Info className="h-3 w-3 text-muted dark:text-gray-500 cursor-help" />
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover/tooltip:block w-48 bg-card border border-card dark:bg-white/30 dark:border-white/20 rounded-lg p-2 text-xs text-secondary dark:text-gray-300 z-10 shadow-lg">
                    Feedback items waiting for review or action
                  </div>
                </div>
              </div>
              <p className="text-2xl font-bold text-primary dark:text-white">{stats.byStatus.open}</p>
              <p className="text-xs text-muted dark:text-gray-500 mt-1">
                {stats.total > 0 ? Math.round((stats.byStatus.open / stats.total) * 100) : 0}% of total
              </p>
            </div>
            <Clock className="h-8 w-8 text-amber-500 dark:text-amber-400 opacity-50" />
          </div>
        </Card>
        <Card className="p-4 bg-orange-500/10 border-orange-500/20 dark:border-orange-500/30 hover:border-orange-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm text-secondary dark:text-gray-400">In Progress</p>
                <div className="relative group/tooltip">
                  <Info className="h-3 w-3 text-muted dark:text-gray-500 cursor-help" />
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover/tooltip:block w-48 bg-card border border-card dark:bg-white/30 dark:border-white/20 rounded-lg p-2 text-xs text-secondary dark:text-gray-300 z-10 shadow-lg">
                    Feedback items currently being worked on by the team
                  </div>
                </div>
              </div>
              <p className="text-2xl font-bold text-primary dark:text-white">{stats.byStatus.in_progress}</p>
              <p className="text-xs text-muted dark:text-gray-500 mt-1">
                {stats.urgentCount > 0 && (
                  <span className="text-orange-500 dark:text-orange-400">{stats.urgentCount} urgent items</span>
                )}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-500 dark:text-orange-400 opacity-50" />
          </div>
        </Card>
        <Card className="p-4 bg-green-500/10 border-green-500/20 dark:border-green-500/30 hover:border-green-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm text-secondary dark:text-gray-400">Resolved</p>
                <div className="relative group/tooltip">
                  <Info className="h-3 w-3 text-muted dark:text-gray-500 cursor-help" />
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover/tooltip:block w-48 bg-card border border-card dark:bg-white/30 dark:border-white/20 rounded-lg p-2 text-xs text-secondary dark:text-gray-300 z-10 shadow-lg">
                    Feedback items that have been completed or resolved
                  </div>
                </div>
              </div>
              <p className="text-2xl font-bold text-primary dark:text-white">{stats.byStatus.resolved}</p>
              <p className="text-xs text-muted dark:text-gray-500 mt-1">
                {stats.resolutionRate}% resolution rate
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500 dark:text-green-400 opacity-50" />
          </div>
        </Card>
      </div>

      {/* Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-primary dark:text-white flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
            By Type
          </h3>
            {stats.mostCommonType && (
              <span className="text-xs text-muted dark:text-gray-500 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Most: {stats.mostCommonType}
              </span>
            )}
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-secondary dark:text-gray-400 flex items-center gap-2">
                  <Bug className="h-3 w-3 text-red-500 dark:text-red-400" />
                  Bug Reports
                </span>
                <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-red-500 dark:text-red-400">{stats.byType.bug}</span>
                  {stats.total > 0 && (
                    <span className="text-xs text-muted dark:text-gray-500">
                      {Math.round((stats.byType.bug / stats.total) * 100)}%
                    </span>
                  )}
                </div>
              </div>
              {stats.total > 0 && (
                <div className="h-1.5 bg-white/5 dark:bg-white/30 rounded-full overflow-hidden border border-card dark:border-white/20">
                  <div 
                    className="h-full bg-red-500 dark:bg-red-400 rounded-full transition-all"
                    style={{ width: `${(stats.byType.bug / stats.total) * 100}%` }}
                  />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-secondary dark:text-gray-400 flex items-center gap-2">
                  <Lightbulb className="h-3 w-3 text-blue-500 dark:text-blue-400" />
                  Feature Requests
                </span>
                <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-blue-500 dark:text-blue-400">{stats.byType.feature}</span>
                  {stats.total > 0 && (
                    <span className="text-xs text-muted dark:text-gray-500">
                      {Math.round((stats.byType.feature / stats.total) * 100)}%
                    </span>
                  )}
                </div>
              </div>
              {stats.total > 0 && (
                <div className="h-1.5 bg-white/5 dark:bg-white/30 rounded-full overflow-hidden border border-card dark:border-white/20">
                  <div 
                    className="h-full bg-blue-500 dark:bg-blue-400 rounded-full transition-all"
                    style={{ width: `${(stats.byType.feature / stats.total) * 100}%` }}
                  />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-secondary dark:text-gray-400 flex items-center gap-2">
                  <MessageSquare className="h-3 w-3 text-green-500 dark:text-green-400" />
                  Improvements
                </span>
                <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-green-500 dark:text-green-400">{stats.byType.improvement}</span>
                  {stats.total > 0 && (
                    <span className="text-xs text-muted dark:text-gray-500">
                      {Math.round((stats.byType.improvement / stats.total) * 100)}%
                    </span>
                  )}
                </div>
              </div>
              {stats.total > 0 && (
                <div className="h-1.5 bg-white/5 dark:bg-white/30 rounded-full overflow-hidden border border-card dark:border-white/20">
                  <div 
                    className="h-full bg-green-500 dark:bg-green-400 rounded-full transition-all"
                    style={{ width: `${(stats.byType.improvement / stats.total) * 100}%` }}
                  />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-secondary dark:text-gray-400">Other</span>
                <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-muted dark:text-gray-400">{stats.byType.other}</span>
                  {stats.total > 0 && (
                    <span className="text-xs text-muted dark:text-gray-500">
                      {Math.round((stats.byType.other / stats.total) * 100)}%
                    </span>
                  )}
                </div>
              </div>
              {stats.total > 0 && (
                <div className="h-1.5 bg-white/5 dark:bg-white/30 rounded-full overflow-hidden border border-card dark:border-white/20">
                  <div 
                    className="h-full bg-gray-500 dark:bg-gray-400 rounded-full transition-all"
                    style={{ width: `${(stats.byType.other / stats.total) * 100}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-primary dark:text-white mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            By Priority
          </h3>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-secondary dark:text-gray-400">Critical</span>
              <span className="text-sm font-semibold text-red-500 dark:text-red-400">{stats.byPriority.critical}</span>
              </div>
              {stats.total > 0 && (
                <div className="h-1.5 bg-white/5 dark:bg-white/30 rounded-full overflow-hidden border border-card dark:border-white/20">
                  <div 
                    className="h-full bg-red-500 dark:bg-red-400 rounded-full transition-all"
                    style={{ width: `${(stats.byPriority.critical / stats.total) * 100}%` }}
                  />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-secondary dark:text-gray-400">High</span>
              <span className="text-sm font-semibold text-orange-500 dark:text-orange-400">{stats.byPriority.high}</span>
              </div>
              {stats.total > 0 && (
                <div className="h-1.5 bg-white/5 dark:bg-white/30 rounded-full overflow-hidden border border-card dark:border-white/20">
                  <div 
                    className="h-full bg-orange-500 dark:bg-orange-400 rounded-full transition-all"
                    style={{ width: `${(stats.byPriority.high / stats.total) * 100}%` }}
                  />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-secondary dark:text-gray-400">Medium</span>
              <span className="text-sm font-semibold text-amber-500 dark:text-amber-400">{stats.byPriority.medium}</span>
              </div>
              {stats.total > 0 && (
                <div className="h-1.5 bg-white/5 dark:bg-white/30 rounded-full overflow-hidden border border-card dark:border-white/20">
                  <div 
                    className="h-full bg-amber-500 dark:bg-amber-400 rounded-full transition-all"
                    style={{ width: `${(stats.byPriority.medium / stats.total) * 100}%` }}
                  />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-secondary dark:text-gray-400">Low</span>
              <span className="text-sm font-semibold text-green-500 dark:text-green-400">{stats.byPriority.low}</span>
              </div>
              {stats.total > 0 && (
                <div className="h-1.5 bg-white/5 dark:bg-white/30 rounded-full overflow-hidden border border-card dark:border-white/20">
                  <div 
                    className="h-full bg-green-500 dark:bg-green-400 rounded-full transition-all"
                    style={{ width: `${(stats.byPriority.low / stats.total) * 100}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-primary dark:text-white mb-3 flex items-center gap-2">
            <Target className="h-4 w-4" />
            Performance Metrics
          </h3>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-secondary dark:text-gray-400 flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  Last 7 Days
                </span>
              <span className="text-sm font-semibold text-primary dark:text-white">{stats.recent}</span>
              </div>
              <p className="text-xs text-muted dark:text-gray-500 mt-1">New submissions this week</p>
            </div>
            <div className="pt-2 border-t border-card dark:border-white/20">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-secondary dark:text-gray-400 flex items-center gap-2">
                  <Zap className="h-3 w-3 text-green-500 dark:text-green-400" />
                  Avg Resolution Time
                </span>
                <span className="text-sm font-semibold text-green-500 dark:text-green-400">
                  {stats.avgResolutionDays > 0 ? `${stats.avgResolutionDays} days` : 'N/A'}
                </span>
              </div>
              <p className="text-xs text-muted dark:text-gray-500 mt-1">
                Average time to resolve feedback
              </p>
            </div>
            <div className="pt-2 border-t border-card dark:border-white/20">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted dark:text-gray-500">Resolution Rate</span>
                <span className="text-sm font-semibold text-green-500 dark:text-green-400 flex items-center gap-1">
                  {stats.resolutionRate}%
                  {stats.resolutionRate >= 70 && <TrendingUp className="h-3 w-3" />}
                </span>
              </div>
              <p className="text-xs text-muted dark:text-gray-500 mt-1">
                {stats.byStatus.resolved + stats.byStatus.closed} of {stats.total} items resolved
              </p>
            </div>
            <div className="pt-2 border-t border-card dark:border-white/20">
              <div className="flex items-center justify-between">
                <span className="text-sm text-secondary dark:text-gray-400">Closed Items</span>
                <span className="text-sm font-semibold text-muted dark:text-gray-400">{stats.byStatus.closed}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Status' },
              { value: 'open', label: `Open (${stats.byStatus.open})` },
              { value: 'in_progress', label: `In Progress (${stats.byStatus.in_progress})` },
              { value: 'resolved', label: `Resolved (${stats.byStatus.resolved})` },
              { value: 'closed', label: `Closed (${stats.byStatus.closed})` }
            ]}
          />
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={[
              { value: '', label: 'All Types' },
              { value: 'bug', label: `Bug Report (${stats.byType.bug})` },
              { value: 'feature', label: `Feature Request (${stats.byType.feature})` },
              { value: 'improvement', label: `Improvement (${stats.byType.improvement})` },
              { value: 'other', label: `Other (${stats.byType.other})` }
            ]}
          />
        </div>
      </Card>

      {/* Feedback List */}
      <div className="space-y-4">
        {feedback?.data?.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-4xl mb-2">💬</div>
            <p className="text-secondary dark:text-gray-400">No feedback found matching your filters</p>
            <p className="text-sm text-muted dark:text-gray-500 mt-2">
              {statusFilter || typeFilter 
                ? "Try adjusting your filters to see more results."
                : "Be the first to submit feedback!"}
            </p>
          </Card>
        ) : (
          feedback?.data?.map((item: any, index: number) => {
            const daysSince = Math.floor((Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24));
            const isRecent = daysSince <= 7;
            // CRITICAL: Use actual ID for API calls, fallback to temporary ID for display
            let actualId = item.id || item.ID;
            // If still no ID, create a temporary one based on content to identify the item
            if (!actualId && item.created_at && item.title) {
              actualId = `temp-${new Date(item.created_at).getTime()}-${item.title?.substring(0, 10).replace(/\s/g, '-')}`;
            }
            const itemIdStr = actualId ? String(actualId) : `idx-${index}`;
            // If no actual ID exists, use a temporary ID
            
            return (
              <div key={actualId || `feedback-${index}`} onClick={(e) => e.stopPropagation()}>
              <Card className="p-6 hover:bg-white/5 dark:hover:bg-white/10 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Header with Type, Title, and Badges */}
                    <div className="flex items-start gap-3 mb-3 flex-wrap">
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {getTypeIcon(item.type)}
                        <span className="text-xs text-muted dark:text-gray-500 capitalize">{item.type}</span>
                      </div>
                      <h3 className="font-semibold text-primary dark:text-white text-lg flex-1 min-w-0">{item.title}</h3>
                      {isRecent && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/30 text-blue-700 dark:text-blue-300 border border-blue-500/40 dark:border-blue-500/40 flex-shrink-0">
                          New
                        </span>
                      )}
                    </div>

                    {/* Priority and Status Badges */}
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(item.priority)}`}>
                        {item.priority?.toUpperCase() || 'MEDIUM'}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${getStatusColor(item.status)}`}>
                        {getStatusIcon(item.status)}
                        <span className="capitalize">{(item.status || 'open').replace('_', ' ')}</span>
                      </span>
                    </div>

                    {/* Description */}
                    <div className="mb-4">
                      <p className={`text-sm text-secondary dark:text-gray-400 leading-relaxed ${
                        expandedId === item.id ? '' : 'line-clamp-3'
                      }`}>
                      {item.description}
                    </p>
                      {item.description && item.description.length > 150 && (
                        <button
                          onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                          className="text-xs text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 mt-1"
                        >
                          {expandedId === item.id ? 'Show less' : 'Read more'}
                        </button>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-xs text-muted dark:text-gray-500 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                          {item.is_anonymous || item.isAnonymous 
                            ? '?' 
                            : (item.user?.name?.charAt(0) || 'A')}
                        </div>
                        <span className="text-secondary dark:text-gray-400">
                          {item.is_anonymous || item.isAnonymous 
                            ? 'Anonymous' 
                            : (item.user?.name || 'Unknown')}
                        </span>
                        <span className="text-muted dark:text-gray-600">•</span>
                        <span className="text-muted dark:text-gray-500">
                          {item.is_anonymous || item.isAnonymous 
                            ? 'Anonymous submission' 
                            : (item.user?.email || 'N/A')}
                        </span>
                      </div>
                      <span className="text-muted dark:text-gray-600">•</span>
                      <span className="text-muted dark:text-gray-500">
                        {formatDate(item.created_at)}
                        {daysSince > 0 && (
                          <span className="ml-1 text-muted dark:text-gray-600">
                            ({daysSince} {daysSince === 1 ? 'day' : 'days'} ago)
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {editingStates[String(actualId)] !== undefined ? (
                      <div className="flex flex-col gap-2 min-w-[200px]">
                        <Select
                          value={editingStates[String(actualId)]?.status || ''}
                          onChange={(e) => {
                            e.stopPropagation();
                            updateEditingStatus(String(actualId), e.target.value);
                          }}
                          options={[
                            { value: 'open', label: 'Open' },
                            { value: 'in_progress', label: 'In Progress' },
                            { value: 'resolved', label: 'Resolved' },
                            { value: 'closed', label: 'Closed' },
                          ]}
                        />
                        {(editingStates[String(actualId)]?.status === 'resolved' || editingStates[String(actualId)]?.status === 'closed') && (
                          <textarea
                            value={editingStates[String(actualId)]?.resolution || ''}
                            onChange={(e) => {
                              e.stopPropagation();
                              updateEditingResolution(String(actualId), e.target.value);
                            }}
                            placeholder="Resolution notes (optional)..."
                            className="w-full px-3 py-2 bg-card border border-card text-primary placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/20 dark:bg-white/30 dark:text-white dark:placeholder:text-gray-400 dark:focus:ring-offset-transparent rounded-lg text-sm"
                            rows={2}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusUpdate(String(actualId));
                            }}
                            disabled={updateStatusMutation.isPending}
                          >
                            {updateStatusMutation.isPending ? "Updating..." : "Save"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              cancelEditing(String(actualId));
                            }}
                          >
                            Cancel
                    </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(String(actualId), item.status || 'open');
                          }}
                          title="Change status"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Change Status
                    </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(String(actualId));
                          }}
                          title="Delete feedback"
                          className="text-red-400 hover:text-red-300 hover:border-red-400"
                        >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
              </div>
            );
          })
        )}
      </div>

    </div>
    </RoleGuard>
  );
}
