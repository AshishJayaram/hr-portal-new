import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/login_screen.dart';
import '../../features/dashboard/dashboard_screen.dart';
import '../../features/profile/profile_screen.dart';
import '../../features/team/team_screen.dart';
import '../../features/employees/employees_screen.dart';
import '../../features/employees/add_employee_screen.dart';
import '../../features/employees/edit_employee_screen.dart';
import '../../features/leaves/leaves_screen.dart';
import '../../features/documents/documents_screen.dart';
import '../../features/salary_slips/salary_slips_screen.dart';
import '../../features/settings/settings_screen.dart';
import '../../features/settings/change_password_screen.dart';
import '../../features/holidays/holidays_screen.dart';
import '../../features/holidays/add_holiday_screen.dart';
import '../../features/god/god_dashboard_screen.dart';
import '../../features/admin/user_management_screen.dart';
import '../../features/admin/organization_management_screen.dart';
import '../../features/audit_logs/audit_logs_screen.dart';
import '../providers/providers.dart';

final appRouter = GoRouter(
  initialLocation: '/login',
  redirect: (context, state) {
    // Redirect God users to God Dashboard when they try to access regular dashboard
    if (state.uri.path == '/dashboard') {
      final container = ProviderScope.containerOf(context);
      final authState = container.read(authProvider);
      if (authState.user?.role == 'God') {
        return '/god-dashboard';
      }
    }
    return null;
  },
  routes: [
    GoRoute(
      path: '/login',
      builder: (context, state) => LoginScreen(),
    ),
    GoRoute(
      path: '/dashboard',
      builder: (context, state) => DashboardScreen(),
    ),
    GoRoute(
      path: '/profile',
      builder: (context, state) => ProfileScreen(),
    ),
    GoRoute(
      path: '/team',
      builder: (context, state) => TeamScreen(),
    ),
    GoRoute(
      path: '/employees',
      builder: (context, state) => EmployeesScreen(),
    ),
    GoRoute(
      path: '/employees/add',
      builder: (context, state) => AddEmployeeScreen(),
    ),
    GoRoute(
      path: '/employees/edit/:id',
      builder: (context, state) => EditEmployeeScreen(
        employeeId: state.pathParameters['id']!,
      ),
    ),
    GoRoute(
      path: '/leaves',
      builder: (context, state) => LeavesScreen(),
    ),
    GoRoute(
      path: '/documents',
      builder: (context, state) => DocumentsScreen(),
    ),
    GoRoute(
      path: '/salary-slips',
      builder: (context, state) => SalarySlipsScreen(),
    ),
    GoRoute(
      path: '/settings',
      builder: (context, state) => SettingsScreen(),
    ),
    GoRoute(
      path: '/change-password',
      builder: (context, state) => ChangePasswordScreen(),
    ),
        GoRoute(
          path: '/holidays',
          builder: (context, state) => HolidaysScreen(),
        ),
        GoRoute(
          path: '/holidays/add',
          builder: (context, state) => AddHolidayScreen(),
        ),
        GoRoute(
          path: '/god-dashboard',
          builder: (context, state) => GodDashboardScreen(),
        ),
        GoRoute(
          path: '/admin/users',
          builder: (context, state) => UserManagementScreen(),
        ),
        GoRoute(
          path: '/admin/organizations',
          builder: (context, state) => OrganizationManagementScreen(),
        ),
        GoRoute(
          path: '/audit-logs',
          builder: (context, state) => AuditLogsScreen(),
        ),
  ],
);
