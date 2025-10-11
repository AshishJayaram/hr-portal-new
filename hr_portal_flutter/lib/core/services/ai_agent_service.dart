import 'dart:convert';
import 'package:flutter/foundation.dart';

/// AI Agent Service for HR Portal Flutter App
/// This service provides AI-friendly data structures and endpoints
class AIAgentService {
  static const String _baseUrl = 'https://hr-portal.example.com/api';
  
  /// Get AI-friendly app structure information
  static Map<String, dynamic> getAppStructure() {
    return {
      '@context': 'https://schema.org',
      '@type': 'MobileApplication',
      'name': 'HR Portal Mobile',
      'description': 'Mobile HR Portal for employee management, leave tracking, and organizational administration',
      'applicationCategory': 'BusinessApplication',
      'operatingSystem': 'Android, iOS',
      'offers': {
        '@type': 'Offer',
        'price': '0',
        'priceCurrency': 'USD'
      },
      'featureList': [
        'Employee Management',
        'Leave Management',
        'Document Management',
        'Payroll Management',
        'Holiday Calendar',
        'Off-site Tracking',
        'Dashboard Analytics',
        'Role-based Access Control',
        'Mobile-optimized Interface',
        'Offline Capabilities'
      ],
      'screens': [
        {
          'name': 'Dashboard',
          'description': 'Overview of HR metrics, recent activities, and upcoming events',
          'category': 'Overview',
          'requiresAuth': true,
          'aiFriendly': true
        },
        {
          'name': 'Employees',
          'description': 'Manage employee profiles, information, and organizational structure',
          'category': 'Management',
          'requiresAuth': true,
          'roles': ['hr', 'admin', 'god'],
          'aiFriendly': true
        },
        {
          'name': 'Leaves',
          'description': 'Track leave applications, balances, and approval workflows',
          'category': 'Management',
          'requiresAuth': true,
          'aiFriendly': true
        },
        {
          'name': 'Holidays',
          'description': 'Manage company holidays, events, and notices',
          'category': 'Management',
          'requiresAuth': true,
          'roles': ['hr', 'admin', 'god'],
          'aiFriendly': true
        },
        {
          'name': 'Off-site Tracker',
          'description': 'Track and manage off-site work activities and remote work',
          'category': 'Tracking',
          'requiresAuth': true,
          'aiFriendly': true
        },
        {
          'name': 'Documents',
          'description': 'Upload, manage, and organize company documents and files',
          'category': 'Management',
          'requiresAuth': true,
          'roles': ['hr', 'admin', 'god'],
          'aiFriendly': true
        },
        {
          'name': 'Salary Slips',
          'description': 'View and manage employee salary slips and payroll information',
          'category': 'Payroll',
          'requiresAuth': true,
          'aiFriendly': true
        },
        {
          'name': 'Team',
          'description': 'View team structure, hierarchy, and team member information',
          'category': 'Organization',
          'requiresAuth': true,
          'aiFriendly': true
        },
        {
          'name': 'Profile',
          'description': 'Manage personal profile information and account settings',
          'category': 'Personal',
          'requiresAuth': true,
          'aiFriendly': true
        },
        {
          'name': 'Settings',
          'description': 'Configure application settings and preferences',
          'category': 'Configuration',
          'requiresAuth': true,
          'aiFriendly': true
        }
      ],
      'apiEndpoints': [
        {
          'method': 'GET',
          'path': '/dashboard/stats',
          'description': 'Get dashboard statistics including metrics, recent activities, and upcoming events',
          'requiresAuth': true,
          'aiFriendly': true
        },
        {
          'method': 'GET',
          'path': '/employees',
          'description': 'Get list of employees with their profiles and organizational information',
          'requiresAuth': true,
          'roles': ['hr', 'admin', 'god'],
          'aiFriendly': true
        },
        {
          'method': 'GET',
          'path': '/leaves',
          'description': 'Get leave applications and their current status',
          'requiresAuth': true,
          'aiFriendly': true
        },
        {
          'method': 'POST',
          'path': '/leaves',
          'description': 'Create a new leave application',
          'requiresAuth': true,
          'aiFriendly': true
        },
        {
          'method': 'GET',
          'path': '/holidays',
          'description': 'Get company holidays, events, and notices',
          'requiresAuth': true,
          'aiFriendly': true
        },
        {
          'method': 'GET',
          'path': '/off-sites',
          'description': 'Get off-site work entries and remote work activities',
          'requiresAuth': true,
          'aiFriendly': true
        },
        {
          'method': 'POST',
          'path': '/off-sites',
          'description': 'Create a new off-site work entry',
          'requiresAuth': true,
          'aiFriendly': true
        },
        {
          'method': 'GET',
          'path': '/documents',
          'description': 'Get company documents and files',
          'requiresAuth': true,
          'roles': ['hr', 'admin', 'god'],
          'aiFriendly': true
        },
        {
          'method': 'GET',
          'path': '/salary-slips',
          'description': 'Get employee salary slips and payroll information',
          'requiresAuth': true,
          'aiFriendly': true
        },
        {
          'method': 'GET',
          'path': '/team',
          'description': 'Get team structure and hierarchy information',
          'requiresAuth': true,
          'aiFriendly': true
        },
        {
          'method': 'GET',
          'path': '/auth/me',
          'description': 'Get current user information and authentication status',
          'requiresAuth': true,
          'aiFriendly': true
        }
      ],
      'aiCapabilities': [
        'Structured data responses',
        'Semantic understanding of HR concepts',
        'Role-based access control',
        'Mobile-optimized interface',
        'Offline data synchronization',
        'Real-time notifications',
        'Calendar integration',
        'Document management',
        'Leave workflow automation',
        'Team hierarchy visualization'
      ],
      'accessibility': {
        'level': 'WCAG-AA',
        'features': [
          'Screen reader support',
          'Voice navigation',
          'High contrast mode',
          'Large text support',
          'Touch-friendly interface',
          'Keyboard navigation'
        ]
      }
    };
  }

