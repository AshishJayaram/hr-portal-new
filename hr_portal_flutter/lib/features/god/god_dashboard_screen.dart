import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../shared/widgets/app_drawer.dart';
import '../../core/theme/app_theme.dart';
import '../../core/providers/providers.dart';

class GodDashboardScreen extends ConsumerStatefulWidget {
  @override
  ConsumerState<GodDashboardScreen> createState() => _GodDashboardScreenState();
}

class _GodDashboardScreenState extends ConsumerState<GodDashboardScreen> {
  bool _isLoading = true;
  Map<String, dynamic>? _platformStats;

  @override
  void initState() {
    super.initState();
    _loadPlatformData();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('👑 God Dashboard'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadPlatformData,
          ),
        ],
      ),
      drawer: const AppDrawer(),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header Section
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [AppTheme.primaryColor, AppTheme.secondaryColor],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Platform Overview',
                          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Manage organizations and monitor platform statistics',
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: Colors.white70,
                          ),
                        ),
                      ],
                    ),
                  ),
                  
                  const SizedBox(height: 24),
                  
                  // Main Platform Stats Grid
                  GridView.count(
                    crossAxisCount: 2,
                    crossAxisSpacing: 16,
                    mainAxisSpacing: 16,
                    childAspectRatio: 1.1,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    children: [
                      _buildStatCard(
                        context,
                        'Total Organizations',
                        _platformStats?['total_organizations']?.toString() ?? '0',
                        Icons.business,
                        Colors.blue,
                        subtitle: 'Click to manage',
                        onTap: () => context.go('/admin/organizations'),
                      ),
                      _buildStatCard(
                        context,
                        'Active Organizations',
                        _platformStats?['active_organizations']?.toString() ?? '0',
                        Icons.business_center,
                        Colors.green,
                        subtitle: 'Currently active',
                        onTap: () => context.go('/admin/organizations'),
                      ),
                      _buildStatCard(
                        context,
                        'Total Users',
                        _platformStats?['total_users']?.toString() ?? '0',
                        Icons.people,
                        Colors.purple,
                        subtitle: 'Across all orgs',
                        onTap: () => context.go('/admin/users'),
                      ),
                      _buildStatCard(
                        context,
                        'Inactive Organizations',
                        _getInactiveOrgsCount(),
                        Icons.warning,
                        Colors.orange,
                        subtitle: 'Need attention',
                        onTap: () => context.go('/admin/organizations'),
                      ),
                    ],
                  ),
                  
                  const SizedBox(height: 24),
                  
                  // Additional Platform Insights
                  Text(
                    'Platform Insights',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  
                  GridView.count(
                    crossAxisCount: 1,
                    crossAxisSpacing: 16,
                    mainAxisSpacing: 16,
                    childAspectRatio: 3.5,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    children: [
                      _buildInsightCard(
                        context,
                        'Average Users per Org',
                        _getAverageUsersPerOrg(),
                        Icons.analytics,
                        Colors.indigo,
                        subtitle: 'Platform efficiency',
                      ),
                      _buildInsightCard(
                        context,
                        'Platform Health',
                        '${_getPlatformHealth()}%',
                        Icons.health_and_safety,
                        Colors.teal,
                        subtitle: 'Active rate',
                      ),
                      _buildInsightCard(
                        context,
                        'Platform Growth',
                        _getPlatformGrowth(),
                        Icons.trending_up,
                        Colors.amber,
                        subtitle: 'User adoption',
                      ),
                    ],
                  ),
                  
                  const SizedBox(height: 32),
                  
                  // System Information
                  Text(
                    'System Information',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        children: [
                          _buildInfoItem(
                            'Platform Version',
                            '1.0.0',
                            Icons.info,
                            AppTheme.primaryColor,
                          ),
                          _buildInfoItem(
                            'Database Status',
                            'Connected',
                            Icons.storage,
                            AppTheme.successColor,
                          ),
                          _buildInfoItem(
                            'API Status',
                            'Operational',
                            Icons.api,
                            AppTheme.accentColor,
                          ),
                          _buildInfoItem(
                            'Last Updated',
                            DateTime.now().toString().split('.')[0],
                            Icons.schedule,
                            AppTheme.secondaryColor,
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildStatCard(
    BuildContext context,
    String title,
    String value,
    IconData icon,
    Color color, {
    String? subtitle,
    VoidCallback? onTap,
  }) {
    return Card(
      elevation: 4,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(8),
            gradient: LinearGradient(
              colors: [
                color.withOpacity(0.1),
                color.withOpacity(0.05),
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  icon,
                  size: 32,
                  color: color,
                ),
                const SizedBox(height: 8),
                Text(
                  value,
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    color: color,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  title,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                  textAlign: TextAlign.center,
                ),
                if (subtitle != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: color.withOpacity(0.7),
                      fontSize: 10,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildInsightCard(
    BuildContext context,
    String title,
    String value,
    IconData icon,
    Color color, {
    String? subtitle,
  }) {
    return Card(
      elevation: 2,
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(8),
          gradient: LinearGradient(
            colors: [
              color.withOpacity(0.1),
              color.withOpacity(0.05),
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  color: color.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(25),
                ),
                child: Icon(
                  icon,
                  color: color,
                  size: 24,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      title,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      value,
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        color: color,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    if (subtitle != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        subtitle,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: color.withOpacity(0.7),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoItem(
    String label,
    String value,
    IconData icon,
    Color color,
  ) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Icon(
              icon,
              color: color,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  value,
                  style: TextStyle(
                    color: AppTheme.secondaryColor,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _getInactiveOrgsCount() {
    if (_platformStats == null) return '0';
    final total = _platformStats!['total_organizations'] ?? 0;
    final active = _platformStats!['active_organizations'] ?? 0;
    return (total - active).toString();
  }

  String _getAverageUsersPerOrg() {
    if (_platformStats == null) return '0';
    final totalOrgs = _platformStats!['total_organizations'] ?? 0;
    final totalUsers = _platformStats!['total_users'] ?? 0;
    if (totalOrgs == 0) return '0';
    return (totalUsers / totalOrgs).round().toString();
  }

  int _getPlatformHealth() {
    if (_platformStats == null) return 0;
    final total = _platformStats!['total_organizations'] ?? 0;
    final active = _platformStats!['active_organizations'] ?? 0;
    if (total == 0) return 0;
    return ((active / total) * 100).round();
  }

  String _getPlatformGrowth() {
    if (_platformStats == null) return 'New';
    final totalUsers = _platformStats!['total_users'] ?? 0;
    return totalUsers > 0 ? 'Growing' : 'New';
  }

  Future<void> _loadPlatformData() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final apiService = ref.read(apiServiceProvider);
      final stats = await apiService.getPlatformStats();
      
      setState(() {
        _platformStats = stats;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to load platform data: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }
}
