"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
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
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    router.push("/signin");
  };

  return (
    <header className="sticky top-0 z-20 flex justify-between items-center px-6 py-4 bg-white/5 border-b border-white/10">
      <h2 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">{title}</h2>

      <div className="flex items-center gap-4">
        {/* <ThemeToggle /> */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-300">{user?.name || "User"}</span>
          <span className="px-2 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 rounded text-xs text-white shadow">{user?.role || "Employee"}</span>
        </div>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpen(!open)}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold"
            aria-haspopup="menu"
            aria-expanded={open}
          >
            {user?.name?.charAt(0) || "A"}
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-44 bg-white/10 backdrop-blur-xl border border-white/10 rounded-lg shadow-xl p-2">
              <button className="w-full text-left px-3 py-2 rounded hover:bg-white/10">Profile</button>
              <button className="w-full text-left px-3 py-2 rounded hover:bg-white/10">Settings</button>
              <div className="my-1 h-px bg-white/10" />
              <button onClick={handleLogout} className="w-full text-left px-3 py-2 rounded bg-red-500/10 text-red-300 hover:bg-red-500/20">Sign Out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
