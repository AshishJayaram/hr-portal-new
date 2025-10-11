import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/login_screen.dart';
import '../../features/dashboard/dashboard_screen.dart';
import '../../features/profile/profile_screen.dart';
import '../../features/profile/edit_profile_screen.dart';
import '../../features/off_site/off_site_screen.dart';
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
import '../../features/holidays/holidays_only_screen.dart';
import '../../features/holidays/add_holiday_screen.dart';
import '../../features/leaves/leaves_only_screen.dart';
import '../../features/god/god_dashboard_screen.dart';
import '../../features/admin/user_management_screen.dart';
import '../../features/admin/organization_management_screen.dart';
import '../../features/audit_logs/audit_logs_screen.dart';
import '../../features/ai_friendly/ai_friendly_page.dart';
import '../../features/reimbursements/reimbursements_screen.dart';
import '../../features/feedback/feedback_screen.dart';
import '../../features/employees/employee_documentation_screen.dart';
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
      path: '/',
      redirect: (context, state) => '/dashboard',
    ),
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
      path: '/profile/edit',
      builder: (context, state) => EditProfileScreen(),
    ),
    GoRoute(
      path: '/off-site',
      builder: (context, state) => OffSiteScreen(),
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
        returnRoute: state.uri.queryParameters['returnRoute'],
      ),
    ),
    GoRoute(
      path: '/leaves',
      builder: (context, state) => LeavesOnlyScreen(),
    ),
    GoRoute(
      path: '/leaves-old',
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
          builder: (context, state) => HolidaysOnlyScreen(),
        ),
        GoRoute(
          path: '/holidays-old',
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
        GoRoute(
          path: '/ai-friendly',
          builder: (context, state) => AIFriendlyPage(),
        ),
        GoRoute(
          path: '/reimbursements',
          builder: (context, state) => ReimbursementsScreen(),
        ),
        GoRoute(
          path: '/feedback',
          builder: (context, state) => FeedbackScreen(),
        ),
        GoRoute(
          path: '/employees/documentation/:userId',
          builder: (context, state) {
            final userId = state.pathParameters['userId']!;
            final userName = state.uri.queryParameters['name'] ?? 'Employee';
            return EmployeeDocumentationScreen(
              userId: userId,
              userName: userName,
            );
          },
        ),
  ],
);
