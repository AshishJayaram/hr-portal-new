"use client";

import { usePathname, useRouter } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
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
  const router = useRouter();
  const user = getCurrentUser();
  const title = titles[pathname] || "HR Portal";

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    router.push("/signin");
  };

  return (
    <header className="sticky top-0 z-20 flex justify-between items-center px-6 py-4 bg-white/5 backdrop-blur-xl border-b border-white/10">
      <h2 className="text-xl font-bold">{title}</h2>

      <div className="flex items-center gap-4">
        <ThemeToggle />
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-300">{user?.name || "User"}</span>
          <span className="px-2 py-1 bg-gray-600 rounded text-xs">{user?.role || "employee"}</span>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
        >
          Sign Out
        </button>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
          {user?.name?.charAt(0) || "A"}
        </div>
      </div>
    </header>
  );
}
