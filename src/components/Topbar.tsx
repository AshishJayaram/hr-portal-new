"use client";

import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

const titles: Record<string, string> = {
  "/": "Dashboard",
  "/leaves": "Leaves",
  "/documents": "Documents",
  "/salary-slips": "Salary Slips",
  "/team": "Team",
  "/mocks": "Mock Data",
};

export default function Topbar() {
  const pathname = usePathname();
  const title = titles[pathname] || "HR Portal";

  return (
    <header className="sticky top-0 z-20 flex justify-between items-center px-6 py-4 bg-white/5 backdrop-blur-xl border-b border-white/10">
      <h2 className="text-xl font-bold">{title}</h2>

      <div className="flex items-center gap-4">
        <ThemeToggle />
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
          A
        </div>
      </div>
    </header>
  );
}
