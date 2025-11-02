"use client";

import React from 'react';

interface Tab {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
  badge?: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
  variant?: 'default' | 'pills' | 'underline';
}

export default function Tabs({ 
  tabs, 
  activeTab, 
  onTabChange, 
  className = "",
  variant = 'default'
}: TabsProps) {
  const getTabClasses = (tab: Tab) => {
    const baseClasses = "font-semibold text-sm transition-all duration-200";
    
    switch (variant) {
      case 'pills':
        return `${baseClasses} px-4 py-2 rounded-lg ${
          activeTab === tab.id
            ? 'bg-indigo-500 text-white shadow-md'
            : 'text-secondary dark:text-gray-300 hover:text-primary dark:hover:text-white hover:bg-white/10 dark:hover:bg-white/20'
        }`;
      
      case 'underline':
        return `${baseClasses} py-4 px-1 border-b-2 ${
          activeTab === tab.id
            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
            : 'border-transparent text-secondary dark:text-gray-400 hover:text-primary dark:hover:text-gray-300 hover:border-indigo-300 dark:hover:border-indigo-500/40'
        }`;
      
      default:
        return `${baseClasses} py-4 px-1 border-b-2 ${
          activeTab === tab.id
            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
            : 'border-transparent text-secondary dark:text-gray-400 hover:text-primary dark:hover:text-gray-300 hover:border-indigo-300 dark:hover:border-indigo-500/40'
        }`;
    }
  };

  const getContainerClasses = () => {
    switch (variant) {
      case 'pills':
        return `flex space-x-2 ${className}`;
      case 'underline':
      default:
        return `border-b border-card dark:border-white/10 ${className}`;
    }
  };

  return (
    <div className={getContainerClasses()}>
      <nav className={variant === 'pills' ? "flex space-x-2" : "flex space-x-8"} aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={getTabClasses(tab)}
            data-tab={tab.id}
          >
            <div className="flex items-center space-x-2">
              {tab.icon && (
                <span className="flex-shrink-0">{tab.icon}</span>
              )}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  activeTab === tab.id
                    ? 'bg-indigo-500/30 text-indigo-700 dark:text-indigo-300 border-indigo-500/40 dark:border-indigo-500/40'
                    : 'bg-white/5 dark:bg-white/10 text-secondary dark:text-gray-300 border-card dark:border-white/10'
                }`}>
                  {tab.count}
                </span>
              )}
              {tab.badge && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
                  activeTab === tab.id
                    ? 'bg-red-500/30 text-red-700 dark:text-red-300 border-red-500/40 dark:border-red-500/40'
                    : 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30 dark:border-red-500/30'
                }`}>
                  {tab.badge}
                </span>
              )}
            </div>
          </button>
        ))}
      </nav>
    </div>
  );
}