  /// Get AI-friendly navigation structure
  static List<Map<String, dynamic>> getNavigationStructure() {
    return [
      {
        'name': 'Dashboard',
        'route': '/dashboard',
        'description': 'Overview of HR metrics, recent activities, and upcoming events',
        'category': 'Overview',
        'icon': '📊',
        'requiresAuth': true,
        'aiFriendly': true
      },
      {
        'name': 'Employees',
        'route': '/employees',
        'description': 'Manage employee profiles, information, and organizational structure',
        'category': 'Management',
        'icon': '👥',
        'requiresAuth': true,
        'roles': ['hr', 'admin', 'god'],
        'aiFriendly': true
      },
      {
        'name': 'Leaves',
        'route': '/leaves',
        'description': 'Track leave applications, balances, and approval workflows',
        'category': 'Management',
        'icon': '🏖️',
        'requiresAuth': true,
        'aiFriendly': true
      },
      {
        'name': 'Holidays',
        'route': '/holidays',
        'description': 'Manage company holidays, events, and notices',
        'category': 'Management',
        'icon': '📅',
        'requiresAuth': true,
        'roles': ['hr', 'admin', 'god'],
        'aiFriendly': true
      },
      {
        'name': 'Off-site Tracker',
        'route': '/off-site',
        'description': 'Track and manage off-site work activities and remote work',
        'category': 'Tracking',
        'icon': '🏢',
        'requiresAuth': true,
        'aiFriendly': true
      },
      {
        'name': 'Documents',
        'route': '/documents',
        'description': 'Upload, manage, and organize company documents and files',
        'category': 'Management',
        'icon': '📄',
        'requiresAuth': true,
        'roles': ['hr', 'admin', 'god'],
        'aiFriendly': true
      },
      {
        'name': 'Salary Slips',
        'route': '/salary-slips',
        'description': 'View and manage employee salary slips and payroll information',
        'category': 'Payroll',
        'icon': '💰',
        'requiresAuth': true,
        'aiFriendly': true
      },
      {
        'name': 'Team',
        'route': '/team',
        'description': 'View team structure, hierarchy, and team member information',
        'category': 'Organization',
        'icon': '👨‍👩‍👧‍👦',
        'requiresAuth': true,
        'aiFriendly': true
      },
      {
        'name': 'Profile',
        'route': '/profile',
        'description': 'Manage personal profile information and account settings',
        'category': 'Personal',
        'icon': '👤',
        'requiresAuth': true,
        'aiFriendly': true
      },
      {
        'name': 'Settings',
        'route': '/settings',
        'description': 'Configure application settings and preferences',
        'category': 'Configuration',
        'icon': '⚙️',
        'requiresAuth': true,
        'aiFriendly': true
      }
    ];
  }

  /// Get AI-friendly data models
  static Map<String, dynamic> getDataModels() {
    return {
      'User': {
        'id': 'string',
        'username': 'string',
        'email': 'string',
        'firstName': 'string',
        'lastName': 'string',
        'role': 'string',
        'organizationId': 'string',
        'managerId': 'string',
        'phone': 'string',
        'createdAt': 'datetime',
        'updatedAt': 'datetime'
      },
      'Leave': {
        'id': 'string',
        'userId': 'string',
        'type': 'string',
        'from': 'date',
        'to': 'date',
        'reason': 'string',
        'status': 'string',
        'createdAt': 'datetime',
        'updatedAt': 'datetime'
      },
      'Holiday': {
        'id': 'string',
        'name': 'string',
        'date': 'date',
        'type': 'string',
        'description': 'string',
        'organizationId': 'string',
        'createdAt': 'datetime',
        'updatedAt': 'datetime'
      },
      'OffSite': {
        'id': 'string',
        'title': 'string',
        'description': 'string',
        'location': 'string',
        'type': 'string',
        'status': 'string',
        'startDate': 'date',
        'endDate': 'date',
        'userId': 'string',
        'organizationId': 'string',
        'createdAt': 'datetime',
        'updatedAt': 'datetime'
      },
      'Document': {
        'id': 'string',
        'name': 'string',
        'description': 'string',
        'filePath': 'string',
        'fileSize': 'number',
        'mimeType': 'string',
        'userId': 'string',
        'organizationId': 'string',
        'createdAt': 'datetime',
        'updatedAt': 'datetime'
      },
      'SalarySlip': {
        'id': 'string',
        'userId': 'string',
        'month': 'number',
        'year': 'number',
        'filePath': 'string',
        'organizationId': 'string',
        'createdAt': 'datetime',
        'updatedAt': 'datetime'
      }
    };
  }

