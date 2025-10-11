"use client";

import { useQuery } from "@tanstack/react-query";
import { getUserAuditLogs } from "@/lib/api";
import { useState } from "react";
import { ChevronDown, ChevronUp, TrendingUp, User, FileText, Calendar, DollarSign, Building } from "lucide-react";

interface GrowthTrackerProps {
  userId: string;
  userName: string;
  maxItems?: number;
}

export default function GrowthTracker({ userId, userName, maxItems = 3 }: GrowthTrackerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const { data: auditData, isLoading } = useQuery({
    queryKey: ["user-audit-logs", userId],
    queryFn: () => getUserAuditLogs(userId),
    enabled: !!userId,
  });

  const auditLogs = auditData?.data || [];
  const displayLogs = isExpanded ? auditLogs : auditLogs.slice(0, maxItems);

  const getActionIcon = (action: string, entityType: string) => {
    switch (entityType) {
      case "USER":
        return <User className="h-3 w-3" />;
      case "DOCUMENT":
        return <FileText className="h-3 w-3" />;
      case "LEAVE":
        return <Calendar className="h-3 w-3" />;
      case "SALARY_SLIP":
        return <DollarSign className="h-3 w-3" />;
      default:
        return <TrendingUp className="h-3 w-3" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "CREATE":
        return "text-green-400";
      case "UPDATE":
        return "text-blue-400";
      case "DELETE":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return "Today";
    if (diffDays === 2) return "Yesterday";
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="mt-3 p-2 bg-white/5 rounded-lg">
        <div className="text-xs text-gray-400">Loading activity...</div>
      </div>
    );
  }

  if (auditLogs.length === 0) {
    return (
      <div className="mt-3 p-2 bg-white/5 rounded-lg">
        <div className="text-xs text-gray-400">No recent activity</div>
      </div>
    );
  }

  return null;
}
