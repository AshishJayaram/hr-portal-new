"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { canManageUsers, isManager, getCurrentUser, hasRole, isGod } from "@/lib/api";
import RoleGuard from "./RoleGuard";
import FeedbackPopup from "./FeedbackPopup";
import { GlassCard } from "./ui/glass";

const baseLinks = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/leaves", label: "Leaves", icon: "🌴" },
  { href: "/reimbursements", label: "Reimbursements", icon: "💳" },
  { href: "/kra", label: "KRAs & Goals", icon: "🎯" },
];

const hrAdminLinks = [
  { href: "/employees", label: "Employees", icon: "👤" },
  { href: "/team", label: "Team", icon: "👥" },
  { href: "/documents", label: "Documents", icon: "📑" },
  { href: "/salary-slips", label: "Salary Slips", icon: "💰" },
  { href: "/holidays", label: "Holidays, Events & Notices", icon: "📅" },
  { href: "/off-site", label: "Off-site Tracker", icon: "🏢" },
];


const employeeLinks = [
  { href: "/documents", label: "Documents", icon: "📑" },
  { href: "/salary-slips", label: "Salary Slips", icon: "💰" },
  { href: "/team", label: "Team", icon: "👥" },
  { href: "/holidays", label: "Holidays, Events & Notices", icon: "📅" },
  { href: "/off-site", label: "Off-site Tracker", icon: "🏢" },
];

const godLinks = [
  { href: "/god", label: "God Dashboard", icon: "👑" },
  { href: "/god/feedback", label: "Feedback", icon: "💬" },
];

export default function Sidebar() {
  // React hooks must be called unconditionally
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showFeedbackPopup, setShowFeedbackPopup] = useState(false);
  const user = getCurrentUser();
  const canAccessSettings = hasRole(["HR", "Admin"]);
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
    // For God users, ONLY show God Dashboard and Feedback
    if (isGod()) {
      return godLinks;
    }
    
    const links = [...baseLinks];
    
    if (canManageUsers()) {
      links.push(...hrAdminLinks);
    } else {
      links.push(...employeeLinks);
    }
    
    return links;
  };

  const links = getLinks();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-liquid-glass-white dark:bg-liquid-glass-black backdrop-blur-xl border-r border-white/20 p-6 shadow-liquid-glass">
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-liquid-primary-purple to-liquid-primary-purple-light bg-clip-text text-transparent">
          HR Portal
        </h1>

        <nav className="mt-8 space-y-2 flex-1 overflow-y-auto pr-2 -mr-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center px-4 py-3 rounded-liquid-md transition-all will-change-transform ${
                pathname === link.href
                  ? "bg-liquid-primary text-white shadow-liquid-glass"
                  : "hover:bg-liquid-glass-white dark:hover:bg-liquid-glass-black hover:shadow-liquid"
              }`}
            >
              <span className="mr-3 text-lg">{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>

        {/* User dropdown at bottom */}
        <div className="mt-6 pt-6 border-t border-white/20 relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-liquid-md hover:bg-liquid-glass-white dark:hover:bg-liquid-glass-black transition-all"
            aria-haspopup="menu"
            aria-expanded={userMenuOpen}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-liquid-primary flex items-center justify-center text-white font-bold shadow-liquid">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-gray-900 dark:text-white">{user?.name || 'User'}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Menu</div>
              </div>
            </div>
          </button>
          {userMenuOpen && (
            <div className="absolute bottom-16 left-0 w-full bg-liquid-glass-white dark:bg-liquid-glass-black backdrop-blur-xl border border-white/20 rounded-liquid-md shadow-liquid-glass p-2">
              <button className="w-full text-left px-3 py-2 rounded-liquid-sm hover:bg-liquid-glass-white dark:hover:bg-liquid-glass-black text-gray-900 dark:text-white" onClick={() => { setUserMenuOpen(false); router.push('/profile'); }}>Profile</button>
              <button className="w-full text-left px-3 py-2 rounded-liquid-sm hover:bg-liquid-glass-white dark:hover:bg-liquid-glass-black text-gray-900 dark:text-white" onClick={() => { setUserMenuOpen(false); setShowFeedbackPopup(true); }}>Feedback</button>
              {canAccessSettings && (
                <button className="w-full text-left px-3 py-2 rounded-liquid-sm hover:bg-liquid-glass-white dark:hover:bg-liquid-glass-black text-gray-900 dark:text-white" onClick={() => { setUserMenuOpen(false); router.push('/company/settings'); }}>Settings</button>
              )}
              <div className="my-2 h-px bg-white/20" />
              <button
                className="w-full text-left px-3 py-2 rounded-liquid-sm bg-liquid-accent-red/20 text-liquid-accent-red hover:bg-liquid-accent-red/30"
                onClick={() => {
                  localStorage.removeItem('user');
                  localStorage.removeItem('token');
                  localStorage.removeItem('organizationId');
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
            className="fixed inset-y-0 left-0 w-64 bg-liquid-glass-white dark:bg-liquid-glass-black backdrop-blur-xl border-r border-white/20 p-6 z-40 flex flex-col shadow-liquid-glass"
          >
            <h1 className="pl-8 text-3xl font-extrabold bg-gradient-to-r from-liquid-primary-purple to-liquid-primary-purple-light bg-clip-text text-transparent">
              HR Portal
            </h1>

            <nav className="mt-6 space-y-2 flex-1 overflow-y-auto pr-2 -mr-2">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)} // close on click
                  className={`flex items-center px-4 py-3 rounded-liquid-md transition-all ${
                    pathname === link.href
                      ? "bg-liquid-primary text-white shadow-liquid-glass"
                      : "hover:bg-liquid-glass-white dark:hover:bg-liquid-glass-black"
                  }`}
                >
                  <span className="mr-3 text-lg">{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              ))}
            </nav>

            {/* Mobile user tile */}
            <div className="mt-6 pt-6 border-t border-white/20">
              <button
                onClick={() => { setOpen(false); router.push('/profile'); }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-liquid-md hover:bg-liquid-glass-white dark:hover:bg-liquid-glass-black transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-liquid-primary flex items-center justify-center text-white font-bold shadow-liquid">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{user?.name || 'User'}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">View profile</div>
                  </div>
                </div>
              </button>
              <button
                onClick={() => { setOpen(false); setShowFeedbackPopup(true); }}
                className="w-full text-left px-4 py-3 rounded-liquid-md hover:bg-liquid-glass-white dark:hover:bg-liquid-glass-black transition-all text-gray-900 dark:text-white"
              >
                Feedback
              </button>
              {canAccessSettings && (
                <button
                  onClick={() => { setOpen(false); router.push('/company/settings'); }}
                  className="w-full text-left px-4 py-3 rounded-liquid-md hover:bg-liquid-glass-white dark:hover:bg-liquid-glass-black transition-all text-gray-900 dark:text-white"
                >
                  Settings
                </button>
              )}
              <button
                onClick={() => { localStorage.removeItem('user'); localStorage.removeItem('token'); localStorage.removeItem('organizationId'); setOpen(false); router.push('/signin'); }}
                className="mt-3 w-full text-left px-4 py-3 rounded-liquid-md bg-liquid-accent-red/20 text-liquid-accent-red hover:bg-liquid-accent-red/30 transition-all"
              >
                Sign Out
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Feedback Popup */}
      <FeedbackPopup 
        isOpen={showFeedbackPopup} 
        onClose={() => setShowFeedbackPopup(false)} 
      />
      
    </>
  );
}
