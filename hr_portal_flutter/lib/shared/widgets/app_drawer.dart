import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'dart:ui';

import '../../core/theme/app_theme.dart';
import '../../core/theme/liquid_glass_theme.dart';
import '../../core/widgets/glass_components.dart';
import '../../core/providers/providers.dart';

class AppDrawer extends ConsumerWidget {
  const AppDrawer({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    final currentRoute = GoRouterState.of(context).uri.path;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Drawer(
      backgroundColor: Colors.transparent,
      child: Container(
        decoration: BoxDecoration(
          gradient: isDark 
              ? LiquidGlassTheme.darkPrimaryGradient 
              : LiquidGlassTheme.primaryGradient,
        ),
        child: ClipRRect(
          child: BackdropFilter(
            filter: ImageFilter.blur(
              sigmaX: LiquidGlassTheme.glassBlur,
              sigmaY: LiquidGlassTheme.glassBlur,
            ),
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.1),
                border: Border(
                  right: BorderSide(
                    color: Colors.white.withOpacity(0.2),
                    width: 1,
                  ),
                ),
              ),
              child: ListView(
                padding: EdgeInsets.zero,
                children: [
                  // Header Section
                  _buildHeader(context, user, isDark)
                      .animate()
                      .fadeIn(duration: 600.ms, delay: 100.ms)
                      .slideX(begin: -0.2, end: 0),
                  
                  const SizedBox(height: LiquidGlassTheme.spacingL),
                  
                  // Navigation Items
                  if (user?.role == 'God') ...[
                    _buildDrawerItem(
                      context,
                      Icons.admin_panel_settings_rounded,
                      'God Dashboard',
                      '/god-dashboard',
                      currentRoute,
                      isDark,
                    ).animate()
                        .fadeIn(duration: 400.ms, delay: 200.ms)
                        .slideX(begin: -0.2, end: 0),
                  ] else ...[
                    _buildDrawerItem(
                      context,
                      Icons.dashboard_rounded,
                      'Dashboard',
                      '/dashboard',
                      currentRoute,
                      isDark,
                    ).animate()
                        .fadeIn(duration: 400.ms, delay: 200.ms)
                        .slideX(begin: -0.2, end: 0),
                    
                    _buildDrawerItem(
                      context,
                      Icons.group_rounded,
                      'Team',
                      '/team',
                      currentRoute,
                      isDark,
                    ).animate()
                        .fadeIn(duration: 400.ms, delay: 250.ms)
                        .slideX(begin: -0.2, end: 0),
                    
                    if (_canAccessEmployees(user?.role))
                      _buildDrawerItem(
                        context,
                        Icons.people_rounded,
                        'Employees',
                        '/employees',
                        currentRoute,
                        isDark,
                      ).animate()
                          .fadeIn(duration: 400.ms, delay: 300.ms)
                          .slideX(begin: -0.2, end: 0),
                    
                    _buildDrawerItem(
                      context,
                      Icons.beach_access_rounded,
                      'My Leaves',
                      '/leaves',
                      currentRoute,
                      isDark,
                    ).animate()
                        .fadeIn(duration: 400.ms, delay: 350.ms)
                        .slideX(begin: -0.2, end: 0),
                    
                    _buildDrawerItem(
                      context,
                      Icons.event_available_rounded,
                      'Upcoming Holidays',
                      '/holidays',
                      currentRoute,
                      isDark,
                    ).animate()
                        .fadeIn(duration: 400.ms, delay: 400.ms)
                        .slideX(begin: -0.2, end: 0),
                    
                    _buildDrawerItem(
                      context,
                      Icons.folder_rounded,
                      'Documents',
                      '/documents',
                      currentRoute,
                      isDark,
                    ).animate()
                        .fadeIn(duration: 400.ms, delay: 450.ms)
                        .slideX(begin: -0.2, end: 0),
                    
                    _buildDrawerItem(
                      context,
                      Icons.receipt_rounded,
                      'Salary Slips',
                      '/salary-slips',
                      currentRoute,
                      isDark,
                    ).animate()
                        .fadeIn(duration: 400.ms, delay: 500.ms)
                        .slideX(begin: -0.2, end: 0),
                    
                    _buildDrawerItem(
                      context,
                      Icons.business_center_rounded,
                      'Off-site Tracker',
                      '/off-site',
                      currentRoute,
                      isDark,
                    ).animate()
                        .fadeIn(duration: 400.ms, delay: 550.ms)
                        .slideX(begin: -0.2, end: 0),
                    
                    _buildDrawerItem(
                      context,
                      Icons.credit_card_rounded,
                      'Reimbursements',
                      '/reimbursements',
                      currentRoute,
                      isDark,
                    ).animate()
                        .fadeIn(duration: 400.ms, delay: 600.ms)
                        .slideX(begin: -0.2, end: 0),
                    
                    _buildDrawerItem(
                      context,
                      Icons.person_rounded,
                      'Profile',
                      '/profile',
                      currentRoute,
                      isDark,
                    ).animate()
                        .fadeIn(duration: 400.ms, delay: 650.ms)
                        .slideX(begin: -0.2, end: 0),
                    
                    _buildDrawerItem(
                      context,
                      Icons.feedback_rounded,
                      'Feedback',
                      '/feedback',
                      currentRoute,
                      isDark,
                    ).animate()
                        .fadeIn(duration: 400.ms, delay: 700.ms)
                        .slideX(begin: -0.2, end: 0),
                    
                    if (user?.role == 'Admin' || user?.role == 'HR' || user?.role == 'God')
                      _buildDrawerItem(
                        context,
                        Icons.history_rounded,
                        'Audit Logs',
                        '/audit-logs',
                        currentRoute,
                        isDark,
                      ).animate()
                          .fadeIn(duration: 400.ms, delay: 750.ms)
                          .slideX(begin: -0.2, end: 0),
                    
                    _buildDrawerItem(
                      context,
                      Icons.settings_rounded,
                      'Settings',
                      '/settings',
                      currentRoute,
                      isDark,
                    ).animate()
                        .fadeIn(duration: 400.ms, delay: 800.ms)
                        .slideX(begin: -0.2, end: 0),
                    
                    _buildDrawerItem(
                      context,
                      Icons.smart_toy_rounded,
                      'AI-Friendly',
                      '/ai-friendly',
                      currentRoute,
                      isDark,
                    ).animate()
                        .fadeIn(duration: 400.ms, delay: 850.ms)
                        .slideX(begin: -0.2, end: 0),
                  ],
                  
                  const SizedBox(height: LiquidGlassTheme.spacingXL),
                  
                  // Logout Section
                  _buildLogoutSection(context, ref, isDark)
                      .animate()
                      .fadeIn(duration: 400.ms, delay: 900.ms)
                      .slideX(begin: -0.2, end: 0),
                  
                  const SizedBox(height: LiquidGlassTheme.spacingXL),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context, user, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(LiquidGlassTheme.spacingL),
      child: Column(
        children: [
          // Profile Avatar
          Container(
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.2),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: CircleAvatar(
              radius: 40,
              backgroundColor: Colors.white.withOpacity(0.2),
              child: Text(
                user?.name.isNotEmpty == true
                    ? user!.name[0].toUpperCase()
                    : 'U',
                style: LiquidGlassTheme.heading2.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
          
          const SizedBox(height: LiquidGlassTheme.spacingM),
          
          // User Info
          Text(
            user?.name ?? 'User',
            style: LiquidGlassTheme.heading4.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w600,
            ),
            textAlign: TextAlign.center,
            overflow: TextOverflow.ellipsis,
          ),
          
          const SizedBox(height: LiquidGlassTheme.spacingS),
          
          // Role Badge
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: LiquidGlassTheme.spacingM,
              vertical: LiquidGlassTheme.spacingS,
            ),
            decoration: BoxDecoration(
              color: _getRoleColor(user?.role ?? '').withOpacity(0.2),
              borderRadius: BorderRadius.circular(LiquidGlassTheme.radiusLarge),
              border: Border.all(
                color: _getRoleColor(user?.role ?? '').withOpacity(0.3),
                width: 1,
              ),
            ),
            child: Text(
              user?.role ?? 'Role',
              style: LiquidGlassTheme.bodySmall.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          
          const SizedBox(height: LiquidGlassTheme.spacingS),
          
          // Department
          Text(
            user?.department ?? 'Department',
            style: LiquidGlassTheme.bodyMedium.copyWith(
              color: Colors.white70,
            ),
            textAlign: TextAlign.center,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildDrawerItem(
    BuildContext context,
    IconData icon,
    String title,
    String route,
    String currentRoute,
    bool isDark, {
    VoidCallback? onTap,
  }) {
    final isSelected = currentRoute == route;
    
    return Container(
      margin: const EdgeInsets.symmetric(
        horizontal: LiquidGlassTheme.spacingM,
        vertical: LiquidGlassTheme.spacingXS,
      ),
      child: GlassCard(
        backgroundColor: isSelected 
            ? Colors.white.withOpacity(0.2)
            : Colors.white.withOpacity(0.1),
        borderRadius: LiquidGlassTheme.radiusMedium,
        padding: const EdgeInsets.symmetric(
          horizontal: LiquidGlassTheme.spacingM,
          vertical: LiquidGlassTheme.spacingS,
        ),
        onTap: onTap ?? () {
          Navigator.pop(context);
          context.go(route);
        },
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(LiquidGlassTheme.spacingS),
              decoration: BoxDecoration(
                color: isSelected 
                    ? LiquidGlassTheme.primaryPurple.withOpacity(0.3)
                    : Colors.white.withOpacity(0.2),
                borderRadius: BorderRadius.circular(LiquidGlassTheme.radiusSmall),
              ),
              child: Icon(
                icon,
                color: isSelected ? Colors.white : Colors.white70,
                size: 20,
              ),
            ),
            const SizedBox(width: LiquidGlassTheme.spacingM),
            Expanded(
              child: Text(
                title,
                style: LiquidGlassTheme.bodyMedium.copyWith(
                  color: isSelected ? Colors.white : Colors.white70,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                ),
              ),
            ),
            if (isSelected)
              Container(
                width: 6,
                height: 6,
                decoration: BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildLogoutSection(BuildContext context, WidgetRef ref, bool isDark) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: LiquidGlassTheme.spacingM),
      child: GlassCard(
        backgroundColor: LiquidGlassTheme.accentRed.withOpacity(0.2),
        borderRadius: LiquidGlassTheme.radiusMedium,
        padding: const EdgeInsets.symmetric(
          horizontal: LiquidGlassTheme.spacingM,
          vertical: LiquidGlassTheme.spacingS,
        ),
        onTap: () {
          ref.read(authProvider.notifier).logout();
          context.go('/login');
        },
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(LiquidGlassTheme.spacingS),
              decoration: BoxDecoration(
                color: LiquidGlassTheme.accentRed.withOpacity(0.3),
                borderRadius: BorderRadius.circular(LiquidGlassTheme.radiusSmall),
              ),
              child: const Icon(
                Icons.logout_rounded,
                color: Colors.white,
                size: 20,
              ),
            ),
            const SizedBox(width: LiquidGlassTheme.spacingM),
            Expanded(
              child: Text(
                'Logout',
                style: LiquidGlassTheme.bodyMedium.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  bool _canAccessEmployees(String? role) {
    return role == 'HR' || role == 'Admin' || role == 'God';
  }

  Color _getRoleColor(String role) {
    switch (role.toLowerCase()) {
      case 'god':
        return LiquidGlassTheme.primaryPurpleLight;
      case 'admin':
      case 'hr':
        return LiquidGlassTheme.primaryPurple;
      case 'manager':
        return LiquidGlassTheme.accentGreen;
      case 'employee':
        return LiquidGlassTheme.secondaryOrange;
      default:
        return LiquidGlassTheme.secondaryOrange;
    }
  }
}