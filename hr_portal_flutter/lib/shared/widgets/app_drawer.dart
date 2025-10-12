import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../core/providers/providers.dart';

class AppDrawer extends ConsumerWidget {
  const AppDrawer({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    final currentRoute = GoRouterState.of(context).uri.path;

    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          DrawerHeader(
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.primary,
              gradient: LinearGradient(
                colors: [AppTheme.primaryColor, AppTheme.accentColor],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: Row(
              children: [
                Container(
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.2),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: CircleAvatar(
                    radius: 32,
                    backgroundColor: Colors.white,
                    child: Text(
                      user?.name.isNotEmpty == true
                          ? user!.name[0].toUpperCase()
                          : 'U',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.primaryColor,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user?.name ?? 'User',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: _getRoleColor(user?.role ?? '').withOpacity(0.2),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: _getRoleColor(user?.role ?? ''),
                            width: 1,
                          ),
                        ),
                        child: Text(
                          user?.role ?? 'Role',
                          style: TextStyle(
                            color: _getRoleColor(user?.role ?? ''),
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        user?.department ?? 'Department',
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 14,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          // For God users, only show God Dashboard
          if (user?.role == 'God') ...[
            _buildDrawerItem(
              context,
              Icons.admin_panel_settings,
              'God Dashboard',
              '/god-dashboard',
              currentRoute,
            ),
          ] else ...[
            // For all other users, show regular menu items
            _buildDrawerItem(
              context,
              Icons.dashboard,
              'Dashboard',
              '/dashboard',
              currentRoute,
            ),
            _buildDrawerItem(
              context,
              Icons.group,
              'Team',
              '/team',
              currentRoute,
            ),
            // Show Employees for HR, Admin, and God
            if (_canAccessEmployees(user?.role))
              _buildDrawerItem(
                context,
                Icons.people,
                'Employees',
                '/employees',
                currentRoute,
              ),
            // Separate entries for My Leaves and Upcoming Holidays
            _buildDrawerItem(
              context,
              Icons.beach_access,
              'My Leaves',
              '/leaves',
              currentRoute,
            ),
            _buildDrawerItem(
              context,
              Icons.event_available,
              'Upcoming Holidays',
              '/holidays',
              currentRoute,
            ),
            _buildDrawerItem(
              context,
              Icons.folder,
              'Documents',
              '/documents',
              currentRoute,
            ),
            _buildDrawerItem(
              context,
              Icons.receipt,
              'Salary Slips',
              '/salary-slips',
              currentRoute,
            ),
            _buildDrawerItem(
              context,
              Icons.business_center,
              'Off-site Tracker',
              '/off-site',
              currentRoute,
            ),
            _buildDrawerItem(
              context,
              Icons.credit_card,
              'Reimbursements',
              '/reimbursements',
              currentRoute,
            ),
            _buildDrawerItem(
              context,
              Icons.person,
              'Profile',
              '/profile',
              currentRoute,
            ),
            _buildDrawerItem(
              context,
              Icons.feedback,
              'Feedback',
              '/feedback',
              currentRoute,
            ),
            // Show Audit Logs only for Admin, HR, and God
            if (user?.role == 'Admin' || user?.role == 'HR' || user?.role == 'God')
              _buildDrawerItem(
                context,
                Icons.history,
                'Audit Logs',
                '/audit-logs',
                currentRoute,
              ),
            _buildDrawerItem(
              context,
              Icons.settings,
              'Settings',
              '/settings',
              currentRoute,
            ),
            _buildDrawerItem(
              context,
              Icons.smart_toy,
              'AI-Friendly',
              '/ai-friendly',
              currentRoute,
            ),
          ],
          const Divider(),
          _buildDrawerItem(
            context,
            Icons.logout,
            'Logout',
            '/login', // Navigate to login on logout
            currentRoute,
            onTap: () {
              ref.read(authProvider.notifier).logout();
              context.go('/login');
            },
          ),
        ],
      ),
    );
  }

  Widget _buildLeavesAndHolidaysSection(BuildContext context, String currentRoute, WidgetRef ref) {
    final isSelected = currentRoute == '/leaves' || currentRoute == '/holidays';
    
    return ExpansionTile(
      leading: Icon(
        Icons.event,
        color: isSelected ? AppTheme.primaryColor : Theme.of(context).colorScheme.onSurface,
      ),
      title: Text(
        'Leaves & Holidays',
        style: TextStyle(
          color: isSelected ? AppTheme.primaryColor : Theme.of(context).colorScheme.onSurface,
          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
        ),
      ),
      children: [
        // Leave balance summary
        FutureBuilder<List<Map<String, dynamic>>>(
          future: _loadLeaveBalance(ref),
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: const Center(
                  child: SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                ),
              );
            }
            
            final leaveBalances = snapshot.data ?? [];
            
            return Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Leave Balance',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.secondaryColor,
                    ),
                  ),
                  const SizedBox(height: 8),
                  if (leaveBalances.isEmpty)
                    Text(
                      'No leave allocations',
                      style: TextStyle(
                        fontSize: 11,
                        color: AppTheme.secondaryColor,
                      ),
                    )
                  else
                    ...leaveBalances.map((balance) {
                      final categoryName = balance['category_name'] ?? 'Unknown';
                      final totalDays = balance['total_days'] ?? 0;
                      final usedDays = balance['used_days'] ?? 0;
                      final remaining = totalDays - usedDays;
                      
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 4),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              categoryName,
                              style: const TextStyle(fontSize: 11),
                            ),
                            Text(
                              '$remaining/$totalDays',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: remaining > 0 ? AppTheme.successColor : AppTheme.errorColor,
                              ),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                ],
              ),
            );
          },
        ),
        // Quick action buttons
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Column(
            children: [
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.pop(context);
                        context.go('/leaves');
                      },
                      icon: const Icon(Icons.add, size: 16),
                      label: const Text('Apply Leave', style: TextStyle(fontSize: 12)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primaryColor,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 8),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        Navigator.pop(context);
                        context.go('/leaves');
                      },
                      icon: const Icon(Icons.history, size: 16),
                      label: const Text('History', style: TextStyle(fontSize: 12)),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppTheme.primaryColor,
                        side: BorderSide(color: AppTheme.primaryColor),
                        padding: const EdgeInsets.symmetric(vertical: 8),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () {
                    Navigator.pop(context);
                    context.go('/holidays');
                  },
                  icon: const Icon(Icons.calendar_today, size: 16),
                  label: const Text('View Holidays', style: TextStyle(fontSize: 12)),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppTheme.accentColor,
                    side: BorderSide(color: AppTheme.accentColor),
                    padding: const EdgeInsets.symmetric(vertical: 8),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildDrawerItem(
    BuildContext context,
    IconData icon,
    String title,
    String route,
    String currentRoute, {
    VoidCallback? onTap,
  }) {
    final isSelected = currentRoute == route;
    return ListTile(
      leading: Icon(
        icon,
        color: isSelected ? AppTheme.primaryColor : Theme.of(context).colorScheme.onSurface,
      ),
      title: Text(
        title,
        style: TextStyle(
          color: isSelected ? AppTheme.primaryColor : Theme.of(context).colorScheme.onSurface,
          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
        ),
      ),
      onTap: onTap ??
          () {
            Navigator.pop(context); // Close the drawer
            context.go(route);
          },
    );
  }

  bool _canAccessEmployees(String? role) {
    return role == 'HR' || role == 'Admin' || role == 'God';
  }

  Color _getRoleColor(String role) {
    switch (role.toLowerCase()) {
      case 'god':
        return Colors.purple;
      case 'admin':
      case 'hr':
        return AppTheme.primaryColor;
      case 'manager':
        return AppTheme.successColor;
      case 'employee':
        return AppTheme.secondaryColor;
      default:
        return AppTheme.secondaryColor;
    }
  }

  Future<List<Map<String, dynamic>>> _loadLeaveBalance(WidgetRef ref) async {
    try {
      final apiService = ref.read(apiServiceProvider);
      final currentUser = await apiService.getCurrentUser();
      
      if (currentUser != null && currentUser['id'] != null) {
        return await apiService.getLeaveBalance(currentUser['id'].toString());
      }
      return [];
    } catch (e) {
      return [];
    }
  }
}
