"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard", icon: "🏠" },
  { href: "/leaves", label: "Leaves", icon: "🌴" },
  { href: "/documents", label: "Documents", icon: "📑" },
  { href: "/salary-slips", label: "Salary Slips", icon: "💰" },
  { href: "/team", label: "Team", icon: "👥" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 hidden md:flex flex-col bg-white/5 backdrop-blur-xl border-r border-white/10 p-6">
      <h1 className="text-2xl font-extrabold bg-gradient-to-r from-pink-400 to-yellow-400 bg-clip-text text-transparent">
        HR Portal
      </h1>

      <nav className="mt-8 space-y-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`block px-4 py-2 rounded-lg transition-all ${
              pathname === link.href
                ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg"
                : "hover:bg-white/10"
            }`}
          >
            <span className="mr-2">{link.icon}</span>
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}