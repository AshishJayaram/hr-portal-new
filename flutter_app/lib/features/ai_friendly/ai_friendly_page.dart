import 'package:flutter/material.dart';
import '../../core/services/ai_agent_service.dart';
import '../../shared/widgets/ai_friendly_widget.dart';

class AIFriendlyPage extends StatelessWidget {
  const AIFriendlyPage({super.key});

  @override
  Widget build(BuildContext context) {
    return AIFriendlyDashboard(
      title: 'AI-Friendly HR Portal',
      description: 'This HR Portal is designed to be AI-agent friendly with structured data, semantic markup, and comprehensive API documentation.',
      children: [
        // AI Agent Information
        AIFriendlyCard(
          title: '🤖 AI Agent Information',
          description: 'Information about AI agent capabilities and features',
          widgetCategory: 'Information',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildInfoItem('Structured Data', 'JSON-LD markup for better AI understanding'),
              _buildInfoItem('Semantic HTML', 'HTML5 elements with proper roles and landmarks'),
              _buildInfoItem('ARIA Labels', 'Accessibility labels for screen readers and AI agents'),
              _buildInfoItem('API Documentation', 'Comprehensive RESTful API with clear endpoints'),
              _buildInfoItem('Role-based Access', 'Granular permissions for different user roles'),
              _buildInfoItem('Mobile Optimized', 'Touch-friendly interface with offline capabilities'),
            ],
          ),
        ),

        // App Structure
        AIFriendlyCard(
          title: '📱 App Structure',
          description: 'Overview of the HR Portal application structure',
          widgetCategory: 'Structure',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Screens:',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              ...AIAgentService.getNavigationStructure().map((screen) => 
                Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Row(
                    children: [
                      Text(screen['icon'] ?? '📄'),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          '${screen['name']} - ${screen['description']}',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),

        // API Endpoints
        AIFriendlyCard(
          title: '🔌 API Endpoints',
          description: 'Available RESTful API endpoints for AI agents',
          widgetCategory: 'API',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Available Endpoints:',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              ...AIAgentService.getAppStructure()['apiEndpoints'].map<Widget>((endpoint) => 
                Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: endpoint['method'] == 'GET' ? Colors.green[100] : Colors.blue[100],
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          endpoint['method'],
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: endpoint['method'] == 'GET' ? Colors.green[800] : Colors.blue[800],
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          '${endpoint['path']} - ${endpoint['description']}',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),

        // Data Models
        AIFriendlyCard(
          title: '📊 Data Models',
          description: 'Structured data models used in the HR Portal',
          widgetCategory: 'Data',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Available Models:',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              ...AIAgentService.getDataModels().entries.map((entry) => 
                Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Row(
                    children: [
                      Text('📋'),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          '${entry.key} - ${entry.value.length} fields',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),

        // AI Instructions
        AIFriendlyCard(
          title: '📋 AI Agent Instructions',
          description: 'Best practices and instructions for AI agents',
          widgetCategory: 'Instructions',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Best Practices:',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              ...AIAgentService.getAIInstructions()['bestPractices'].map<Widget>((practice) => 
                Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('• '),
                      Expanded(
                        child: Text(
                          practice,
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),

        // Mobile Specific Features
        AIFriendlyCard(
          title: '📱 Mobile Specific Features',
          description: 'Mobile-optimized features for AI agents',
          widgetCategory: 'Mobile',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Mobile Features:',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              ...AIAgentService.getAIInstructions()['mobileSpecific'].map<Widget>((feature) => 
                Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('• '),
                      Expanded(
                        child: Text(
                          feature,
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),

        // Accessibility Features
        AIFriendlyCard(
          title: '♿ Accessibility Features',
          description: 'Accessibility features for AI agents and users',
          widgetCategory: 'Accessibility',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Accessibility Level: WCAG-AA',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              ...AIAgentService.getAppStructure()['accessibility']['features'].map<Widget>((feature) => 
                Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Row(
                    children: [
                      Text('✓ '),
                      Expanded(
                        child: Text(
                          feature,
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),

        // Contact Information
        AIFriendlyCard(
          title: '📞 Contact Information',
          description: 'Support and contact information for AI agents',
          widgetCategory: 'Contact',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildContactItem('Support Email', 'support@hr-portal.example.com'),
              _buildContactItem('API Documentation', 'https://hr-portal.example.com/api-docs'),
              _buildContactItem('Privacy Policy', 'https://hr-portal.example.com/privacy'),
              _buildContactItem('Terms of Service', 'https://hr-portal.example.com/terms'),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildInfoItem(String title, String description) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('✓ '),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w500),
                ),
                Text(
                  description,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContactItem(String title, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('📧 '),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w500),
                ),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
