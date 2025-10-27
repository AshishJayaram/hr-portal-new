import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../shared/widgets/app_drawer.dart';
import '../../core/theme/app_theme.dart';
import '../../core/providers/providers.dart';
import '../../core/theme/liquid_glass_theme.dart';
import '../../core/widgets/glass_components.dart';

class ProfileScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    
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
        title: Text('Profile', style: LiquidGlassTheme.heading4.copyWith(color: Colors.white, fontWeight: FontWeight.w600)),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit),
            onPressed: () => context.go('/profile/edit'),
          ),
        ],
      ),
      drawer: const AppDrawer(),
      body: Container(
        decoration: BoxDecoration(gradient: LiquidGlassTheme.darkPrimaryGradient),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Profile Header
                GlassCard(
                  backgroundColor: Colors.white.withOpacity(0.12),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 40,
                          backgroundColor: Colors.white.withOpacity(0.2),
                          child: Text(
                            user?.name.isNotEmpty == true ? user!.name[0].toUpperCase() : 'U',
                            style: LiquidGlassTheme.heading2.copyWith(color: Colors.white, fontWeight: FontWeight.w700),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                user?.name ?? 'User Name',
                                style: LiquidGlassTheme.bodyLarge.copyWith(color: Colors.white, fontWeight: FontWeight.w700),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                user?.designation ?? 'Designation',
                                style: LiquidGlassTheme.bodyMedium.copyWith(color: Colors.white70),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                user?.department ?? 'Department',
                                style: LiquidGlassTheme.bodySmall.copyWith(color: Colors.white70),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                // Profile Details
                Text('Personal Information', style: LiquidGlassTheme.bodyLarge.copyWith(color: Colors.white, fontWeight: FontWeight.w700)),
                const SizedBox(height: 16),
                _buildInfoCard(context, 'Email', user?.email ?? 'user@example.com', Icons.email),
                _buildInfoCard(context, 'Employee ID', user?.id ?? 'EMP001', Icons.badge),
                _buildInfoCard(context, 'Role', user?.role ?? 'Employee', Icons.person),
                _buildInfoCard(context, 'CTC', '₹${user?.ctc?.toString() ?? '0'}', Icons.attach_money),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildInfoCard(BuildContext context, String label, String value, IconData icon) {
    return GlassCard(
      backgroundColor: Colors.white.withOpacity(0.1),
      child: ListTile(
        leading: Icon(icon, color: Colors.white70),
        title: Text(label, style: const TextStyle(color: Colors.white)),
        subtitle: Text(value, style: const TextStyle(color: Colors.white70)),
      ),
    );
  }
}