  /// Get AI agent instructions
  static Map<String, dynamic> getAIInstructions() {
    return {
      'authentication': {
        'type': 'Bearer Token',
        'header': 'Authorization',
        'format': 'Bearer <token>',
        'required': true
      },
      'organization': {
        'header': 'X-Organization-ID',
        'description': 'Required for multi-tenant support',
        'required': true
      },
      'rateLimiting': {
        'enabled': true,
        'maxRequests': 100,
        'timeWindow': '1 minute',
        'strategy': 'exponential backoff'
      },
      'errorHandling': {
        'format': 'JSON',
        'structure': {
          'error': 'string',
          'message': 'string',
          'code': 'number',
          'details': 'object'
        }
      },
      'dataFormat': {
        'dates': 'ISO 8601 (YYYY-MM-DD)',
        'timestamps': 'ISO 8601 (YYYY-MM-DDTHH:mm:ssZ)',
        'numbers': 'JSON number',
        'booleans': 'JSON boolean',
        'strings': 'UTF-8 encoded'
      },
      'bestPractices': [
        'Always include proper authentication headers',
        'Handle rate limiting gracefully with exponential backoff',
        'Parse structured error responses for better user experience',
        'Cache frequently accessed data to reduce API calls',
        'Respect user privacy and only access authorized data',
        'Use semantic understanding of HR concepts for better assistance',
        'Provide clear, actionable error messages',
        'Support offline functionality when possible',
        'Implement proper loading states and progress indicators',
        'Use consistent data structures across all endpoints'
      ],
      'mobileSpecific': [
        'Optimize for touch interactions',
        'Support offline data synchronization',
        'Implement proper loading states',
        'Use native platform features when available',
        'Provide haptic feedback for important actions',
        'Support voice navigation and accessibility',
        'Implement proper error boundaries',
        'Use efficient data caching strategies',
        'Support background data updates',
        'Implement proper security measures'
      ]
    };
  }

  /// Generate AI-friendly app manifest
  static Map<String, dynamic> generateAppManifest() {
    return {
      'name': 'HR Portal Mobile',
      'short_name': 'HR Portal',
      'description': 'Mobile HR Portal for employee management, leave tracking, and organizational administration',
      'version': '1.0.0',
      'ai_friendly': true,
      'structured_data': true,
      'accessibility': 'WCAG-AA',
      'semantic_markup': true,
      'api_documentation': 'https://hr-portal.example.com/api-docs',
      'support_email': 'support@hr-portal.example.com',
      'privacy_policy': 'https://hr-portal.example.com/privacy',
      'terms_of_service': 'https://hr-portal.example.com/terms',
      'features': getAppStructure()['featureList'],
      'screens': getAppStructure()['screens'],
      'api_endpoints': getAppStructure()['apiEndpoints'],
      'ai_capabilities': getAppStructure()['aiCapabilities'],
      'accessibility_features': getAppStructure()['accessibility']['features']
    };
  }

  /// Log AI agent interaction
  static void logAIAgentInteraction(String agent, String action, Map<String, dynamic>? data) {
    if (kDebugMode) {
      print('🤖 AI Agent Interaction: $agent - $action');
      if (data != null) {
        print('Data: ${jsonEncode(data)}');
      }
    }
  }

  /// Validate AI agent request
  static bool validateAIRequest(Map<String, dynamic> request) {
    // Basic validation for AI agent requests
    if (!request.containsKey('agent') || !request.containsKey('action')) {
      return false;
    }
    
    final agent = request['agent'] as String;
    final action = request['action'] as String;
    
    // Validate agent type
    const validAgents = ['GPTBot', 'ChatGPT-User', 'Claude-Web', 'PerplexityBot', 'Bard'];
    if (!validAgents.contains(agent)) {
      return false;
    }
    
    // Validate action type
    const validActions = ['navigate', 'fetch_data', 'create_record', 'update_record', 'delete_record', 'search'];
    if (!validActions.contains(action)) {
      return false;
    }
    
    return true;
  }
}
