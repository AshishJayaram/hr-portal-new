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
    const baseClasses = "font-medium text-sm transition-all duration-200";
    
    switch (variant) {
      case 'pills':
        return `${baseClasses} px-4 py-2 rounded-lg ${
          activeTab === tab.id
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-800'
        }`;
      
      case 'underline':
        return `${baseClasses} py-4 px-1 border-b-2 ${
          activeTab === tab.id
            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
        }`;
      
      default:
        return `${baseClasses} py-4 px-1 border-b-2 ${
          activeTab === tab.id
            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
        }`;
    }
  };

  const getContainerClasses = () => {
    switch (variant) {
      case 'pills':
        return `flex space-x-2 ${className}`;
      case 'underline':
      default:
        return `border-b border-gray-200 dark:border-gray-700 ${className}`;
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
          >
            <div className="flex items-center space-x-2">
              {tab.icon && (
                <span className="flex-shrink-0">{tab.icon}</span>
              )}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  activeTab === tab.id
                    ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                }`}>
                  {tab.count}
                </span>
              )}
              {tab.badge && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  activeTab === tab.id
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
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
