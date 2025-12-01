"use client";

import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { getCurrentUser, isGod } from "@/lib/api";
import ThemeToggle from "./ThemeToggle";

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/leaves": "Leaves",
  "/documents": "Documents",
  "/salary-slips": "Salary Slips",
  "/team": "Team",
  "/employees": "Employees",
  "/holidays": "Holidays",
  "/mocks": "Mock Data",
  "/god": "God Dashboard",
  "/profile": "Profile",
  "/off-site": "Off-site Tracker",
  "/audit-logs": "Audit Logs",
  "/settings": "Settings",
};

export default function Topbar() {
  const pathname = usePathname();
  const user = getCurrentUser();
  const title = titles[pathname] || "HR Portal";
  const showLogo = title === "HR Portal";

  // Fetch organization logo from current user
  const { data: currentUserData } = useQuery({
    queryKey: ["current-user", user?.id],
    queryFn: async () => {
      if (!user) return null;
      try {
        const orgId = user.organization_id?.toString() || localStorage.getItem('organizationId') || '';
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Organization-ID': orgId,
          },
        });
        if (!response.ok) {
          console.error('Topbar - Failed to fetch current user:', response.status, response.statusText);
          return null;
        }
        const data = await response.json();
        console.log('Topbar - API Response:', data);
        return data.user;
      } catch (error) {
        console.error('Topbar - Failed to fetch current user:', error);
        return null;
      }
    },
    enabled: !!user && !isGod() && showLogo,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Get organization logo
  const organizationLogo = 
    currentUserData?.organization?.logo_url || 
    currentUserData?.organization?.logo || 
    (user?.organization as any)?.logo_url ||
    (user?.organization as any)?.logo;
  
  // Get organization name
  const organizationName = 
    currentUserData?.organization?.name || 
    (user?.organization as any)?.name;
  
  const hasLogo = organizationLogo && typeof organizationLogo === 'string' && organizationLogo.trim() !== '' && showLogo;
  
  // Use organization name if available, otherwise fallback to title
  const displayTitle = showLogo && organizationName ? organizationName : title;

  // Debug logging
  useEffect(() => {
    if (showLogo && user) {
      console.log('Topbar - User:', user);
      console.log('Topbar - Current User Data:', currentUserData);
      console.log('Topbar - Organization Logo:', organizationLogo);
      console.log('Topbar - Has Logo:', hasLogo);
    }
  }, [showLogo, user, currentUserData, organizationLogo, hasLogo]);

  return (
    <header className="sticky top-0 z-20 pl-16 pr-6 py-4 md:px-6 border-b border-card bg-card/80 backdrop-blur-sm dark:bg-gray-900/60 dark:border-gray-700/50 overflow-x-hidden">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold text-primary dark:text-white truncate min-w-0">
          {showLogo && organizationName ? organizationName : displayTitle}
        </h2>
        <div className="flex items-center gap-3 text-sm flex-shrink-0">
          {user?.role !== 'Employee' && (
            <span className={`px-2 py-1 rounded text-xs text-white shadow whitespace-nowrap ${
              user?.role === 'God'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600'
                : 'bg-indigo-600 dark:bg-gradient-to-r dark:from-indigo-600 dark:to-purple-600'
            }`}>
              {user?.role || "Employee"}
            </span>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
