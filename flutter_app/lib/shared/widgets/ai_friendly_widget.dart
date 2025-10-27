import 'package:flutter/material.dart';

/// AI-Friendly Widget Base Class
/// Provides semantic markup and structured data for AI agents
abstract class AIFriendlyWidget extends StatelessWidget {
  const AIFriendlyWidget({super.key});

  /// Get semantic role for this widget
  String get semanticRole;

  /// Get description for AI agents
  String get aiDescription;

  /// Get category for this widget
  String get category;

  /// Get structured data for this widget
  Map<String, dynamic> get structuredData;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: aiDescription,
      hint: 'AI-friendly widget with semantic markup',
      child: Container(
        child: buildContent(context),
      ),
    );
  }

  /// Build the actual widget content
  Widget buildContent(BuildContext context);
}

/// AI-Friendly Card Widget
class AIFriendlyCard extends AIFriendlyWidget {
  final String title;
  final String description;
  final Widget child;
  final String? widgetCategory;
  final Map<String, dynamic>? additionalData;

  const AIFriendlyCard({
    super.key,
    required this.title,
    required this.description,
    required this.child,
    this.widgetCategory,
    this.additionalData,
  });

  @override
  String get semanticRole => 'card';

  @override
  String get aiDescription => description;

  @override
  String get category => widgetCategory ?? 'General';

  @override
  Map<String, dynamic> get structuredData => {
    '@type': 'Card',
    'title': title,
    'description': description,
        'category': widgetCategory,
    'aiFriendly': true,
    ...?additionalData,
  };

  @override
  Widget buildContent(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              description,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Colors.grey[600],
              ),
            ),
            const SizedBox(height: 16),
            child,
          ],
        ),
      ),
    );
  }
}

/// AI-Friendly List Item Widget
class AIFriendlyListItem extends AIFriendlyWidget {
  final String title;
  final String description;
  final Widget? leading;
  final Widget? trailing;
  final VoidCallback? onTap;
  final String? widgetCategory;
  final Map<String, dynamic>? itemData;

  const AIFriendlyListItem({
    super.key,
    required this.title,
    required this.description,
    this.leading,
    this.trailing,
    this.onTap,
    this.widgetCategory,
    this.itemData,
  });

  @override
  String get semanticRole => 'listitem';

  @override
  String get aiDescription => description;

  @override
  String get category => widgetCategory ?? 'General';

  @override
  Map<String, dynamic> get structuredData => {
    '@type': 'ListItem',
    'title': title,
    'description': description,
        'category': widgetCategory,
    'interactive': onTap != null,
    'aiFriendly': true,
    ...?itemData,
  };

  @override
  Widget buildContent(BuildContext context) {
    return ListTile(
      leading: leading,
      title: Text(title),
      subtitle: Text(description),
      trailing: trailing,
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
    );
  }
}

/// AI-Friendly Button Widget
class AIFriendlyButton extends AIFriendlyWidget {
  final String text;
  final String description;
  final VoidCallback? onPressed;
  final ButtonStyle? style;
  final String? widgetCategory;
  final Map<String, dynamic>? actionData;

  const AIFriendlyButton({
    super.key,
    required this.text,
    required this.description,
    this.onPressed,
    this.style,
    this.widgetCategory,
    this.actionData,
  });

  @override
  String get semanticRole => 'button';

  @override
  String get aiDescription => description;

  @override
  String get category => widgetCategory ?? 'Action';

  @override
  Map<String, dynamic> get structuredData => {
    '@type': 'Button',
    'text': text,
    'description': description,
        'category': widgetCategory,
    'enabled': onPressed != null,
    'aiFriendly': true,
    ...?actionData,
  };

  @override
  Widget buildContent(BuildContext context) {
    return ElevatedButton(
      onPressed: onPressed,
      style: style,
      child: Text(text),
    );
  }
}

/// AI-Friendly Form Field Widget
class AIFriendlyFormField extends AIFriendlyWidget {
  final String label;
  final String description;
  final TextEditingController? controller;
  final String? Function(String?)? validator;
  final String? widgetCategory;
  final Map<String, dynamic>? fieldData;

  const AIFriendlyFormField({
    super.key,
    required this.label,
    required this.description,
    this.controller,
    this.validator,
    this.widgetCategory,
    this.fieldData,
  });

  @override
  String get semanticRole => 'textfield';

  @override
  String get aiDescription => description;

  @override
  String get category => widgetCategory ?? 'Input';

  @override
  Map<String, dynamic> get structuredData => {
    '@type': 'FormField',
    'label': label,
    'description': description,
        'category': widgetCategory,
    'required': validator != null,
    'aiFriendly': true,
    ...?fieldData,
  };

