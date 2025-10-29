"use client";

import { usePathname } from "next/navigation";
import { getCurrentUser } from "@/lib/api";
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

  return (
    <header className="sticky top-0 z-20 pl-16 pr-6 py-4 md:px-6 border-b border-card bg-card/80 backdrop-blur-sm dark:bg-white/5 dark:border-white/10 overflow-x-hidden">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold text-primary dark:text-white truncate min-w-0">
          {title}
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
