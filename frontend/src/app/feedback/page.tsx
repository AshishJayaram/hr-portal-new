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
  AlertTriangle
} from "lucide-react";
import { getCurrentUser } from "@/lib/api";
import RoleGuard from "@/components/RoleGuard";

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

  const queryClient = useQueryClient();

  // Mock data - replace with actual API calls
  const { data: feedback, isLoading } = useQuery({
    queryKey: ["feedback", statusFilter, typeFilter],
    queryFn: async () => {
      // Mock data
      return {
        data: [
          {
            id: "1",
            title: "Login page not loading on mobile",
            description: "The login page fails to load properly on mobile devices, showing a blank screen.",
            type: "bug",
            priority: "high",
            status: "open",
            created_at: "2024-01-15T10:30:00Z",
            user: {
              name: "John Doe",
              email: "john@example.com"
            }
          },
          {
            id: "2",
            title: "Add dark mode toggle",
            description: "It would be great to have a dark mode toggle for better user experience.",
            type: "feature",
            priority: "medium",
            status: "in_progress",
            created_at: "2024-01-10T14:20:00Z",
            user: {
              name: "Jane Smith",
              email: "jane@example.com"
            }
          },
          {
            id: "3",
            title: "Improve dashboard loading speed",
            description: "The dashboard takes too long to load. Can we optimize the queries?",
            type: "improvement",
            priority: "medium",
            status: "resolved",
            created_at: "2024-01-05T09:15:00Z",
            user: {
              name: "Mike Johnson",
              email: "mike@example.com"
            }
          }
        ]
      };
    }
  });

  const createFeedbackMutation = useMutation({
    mutationFn: async (data: any) => {
      // Mock API call
      console.log("Creating feedback:", data);
      return { success: true };
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bug':
        return <Bug className="h-4 w-4 text-red-400" />;
      case 'feature':
        return <Lightbulb className="h-4 w-4 text-blue-400" />;
      case 'improvement':
        return <MessageSquare className="h-4 w-4 text-green-400" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'text-red-400 bg-red-400/10';
      case 'high':
        return 'text-orange-400 bg-orange-400/10';
      case 'medium':
        return 'text-yellow-400 bg-yellow-400/10';
      case 'low':
        return 'text-green-400 bg-green-400/10';
      default:
        return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <Clock className="h-4 w-4 text-blue-400" />;
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
        return 'text-blue-400 bg-blue-400/10';
      case 'in_progress':
        return 'text-yellow-400 bg-yellow-400/10';
      case 'resolved':
        return 'text-green-400 bg-green-400/10';
      case 'closed':
        return 'text-gray-400 bg-gray-400/10';
      default:
        return 'text-gray-400 bg-gray-400/10';
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
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
          Feedback & Bug Reports
        </h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Submit Feedback
        </Button>
      </div>

      {/* Create Feedback Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Submit Feedback</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-white"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
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
                <label className="block text-sm font-medium text-gray-300 mb-2">
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
                <label className="block text-sm font-medium text-gray-300 mb-2">
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
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please provide detailed information about the issue or suggestion..."
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Status' },
              { value: 'open', label: 'Open' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'resolved', label: 'Resolved' },
              { value: 'closed', label: 'Closed' }
            ]}
          />
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={[
              { value: '', label: 'All Types' },
              { value: 'bug', label: 'Bug Report' },
              { value: 'feature', label: 'Feature Request' },
              { value: 'improvement', label: 'Improvement' },
              { value: 'other', label: 'Other' }
            ]}
          />
        </div>
      </Card>

      {/* Feedback List */}
      <div className="grid gap-4">
        {feedback?.data?.map((item: Feedback) => (
          <Card key={item.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {getTypeIcon(item.type)}
                  <h3 className="font-semibold text-white">{item.title}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                    {item.priority}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                    {getStatusIcon(item.status)}
                    <span className="ml-1 capitalize">{item.status.replace('_', ' ')}</span>
                  </span>
                </div>
                <p className="text-sm text-gray-400 mb-3">{item.description}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>By: {item.user.name}</span>
                  <span>•</span>
                  <span>{formatDate(item.created_at)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                {/* Only show edit/delete for own feedback or if admin */}
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button variant="outline" size="sm">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {feedback?.data?.length === 0 && (
        <Card className="p-8 text-center">
          <div className="text-4xl mb-2">💬</div>
          <p className="text-gray-400">No feedback found</p>
        </Card>
      )}
    </div>
    </RoleGuard>
  );
}
