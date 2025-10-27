import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../shared/widgets/app_drawer.dart';
import '../../core/theme/app_theme.dart';
import '../../core/providers/providers.dart';
import '../../core/theme/liquid_glass_theme.dart';
import '../../core/widgets/glass_components.dart';

class SettingsScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);
    
    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: Colors.white,
        leading: Builder(
          builder: (context) => IconButton(
            icon: const Icon(Icons.menu),
            onPressed: () => Scaffold.of(context).openDrawer(),
          ),
        ),
        title: Text(
          'Settings',
          style: LiquidGlassTheme.heading4.copyWith(color: Colors.white, fontWeight: FontWeight.w600),
        ),
      ),
      drawer: const AppDrawer(),
      body: Container(
        decoration: BoxDecoration(gradient: LiquidGlassTheme.darkPrimaryGradient),
        child: SafeArea(
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Theme Settings
              GlassCard(
                backgroundColor: Colors.white.withOpacity(0.1),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Appearance',
                        style: LiquidGlassTheme.bodyLarge.copyWith(color: Colors.white, fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 16),
                      ListTile(
                        leading: const Icon(Icons.palette, color: Colors.white70),
                        title: const Text('Theme', style: TextStyle(color: Colors.white)),
                        subtitle: Text(_getThemeModeText(themeMode), style: const TextStyle(color: Colors.white70)),
                        trailing: DropdownButton<ThemeMode>(
                          value: themeMode,
                          dropdownColor: Colors.black87,
                          items: const [
                            DropdownMenuItem(value: ThemeMode.light, child: Text('Light')),
                            DropdownMenuItem(value: ThemeMode.dark, child: Text('Dark')),
                            DropdownMenuItem(value: ThemeMode.system, child: Text('System')),
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
              GlassCard(
                backgroundColor: Colors.white.withOpacity(0.1),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Account', style: LiquidGlassTheme.bodyLarge.copyWith(color: Colors.white, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 16),
                      ListTile(
                        leading: const Icon(Icons.person, color: Colors.white70),
                        title: const Text('Profile', style: TextStyle(color: Colors.white)),
                        subtitle: const Text('Manage your profile information', style: TextStyle(color: Colors.white70)),
                        trailing: const Icon(Icons.arrow_forward_ios, color: Colors.white54),
                        onTap: () => context.push('/profile'),
                      ),
                      ListTile(
                        leading: const Icon(Icons.lock, color: Colors.white70),
                        title: const Text('Change Password', style: TextStyle(color: Colors.white)),
                        subtitle: const Text('Update your password', style: TextStyle(color: Colors.white70)),
                        trailing: const Icon(Icons.arrow_forward_ios, color: Colors.white54),
                        onTap: () => context.push('/change-password'),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              // Notification Settings
              GlassCard(
                backgroundColor: Colors.white.withOpacity(0.1),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Notifications', style: LiquidGlassTheme.bodyLarge.copyWith(color: Colors.white, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 16),
                      SwitchListTile(
                        secondary: const Icon(Icons.notifications, color: Colors.white70),
                        title: const Text('Push Notifications', style: TextStyle(color: Colors.white)),
                        subtitle: const Text('Receive push notifications', style: TextStyle(color: Colors.white70)),
                        value: true,
                        onChanged: (value) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Push notifications ${value ? 'enabled' : 'disabled'}')),
                          );
                        },
                      ),
                      SwitchListTile(
                        secondary: const Icon(Icons.email, color: Colors.white70),
                        title: const Text('Email Notifications', style: TextStyle(color: Colors.white)),
                        subtitle: const Text('Receive email notifications', style: TextStyle(color: Colors.white70)),
                        value: true,
                        onChanged: (value) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Email notifications ${value ? 'enabled' : 'disabled'}')),
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              // About
              GlassCard(
                backgroundColor: Colors.white.withOpacity(0.1),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('About', style: LiquidGlassTheme.bodyLarge.copyWith(color: Colors.white, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 16),
                      ListTile(
                        leading: const Icon(Icons.info, color: Colors.white70),
                        title: const Text('App Version', style: TextStyle(color: Colors.white)),
                        subtitle: const Text('1.0.0', style: TextStyle(color: Colors.white70)),
                      ),
                      ListTile(
                        leading: const Icon(Icons.help, color: Colors.white70),
                        title: const Text('Help & Support', style: TextStyle(color: Colors.white)),
                        subtitle: const Text('Get help and support', style: TextStyle(color: Colors.white70)),
                        trailing: const Icon(Icons.arrow_forward_ios, color: Colors.white54),
                        onTap: () => _showHelpDialog(context),
                      ),
                      ListTile(
                        leading: const Icon(Icons.privacy_tip, color: Colors.white70),
                        title: const Text('Privacy Policy', style: TextStyle(color: Colors.white)),
                        subtitle: const Text('View privacy policy', style: TextStyle(color: Colors.white70)),
                        trailing: const Icon(Icons.arrow_forward_ios, color: Colors.white54),
                        onTap: () => _showPrivacyDialog(context),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 32),
              // Logout Button
              GlassButton(
                onPressed: () => ref.read(authProvider.notifier).logout(),
                child: Text(
                  'Logout',
                  style: LiquidGlassTheme.bodyMedium.copyWith(color: Colors.white, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
        ),
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

  void _showHelpDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Help & Support'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'HR Portal Help & Support',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
              const SizedBox(height: 16),
              const Text('Need help? Here are some common topics:'),
              const SizedBox(height: 12),
              _buildHelpItem('📋', 'Leave Management', 'Apply for leaves, view leave balance, and track leave history.'),
              _buildHelpItem('📄', 'Documents', 'Upload, view, and manage your documents and salary slips.'),
              _buildHelpItem('👥', 'Team & Employees', 'View team members, employee details, and organizational structure.'),
              _buildHelpItem('📅', 'Holidays & Events', 'View upcoming holidays, events, and company announcements.'),
              _buildHelpItem('🏢', 'Off-site Tracker', 'Track your off-site work, training, and client visits.'),
              const SizedBox(height: 16),
              const Text(
                'Contact Support:',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              const Text('Email: support@hrportal.com'),
              const Text('Phone: +1 (555) 123-4567'),
              const Text('Hours: Mon-Fri, 9 AM - 6 PM'),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  Widget _buildHelpItem(String icon, String title, String description) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(icon, style: const TextStyle(fontSize: 16)),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                Text(
                  description,
                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                ),
              ],
            ),
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
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'HR Portal Privacy Policy',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
              const SizedBox(height: 16),
              const Text(
                'Last Updated: January 1, 2024',
                style: TextStyle(fontStyle: FontStyle.italic),
              ),
              const SizedBox(height: 16),
              _buildPrivacySection(
                'Information We Collect',
                'We collect information you provide directly to us, such as when you create an account, update your profile, or use our services.',
              ),
              _buildPrivacySection(
                'How We Use Your Information',
                'We use the information we collect to provide, maintain, and improve our services, process transactions, and communicate with you.',
              ),
              _buildPrivacySection(
                'Information Sharing',
                'We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy.',
              ),
              _buildPrivacySection(
                'Data Security',
                'We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.',
              ),
              _buildPrivacySection(
                'Your Rights',
                'You have the right to access, update, or delete your personal information. Contact us to exercise these rights.',
              ),
              const SizedBox(height: 16),
              const Text(
                'Contact Us:',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              const Text('Email: privacy@hrportal.com'),
              const Text('Address: 123 Privacy St, Data City, DC 12345'),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  Widget _buildPrivacySection(String title, String content) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 4),
          Text(
            content,
            style: const TextStyle(fontSize: 12),
          ),
        ],
      ),
    );
  }
}
