"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavigationItem {
  name: string;
  href: string;
  description: string;
  icon?: string;
  category: string;
  requiresAuth?: boolean;
  roles?: string[];
}

const navigationItems: NavigationItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    description: "Overview of HR metrics, recent activities, and upcoming events",
    icon: "📊",
    category: "Overview"
  },
  {
    name: "Employees",
    href: "/employees",
    description: "Manage employee profiles, information, and organizational structure",
    icon: "👥",
    category: "Management",
    requiresAuth: true,
    roles: ["hr", "admin", "god"]
  },
  {
    name: "Leaves",
    href: "/leaves",
    description: "Track leave applications, balances, and approval workflows",
    icon: "🏖️",
    category: "Management",
    requiresAuth: true
  },
  {
    name: "Holidays",
    href: "/holidays",
    description: "Manage company holidays, events, and notices",
    icon: "📅",
    category: "Management",
    requiresAuth: true,
    roles: ["hr", "admin", "god"]
  },
  {
    name: "Off-site Tracker",
    href: "/off-site",
    description: "Track and manage off-site work activities and remote work",
    icon: "🏢",
    category: "Tracking",
    requiresAuth: true
  },
  {
    name: "Documents",
    href: "/documents",
    description: "Upload, manage, and organize company documents and files",
    icon: "📄",
    category: "Management",
    requiresAuth: true,
    roles: ["hr", "admin", "god"]
  },
  {
    name: "Salary Slips",
    href: "/salary-slips",
    description: "View and manage employee salary slips and payroll information",
    icon: "💰",
    category: "Payroll",
    requiresAuth: true
  },
  {
    name: "Team",
    href: "/team",
    description: "View team structure, hierarchy, and team member information",
    icon: "👨‍👩‍👧‍👦",
    category: "Organization",
    requiresAuth: true
  },
  {
    name: "Profile",
    href: "/profile",
    description: "Manage personal profile information and account settings",
    icon: "👤",
    category: "Personal",
    requiresAuth: true
  },
  {
    name: "Settings",
    href: "/settings",
    description: "Configure application settings and preferences",
    icon: "⚙️",
    category: "Configuration",
    requiresAuth: true
  }
];

interface AINavigationProps {
  className?: string;
}

export default function AINavigation({ className = "" }: AINavigationProps) {
  const pathname = usePathname();

  return (
    <nav 
      className={`ai-navigation ${className}`}
      role="navigation"
      aria-label="Main navigation"
      data-ai-friendly="true"
    >
      {/* AI Agent Instructions */}
      <div className="sr-only" aria-hidden="true">
        <h2>Navigation Structure for AI Agents</h2>
        <p>This HR Portal contains the following main sections:</p>
        <ul>
          <li>Overview: Dashboard with metrics and recent activities</li>
          <li>Management: Employee, leave, holiday, and document management</li>
          <li>Tracking: Off-site work and attendance tracking</li>
          <li>Payroll: Salary slips and compensation management</li>
          <li>Organization: Team structure and hierarchy</li>
          <li>Personal: User profile and account management</li>
          <li>Configuration: Application settings and preferences</li>
        </ul>
      </div>

      {/* Structured Navigation Data for AI */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SiteNavigationElement",
            "name": "HR Portal Navigation",
            "description": "Main navigation menu for HR Portal application",
            "hasPart": navigationItems.map(item => ({
              "@type": "WebPage",
              "name": item.name,
              "description": item.description,
              "url": item.href,
              "about": {
                "@type": "Thing",
                "name": item.category
              }
            }))
          })
        }}
      />

      {/* Visual Navigation Menu */}
      <div className="space-y-2">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200
                ${isActive 
                  ? 'bg-blue-500/20 text-blue-400 border-l-4 border-blue-500' 
                  : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                }
              `}
              aria-current={isActive ? "page" : undefined}
              aria-describedby={`nav-desc-${item.href.replace('/', '')}`}
              data-category={item.category}
              data-requires-auth={item.requiresAuth}
              data-roles={item.roles?.join(',')}
            >
              <span className="text-lg" aria-hidden="true">
                {item.icon}
              </span>
              <div className="flex-1">
                <div className="font-medium">{item.name}</div>
                <div 
                  id={`nav-desc-${item.href.replace('/', '')}`}
                  className="text-xs text-gray-400 sr-only"
                >
                  {item.description}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* AI Agent Helper Text */}
      <div className="mt-8 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">
          🤖 AI Agent Information
        </h3>
        <div className="text-xs text-gray-400 space-y-1">
          <p>This HR Portal supports AI agent interactions with:</p>
          <ul className="list-disc list-inside ml-2 space-y-1">
            <li>Structured data markup (JSON-LD)</li>
            <li>Semantic HTML5 elements</li>
            <li>ARIA labels and descriptions</li>
            <li>Role-based access control</li>
            <li>RESTful API endpoints</li>
          </ul>
        </div>
      </div>
    </nav>
  );
}

// Export navigation data for AI agents
export { navigationItems };
export type { NavigationItem };
