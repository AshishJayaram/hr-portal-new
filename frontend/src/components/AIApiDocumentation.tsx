"use client";

import React from "react";

interface APIEndpoint {
  method: string;
  path: string;
  description: string;
  requiresAuth: boolean;
  roles?: string[];
  parameters?: {
    name: string;
    type: string;
    required: boolean;
    description: string;
  }[];
  response?: {
    type: string;
    description: string;
    example?: any;
  };
}

const apiEndpoints: APIEndpoint[] = [
  {
    method: "GET",
    path: "/api/dashboard/stats",
    description: "Get dashboard statistics including metrics, recent activities, and upcoming events",
    requiresAuth: true,
    response: {
      type: "DashboardStatsResponse",
      description: "Dashboard statistics including user counts, leave balances, recent activities",
      example: {
        total_users: 150,
        total_leaves: 45,
        pending_leaves: 12,
        approved_leaves: 33,
        total_documents: 89,
        upcoming_holidays: [],
        recent_leaves: [],
        recent_documents: [],
        recent_salary_slips: [],
        leave_balances: [],
        recent_off_sites: []
      }
    }
  },
  {
    method: "GET",
    path: "/api/employees",
    description: "Get list of employees with their profiles and organizational information",
    requiresAuth: true,
    roles: ["hr", "admin", "god"],
    response: {
      type: "Employee[]",
      description: "Array of employee objects with profile information"
    }
  },
  {
    method: "GET",
    path: "/api/leaves",
    description: "Get leave applications and their current status",
    requiresAuth: true,
    response: {
      type: "Leave[]",
      description: "Array of leave applications with status and details"
    }
  },
  {
    method: "POST",
    path: "/api/leaves",
    description: "Create a new leave application",
    requiresAuth: true,
    parameters: [
      {
        name: "type",
        type: "string",
        required: true,
        description: "Type of leave (e.g., 'Annual', 'Sick', 'LOP')"
      },
      {
        name: "from",
        type: "string",
        required: true,
        description: "Start date in YYYY-MM-DD format"
      },
      {
        name: "to",
        type: "string",
        required: true,
        description: "End date in YYYY-MM-DD format"
      },
      {
        name: "reason",
        type: "string",
        required: true,
        description: "Reason for the leave application"
      }
    ],
    response: {
      type: "Leave",
      description: "Created leave application object"
    }
  },
  {
    method: "GET",
    path: "/api/holidays",
    description: "Get company holidays, events, and notices",
    requiresAuth: true,
    parameters: [
      {
        name: "year",
        type: "number",
        required: false,
        description: "Filter holidays by year"
      }
    ],
    response: {
      type: "Holiday[]",
      description: "Array of holidays, events, and notices"
    }
  },
  {
    method: "GET",
    path: "/api/off-sites",
    description: "Get off-site work entries and remote work activities",
    requiresAuth: true,
    response: {
      type: "OffSite[]",
      description: "Array of off-site work entries"
    }
  },
  {
    method: "POST",
    path: "/api/off-sites",
    description: "Create a new off-site work entry",
    requiresAuth: true,
    parameters: [
      {
        name: "title",
        type: "string",
        required: true,
        description: "Title of the off-site work"
      },
      {
        name: "description",
        type: "string",
        required: false,
        description: "Description of the off-site work"
      },
      {
        name: "location",
        type: "string",
        required: false,
        description: "Location of the off-site work"
      },
      {
        name: "start_date",
        type: "string",
        required: true,
        description: "Start date in YYYY-MM-DD format"
      },
      {
        name: "end_date",
        type: "string",
        required: true,
        description: "End date in YYYY-MM-DD format"
      }
    ],
    response: {
      type: "OffSite",
      description: "Created off-site work entry"
    }
  },
  {
    method: "GET",
    path: "/api/documents",
    description: "Get company documents and files",
    requiresAuth: true,
    roles: ["hr", "admin", "god"],
    response: {
      type: "Document[]",
      description: "Array of document objects"
    }
  },
  {
    method: "GET",
    path: "/api/salary-slips",
    description: "Get employee salary slips and payroll information",
    requiresAuth: true,
    response: {
      type: "SalarySlip[]",
      description: "Array of salary slip objects"
    }
  },
  {
    method: "GET",
    path: "/api/team",
    description: "Get team structure and hierarchy information",
    requiresAuth: true,
    response: {
      type: "TeamMember[]",
      description: "Array of team members with hierarchy information"
    }
  },
  {
    method: "GET",
    path: "/api/auth/me",
    description: "Get current user information and authentication status",
    requiresAuth: true,
    response: {
      type: "User",
      description: "Current user object with profile and role information"
    }
  }
];

