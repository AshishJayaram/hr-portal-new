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
    <header className="sticky top-0 z-20 pl-16 pr-6 py-4 md:px-6 border-b border-white/20 bg-liquid-glass-white dark:bg-liquid-glass-black backdrop-blur-xl shadow-liquid overflow-x-hidden">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-liquid-primary-purple to-liquid-primary-purple-light bg-clip-text text-transparent truncate min-w-0">
          {title}
        </h2>
        <div className="flex items-center gap-4 text-sm flex-shrink-0">
          {user?.role !== 'Employee' && (
            <span className={`px-3 py-1.5 rounded-liquid-sm text-xs text-white shadow-liquid whitespace-nowrap ${
              user?.role === 'God'
                ? 'bg-liquid-secondary'
                : 'bg-liquid-primary'
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