  @override
  Widget buildContent(BuildContext context) {
    return TextFormField(
      controller: controller,
      validator: validator,
      decoration: InputDecoration(
        labelText: label,
        helperText: description,
        border: const OutlineInputBorder(),
      ),
    );
  }
}

/// AI-Friendly Navigation Widget
class AIFriendlyNavigation extends AIFriendlyWidget {
  final List<Map<String, dynamic>> items;
  final String? currentRoute;
  final Function(String)? onNavigate;

  const AIFriendlyNavigation({
    super.key,
    required this.items,
    this.currentRoute,
    this.onNavigate,
  });

  @override
  String get semanticRole => 'navigation';

  @override
  String get aiDescription => 'Main navigation menu for HR Portal application';

  @override
  String get category => 'Navigation';

  @override
  Map<String, dynamic> get structuredData => {
    '@type': 'SiteNavigationElement',
    'name': 'HR Portal Navigation',
    'description': aiDescription,
    'hasPart': items.map((item) => ({
      '@type': 'WebPage',
      'name': item['name'],
      'description': item['description'],
      'url': item['route'],
      'about': {
        '@type': 'Thing',
        'name': item['category']
      }
    })).toList(),
    'aiFriendly': true,
  };

  @override
  Widget buildContent(BuildContext context) {
    return Column(
      children: items.map((item) {
        final isActive = currentRoute == item['route'];
        
        return AIFriendlyListItem(
          title: item['name'],
          description: item['description'],
          widgetCategory: item['category'],
          leading: Text(item['icon'] ?? '📄'),
          onTap: () => onNavigate?.call(item['route']),
          itemData: {
            'route': item['route'],
            'active': isActive,
            'requiresAuth': item['requiresAuth'],
            'roles': item['roles'],
          },
        );
      }).toList(),
    );
  }
}

/// AI-Friendly Dashboard Widget
class AIFriendlyDashboard extends AIFriendlyWidget {
  final List<Widget> children;
  final String title;
  final String description;

  const AIFriendlyDashboard({
    super.key,
    required this.children,
    required this.title,
    required this.description,
  });

  @override
  String get semanticRole => 'main';

  @override
  String get aiDescription => description;

  @override
  String get category => 'Dashboard';

  @override
  Map<String, dynamic> get structuredData => {
    '@type': 'WebPage',
    'name': title,
    'description': description,
    'url': '/dashboard',
    'isPartOf': {
      '@type': 'WebSite',
      'name': 'HR Portal'
    },
    'about': {
      '@type': 'Organization',
      'name': 'HR Management System'
    },
    'mainEntity': {
      '@type': 'ItemList',
      'name': 'Dashboard Metrics',
      'itemListElement': children.map((child) => ({
        '@type': 'ListItem',
        'name': 'Dashboard Component',
        'description': 'Interactive dashboard component'
      })).toList()
    },
    'aiFriendly': true,
  };

  @override
  Widget buildContent(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(title),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              description,
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                color: Colors.grey[600],
              ),
            ),
            const SizedBox(height: 24),
            ...children,
          ],
        ),
      ),
    );
  }
}

/// AI-Friendly Error Widget
class AIFriendlyError extends AIFriendlyWidget {
  final String message;
  final String? description;
  final VoidCallback? onRetry;
  final String? widgetCategory;

  const AIFriendlyError({
    super.key,
    required this.message,
    this.description,
    this.onRetry,
    this.widgetCategory,
  });

  @override
  String get semanticRole => 'alert';

  @override
  String get aiDescription => description ?? 'Error occurred: $message';

  @override
  String get category => widgetCategory ?? 'Error';

  @override
  Map<String, dynamic> get structuredData => {
    '@type': 'Error',
    'message': message,
    'description': description,
        'category': widgetCategory,
    'retryable': onRetry != null,
    'aiFriendly': true,
  };

  @override
  Widget buildContent(BuildContext context) {
    return Card(
      color: Colors.red[50],
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.error, color: Colors.red[600]),
                const SizedBox(width: 8),
                Text(
                  'Error',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: Colors.red[600],
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              message,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            if (description != null) ...[
              const SizedBox(height: 4),
              Text(
                description!,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Colors.grey[600],
                ),
              ),
            ],
            if (onRetry != null) ...[
              const SizedBox(height: 16),
              AIFriendlyButton(
                text: 'Retry',
                description: 'Retry the failed operation',
                onPressed: onRetry,
                widgetCategory: 'Error Recovery',
              ),
            ],
          ],
        ),
      ),
    );
  }
}
