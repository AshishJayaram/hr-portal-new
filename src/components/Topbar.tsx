"use client";

import { usePathname } from "next/navigation";
import { getCurrentUser } from "@/lib/api";

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/leaves": "Leaves",
  "/documents": "Documents",
  "/salary-slips": "Salary Slips",
  "/team": "Team",
  "/employees": "Employees",
  "/holidays": "Holidays",
  "/mocks": "Mock Data",
};

export default function Topbar() {
  const pathname = usePathname();
  const user = getCurrentUser();
  const title = titles[pathname] || "HR Portal";

  return (
    <header className="sticky top-0 z-20 flex justify-between items-center pl-16 pr-6 py-4 bg-white/5 border-b border-white/10 md:px-6">
      <h2 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">{title}</h2>

      <div className="flex items-center gap-2 text-sm">
        <span className="px-2 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 rounded text-xs text-white shadow">{user?.role || "Employee"}</span>
      </div>
    </header>
  );
}
