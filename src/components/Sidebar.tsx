"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { canManageUsers, isManager, getCurrentUser } from "@/lib/api";
import RoleGuard from "./RoleGuard";

const baseLinks = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/leaves", label: "Leaves", icon: "🌴" },
];

const hrAdminLinks = [
  { href: "/employees", label: "Employees", icon: "👤" },
  { href: "/team", label: "Team", icon: "👤" },
  { href: "/documents", label: "Documents", icon: "📑" },
  { href: "/salary-slips", label: "Salary Slips", icon: "💰" },
  { href: "/holidays", label: "Holidays", icon: "📅" },
];

const managerLinks = [
  { href: "/documents", label: "Documents", icon: "📑" },
  { href: "/salary-slips", label: "Salary Slips", icon: "💰" },
  { href: "/team", label: "Team", icon: "👥" },
];

const employeeLinks = [
  { href: "/documents", label: "Documents", icon: "📑" },
  { href: "/salary-slips", label: "Salary Slips", icon: "💰" },
  { href: "/team", label: "Team", icon: "👥" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const user = getCurrentUser();
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const getLinks = () => {
    const links = [...baseLinks];
    
    if (canManageUsers()) {
      links.push(...hrAdminLinks);
    } else if (isManager()) {
      links.push(...managerLinks);
    } else {
      links.push(...employeeLinks);
    }
    
    return links;
  };

  const links = getLinks();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-white/5 backdrop-blur-xl border-r border-white/10 p-6">
        <h1 className="text-2xl font-extrabold bg-gradient-to-r from-pink-400 to-yellow-400 bg-clip-text text-transparent">
          HR Portal
        </h1>

        <nav className="mt-8 space-y-2 flex-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center px-4 py-2 rounded-lg transition-all will-change-transform ${
                pathname === link.href
                  ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-900/30"
                  : "hover:bg-white/10 hover:shadow hover:shadow-indigo-900/20"
              }`}
            >
              <span className="mr-3 text-lg">{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>

        {/* User dropdown at bottom */}
        <div className="mt-6 pt-6 border-t border-white/10 relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-full flex items-center justify-between px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-haspopup="menu"
            aria-expanded={userMenuOpen}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="text-left">
                <div className="text-sm font-medium">{user?.name || 'User'}</div>
                <div className="text-xs text-gray-400">Menu</div>
              </div>
            </div>
            <span className="text-xs px-2 py-1 rounded bg-white/10">{user?.role || 'Employee'}</span>
          </button>
          {userMenuOpen && (
            <div className="absolute bottom-14 left-0 w-full bg-white/10 backdrop-blur-xl border border-white/10 rounded-lg shadow-xl p-2">
              <button className="w-full text-left px-3 py-2 rounded hover:bg-white/10" onClick={() => { setUserMenuOpen(false); router.push('/profile'); }}>Profile</button>
              <button className="w-full text-left px-3 py-2 rounded hover:bg-white/10" onClick={() => { setUserMenuOpen(false); router.push('/settings'); }}>Settings</button>
              <div className="my-1 h-px bg-white/10" />
              <button
                className="w-full text-left px-3 py-2 rounded bg-red-500/10 text-red-300 hover:bg-red-500/20"
                onClick={() => {
                  localStorage.removeItem('user');
                  localStorage.removeItem('token');
                  setUserMenuOpen(false);
                  router.push('/signin');
                }}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Sidebar Toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white/10 backdrop-blur hover:bg-white/20"
      >
        {open ? "✖️" : "☰"}
      </button>

      {/* Mobile Sidebar Drawer */}
      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ x: -250 }}
            animate={{ x: 0 }}
            exit={{ x: -250 }}
            transition={{ type: "tween", duration: 0.3 }}
            className="fixed inset-y-0 left-0 w-64 bg-white/10 backdrop-blur-xl border-r border-white/10 p-6 z-40"
          >
            <h1 className="text-2xl font-extrabold bg-gradient-to-r from-pink-400 to-yellow-400 bg-clip-text text-transparent">
              HR Portal
            </h1>

            <nav className="mt-8 space-y-2">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)} // close on click
                  className={`flex items-center px-4 py-2 rounded-lg transition-all ${
                    pathname === link.href
                      ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md"
                      : "hover:bg-white/10"
                  }`}
                >
                  <span className="mr-3 text-lg">{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              ))}
            </nav>

            {/* Mobile user tile */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <button
                onClick={() => { setOpen(false); router.push('/profile'); }}
                className="w-full flex items-center justify-between px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium">{user?.name || 'User'}</div>
                    <div className="text-xs text-gray-400">View profile</div>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 rounded bg-white/10">{user?.role || 'Employee'}</span>
              </button>
              <button
                onClick={() => { localStorage.removeItem('user'); localStorage.removeItem('token'); setOpen(false); router.push('/signin'); }}
                className="mt-2 w-full text-left px-4 py-2 rounded bg-red-500/10 text-red-300 hover:bg-red-500/20"
              >
                Sign Out
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
