"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { canManageUsers, canManageDocuments, canManageSalarySlips, canManageHolidays, isManager } from "@/lib/api";
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
  { href: "/team", label: "Team", icon: "👥" },
];

const employeeLinks = [
  { href: "/documents", label: "Documents", icon: "📑" },
  { href: "/salary-slips", label: "Salary Slips", icon: "💰" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

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

        <nav className="mt-8 space-y-2">
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
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
