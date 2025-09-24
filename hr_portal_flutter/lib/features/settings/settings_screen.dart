import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../shared/widgets/app_drawer.dart';
import '../../core/theme/app_theme.dart';
import '../../core/providers/providers.dart';

class SettingsScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
      drawer: const AppDrawer(),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Theme Settings
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Appearance',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  ListTile(
                    leading: Icon(Icons.palette, color: AppTheme.primaryColor),
                    title: const Text('Theme'),
                    subtitle: Text(_getThemeModeText(themeMode)),
                    trailing: DropdownButton<ThemeMode>(
                      value: themeMode,
                      items: [
                        DropdownMenuItem(
                          value: ThemeMode.light,
                          child: const Text('Light'),
                        ),
                        DropdownMenuItem(
                          value: ThemeMode.dark,
                          child: const Text('Dark'),
                        ),
                        DropdownMenuItem(
                          value: ThemeMode.system,
                          child: const Text('System'),
                        ),
                      ],
                      onChanged: (value) {
                        if (value != null) {
                          ref.read(themeModeProvider.notifier).setThemeMode(value);
                        }
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),
          
          const SizedBox(height: 16),
          
          // Account Settings
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Account',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  ListTile(
                    leading: Icon(Icons.person, color: AppTheme.primaryColor),
                    title: const Text('Profile'),
                    subtitle: const Text('Manage your profile information'),
                    trailing: const Icon(Icons.arrow_forward_ios),
                    onTap: () {
                      // TODO: Navigate to profile
                    },
                  ),
                  ListTile(
                    leading: Icon(Icons.lock, color: AppTheme.primaryColor),
                    title: const Text('Change Password'),
                    subtitle: const Text('Update your password'),
                    trailing: const Icon(Icons.arrow_forward_ios),
                    onTap: () {
                      _showChangePasswordDialog(context);
                    },
                  ),
                ],
              ),
            ),
          ),
          
          const SizedBox(height: 16),
          
          // Notification Settings
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Notifications',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  SwitchListTile(
                    secondary: Icon(Icons.notifications, color: AppTheme.primaryColor),
                    title: const Text('Push Notifications'),
                    subtitle: const Text('Receive push notifications'),
                    value: true,
                    onChanged: (value) {
                      // TODO: Implement notification toggle
                    },
                  ),
                  SwitchListTile(
                    secondary: Icon(Icons.email, color: AppTheme.primaryColor),
                    title: const Text('Email Notifications'),
                    subtitle: const Text('Receive email notifications'),
                    value: true,
                    onChanged: (value) {
                      // TODO: Implement email notification toggle
                    },
                  ),
                ],
              ),
            ),
          ),
          
          const SizedBox(height: 16),
          
          // About
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'About',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  ListTile(
                    leading: Icon(Icons.info, color: AppTheme.primaryColor),
                    title: const Text('App Version'),
                    subtitle: const Text('1.0.0'),
                  ),
                  ListTile(
                    leading: Icon(Icons.help, color: AppTheme.primaryColor),
                    title: const Text('Help & Support'),
                    subtitle: const Text('Get help and support'),
                    trailing: const Icon(Icons.arrow_forward_ios),
                    onTap: () {
                      _showHelpDialog(context);
                    },
                  ),
                  ListTile(
                    leading: Icon(Icons.privacy_tip, color: AppTheme.primaryColor),
                    title: const Text('Privacy Policy'),
                    subtitle: const Text('View privacy policy'),
                    trailing: const Icon(Icons.arrow_forward_ios),
                    onTap: () {
                      _showPrivacyDialog(context);
                    },
                  ),
                ],
              ),
            ),
          ),
          
          const SizedBox(height: 32),
          
          // Logout Button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () {
                ref.read(authProvider.notifier).logout();
              },
              icon: const Icon(Icons.logout),
              label: const Text('Logout'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.errorColor,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _getThemeModeText(ThemeMode mode) {
    switch (mode) {
      case ThemeMode.light:
        return 'Light';
      case ThemeMode.dark:
        return 'Dark';
      case ThemeMode.system:
        return 'System';
    }
  }

  void _showChangePasswordDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Change Password'),
        content: const Text('Password change functionality - Coming Soon'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  void _showHelpDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Help & Support'),
        content: const Text('Help and support information - Coming Soon'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  void _showPrivacyDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Privacy Policy'),
        content: const Text('Privacy policy information - Coming Soon'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }
}
