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
        title: const Text('God Dashboard'),
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
                  Text(
                    'Platform Overview',
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 24),
                  
                  // Platform Stats Grid
                  GridView.count(
                    crossAxisCount: 2,
                    crossAxisSpacing: 16,
                    mainAxisSpacing: 16,
                    childAspectRatio: 1.2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    children: [
                      _buildStatCard(
                        context,
                        'Total Organizations',
                        _platformStats?['total_organizations']?.toString() ?? '0',
                        Icons.business,
                        AppTheme.primaryColor,
                        onTap: () => context.go('/admin/organizations'),
                      ),
                      _buildStatCard(
                        context,
                        'Active Organizations',
                        _platformStats?['active_organizations']?.toString() ?? '0',
                        Icons.business_center,
                        AppTheme.successColor,
                        onTap: () => context.go('/admin/organizations'),
                      ),
                      _buildStatCard(
                        context,
                        'Total Users',
                        _platformStats?['total_users']?.toString() ?? '0',
                        Icons.people,
                        AppTheme.secondaryColor,
                        onTap: () => context.go('/admin/users'),
                      ),
                      _buildStatCard(
                        context,
                        'System Status',
                        'Online',
                        Icons.health_and_safety,
                        AppTheme.accentColor,
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
    VoidCallback? onTap,
  }) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
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
                style: Theme.of(context).textTheme.bodySmall,
                textAlign: TextAlign.center,
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