export default function AIApiDocumentation() {
  return (
    <div className="ai-api-documentation" data-ai-friendly="true">
      {/* Structured Data for AI Understanding */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "APIReference",
            "name": "HR Portal API Documentation",
            "description": "RESTful API endpoints for HR Portal application",
            "url": typeof window !== 'undefined' ? window.location.href : '',
            "about": {
              "@type": "SoftwareApplication",
              "name": "HR Portal"
            },
            "hasPart": apiEndpoints.map(endpoint => ({
              "@type": "APIEndpoint",
              "name": endpoint.path,
              "description": endpoint.description,
              "httpMethod": endpoint.method,
              "requiresAuthentication": endpoint.requiresAuth,
              "accessMode": endpoint.roles ? endpoint.roles.join(', ') : "all"
            }))
          })
        }}
      />

      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            🤖 AI Agent API Documentation
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            This HR Portal provides a RESTful API that is designed to be AI-agent friendly with structured responses, 
            clear error handling, and comprehensive documentation.
          </p>
        </header>

        {/* AI Agent Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
            Instructions for AI Agents
          </h2>
          <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
            <p><strong>Authentication:</strong> All API endpoints require Bearer token authentication in the Authorization header.</p>
            <p><strong>Organization Context:</strong> Include X-Organization-ID header for multi-tenant support.</p>
            <p><strong>Rate Limiting:</strong> API calls are rate-limited to prevent abuse.</p>
            <p><strong>Error Handling:</strong> All errors return structured JSON with error codes and messages.</p>
            <p><strong>Data Format:</strong> All dates are in ISO 8601 format (YYYY-MM-DD).</p>
          </div>
        </div>

        {/* API Endpoints */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Available API Endpoints
          </h2>
          
          {apiEndpoints.map((endpoint, index) => (
            <div 
              key={index}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${
                    endpoint.method === 'GET' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    endpoint.method === 'POST' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                  }`}>
                    {endpoint.method}
                  </span>
                  <code className="text-sm font-mono text-gray-900 dark:text-gray-100">
                    {endpoint.path}
                  </code>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {endpoint.requiresAuth ? '🔒 Auth Required' : '🔓 Public'}
                  {endpoint.roles && ` • Roles: ${endpoint.roles.join(', ')}`}
                </div>
              </div>
              
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                {endpoint.description}
              </p>

              {endpoint.parameters && (
                <div className="mb-3">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Parameters:
                  </h4>
                  <div className="space-y-1">
                    {endpoint.parameters.map((param, paramIndex) => (
                      <div key={paramIndex} className="text-xs">
                        <code className="text-blue-600 dark:text-blue-400">{param.name}</code>
                        <span className="text-gray-500 dark:text-gray-400"> ({param.type})</span>
                        {param.required && <span className="text-red-500"> *</span>}
                        <span className="text-gray-600 dark:text-gray-400"> - {param.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {endpoint.response && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Response:
                  </h4>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    <p><strong>Type:</strong> {endpoint.response.type}</p>
                    <p><strong>Description:</strong> {endpoint.response.description}</p>
                    {endpoint.response.example && (
                      <div className="mt-2">
                        <p><strong>Example:</strong></p>
                        <pre className="bg-gray-100 dark:bg-gray-900 p-2 rounded text-xs overflow-x-auto">
                          {JSON.stringify(endpoint.response.example, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* AI Agent Best Practices */}
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-3">
            Best Practices for AI Agents
          </h2>
          <div className="text-sm text-green-800 dark:text-green-200 space-y-2">
            <p>• Always include proper authentication headers</p>
            <p>• Handle rate limiting gracefully with exponential backoff</p>
            <p>• Parse structured error responses for better user experience</p>
            <p>• Cache frequently accessed data to reduce API calls</p>
            <p>• Respect user privacy and only access authorized data</p>
            <p>• Use semantic understanding of HR concepts for better assistance</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export API endpoints for AI agents
export { apiEndpoints };
export type { APIEndpoint };
