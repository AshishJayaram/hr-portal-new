import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../shared/widgets/app_drawer.dart';
import '../../core/theme/app_theme.dart';
import '../../core/providers/providers.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  final List<Map<String, dynamic>> _upcomingHolidays = [];
  final List<Map<String, dynamic>> _upcomingEvents = [];
  final List<Map<String, dynamic>> _leaveTypes = [];
  
  // Dashboard stats
  Map<String, dynamic>? _dashboardStats;
  bool _isLoadingStats = false;

  @override
  void initState() {
    super.initState();
    _loadDashboardData();
  }

  Future<void> _loadDashboardData() async {
    final user = ref.read(authProvider).user;
    final canViewStats = user?.role == 'HR' || user?.role == 'Admin' || user?.role == 'God';
    
    if (canViewStats) {
      await _loadDashboardStats();
    }
    
    // Load other data in parallel
    await Future.wait([
      _loadHolidays(),
      _loadEvents(),
      _loadLeaveTypes(),
    ]);
  }

  Future<void> _loadHolidays() async {
    try {
      final apiService = ref.read(apiServiceProvider);
      final holidays = await apiService.getHolidays();
      
      setState(() {
        _upcomingHolidays.clear();
        _upcomingHolidays.addAll(holidays);
      });
    } catch (e) {
      print('Failed to load holidays: $e');
    }
  }

  Future<void> _loadEvents() async {
    try {
      // TODO: Implement events API call when backend endpoint is available
      // For now, keep empty list
      setState(() {
        _upcomingEvents.clear();
      });
    } catch (e) {
      print('Failed to load events: $e');
    }
  }

  Future<void> _loadLeaveTypes() async {
    try {
      // TODO: Implement leave types API call when backend endpoint is available
      // For now, keep empty list
      setState(() {
        _leaveTypes.clear();
      });
    } catch (e) {
      print('Failed to load leave types: $e');
    }
  }

  Future<void> _loadDashboardStats() async {
    setState(() {
      _isLoadingStats = true;
    });

    try {
      final apiService = ref.read(apiServiceProvider);
      final stats = await apiService.getDashboardStats();
      
      setState(() {
        _dashboardStats = stats;
        _isLoadingStats = false;
      });
    } catch (e) {
      setState(() {
        _isLoadingStats = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to load dashboard stats: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).user;
    final canViewStats = user?.role == 'HR' || user?.role == 'Admin' || user?.role == 'God';
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadDashboardData,
          ),
        ],
      ),
      drawer: const AppDrawer(),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Welcome to HR Portal',
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 24),
            
            // Upcoming Events (First)
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Upcoming Events',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                TextButton(
                  onPressed: () {
                    // TODO: Navigate to events page
                  },
                  child: const Text('View All'),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _upcomingEvents.isEmpty
                ? const Center(
                    child: Padding(
                      padding: EdgeInsets.all(32.0),
                      child: Text(
                        'No upcoming events',
                        style: TextStyle(color: Colors.grey),
                      ),
                    ),
                  )
                : ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: _upcomingEvents.length,
                    itemBuilder: (context, index) {
                      final event = _upcomingEvents[index];
                      return _buildEventCard(context, event);
                    },
                  ),
            
            const SizedBox(height: 32),
            
            // Upcoming Holidays (Second)
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Upcoming Holidays',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                TextButton(
                  onPressed: () {
                    context.go('/holidays');
                  },
                  child: const Text('View All'),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _upcomingHolidays.isEmpty
                ? const Center(
                    child: Padding(
                      padding: EdgeInsets.all(32.0),
                      child: Text(
                        'No upcoming holidays',
                        style: TextStyle(color: Colors.grey),
                      ),
                    ),
                  )
                : SizedBox(
                    height: 120,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      itemCount: _upcomingHolidays.length,
                      itemBuilder: (context, index) {
                        final holiday = _upcomingHolidays[index];
                        return _buildHolidayCard(context, holiday);
                      },
                    ),
                  ),
            
            const SizedBox(height: 32),
            
            // Quick Stats Grid (Only for HR, Admin, God)
            if (canViewStats) ...[
              Text(
                'Quick Stats',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              _isLoadingStats
                  ? const Center(child: CircularProgressIndicator())
                  : _dashboardStats != null
                      ? GridView.count(
                          crossAxisCount: 2,
                          crossAxisSpacing: 16,
                          mainAxisSpacing: 16,
                          childAspectRatio: 1.2,
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          children: [
                            _buildStatCard(
                              context,
                              'Total Employees',
                              _dashboardStats!['total_employees']?.toString() ?? '0',
                              Icons.people,
                              AppTheme.primaryColor,
                              onTap: () => context.go('/employees'),
                            ),
                            _buildStatCard(
                              context,
                              'Pending Leaves',
                              _dashboardStats!['pending_leaves']?.toString() ?? '0',
                              Icons.event_busy,
                              AppTheme.secondaryColor,
                              onTap: () => context.go('/leaves'),
                            ),
                            _buildStatCard(
                              context,
                              'Team Members',
                              _dashboardStats!['team_members']?.toString() ?? '0',
                              Icons.group,
                              AppTheme.accentColor,
                              onTap: () => context.go('/team'),
                            ),
                            _buildStatCard(
                              context,
                              'Documents',
                              _dashboardStats!['total_documents']?.toString() ?? '0',
                              Icons.description,
                              AppTheme.lightPurple,
                              onTap: () => context.go('/documents'),
                            ),
                          ],
                        )
                      : const Center(
                          child: Text(
                            'No stats available',
                            style: TextStyle(color: Colors.grey),
                          ),
                        ),
              const SizedBox(height: 32),
            ],
            
            // Quick Leave Application with Balances (Last)
            Text(
              'Quick Leave Application',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            _leaveTypes.isEmpty
                ? const Center(
                    child: Padding(
                      padding: EdgeInsets.all(32.0),
                      child: Text(
                        'No leave types available',
                        style: TextStyle(color: Colors.grey),
                      ),
                    ),
                  )
                : GridView.count(
                    crossAxisCount: 2,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    childAspectRatio: 1.3,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    children: _leaveTypes.map((leaveType) {
                      return _buildLeaveTypeCard(context, leaveType);
                    }).toList(),
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
          padding: const EdgeInsets.all(12.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                size: 28,
                color: color,
              ),
              const SizedBox(height: 6),
              Text(
                value,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  color: color,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 2),
              Flexible(
                child: Text(
                  title,
                  style: Theme.of(context).textTheme.bodySmall,
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLeaveTypeCard(BuildContext context, Map<String, dynamic> leaveType) {
    final balance = leaveType['balance'] as int;
    final used = leaveType['used'] as int;
    final remaining = balance - used;
    
    return Card(
      child: InkWell(
        onTap: () {
          _showLeaveApplicationDialog(context, leaveType['name']);
        },
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                leaveType['icon'],
                size: 32,
                color: leaveType['color'],
              ),
              const SizedBox(height: 8),
              Text(
                leaveType['name'],
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 4),
              Text(
                leaveType['description'],
                style: TextStyle(
                  fontSize: 12,
                  color: AppTheme.secondaryColor,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: leaveType['color'].withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '$remaining/$balance left',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: leaveType['color'],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHolidayCard(BuildContext context, Map<String, dynamic> holiday) {
    return Container(
      width: 200,
      margin: const EdgeInsets.only(right: 12),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: holiday['color'],
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      holiday['name'],
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                holiday['date'],
                style: TextStyle(
                  color: AppTheme.secondaryColor,
                  fontSize: 12,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                holiday['type'],
                style: TextStyle(
                  color: holiday['color'],
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEventCard(BuildContext context, Map<String, dynamic> event) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: AppTheme.primaryColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(
            Icons.event,
            color: AppTheme.primaryColor,
          ),
        ),
        title: Text(
          event['name'],
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('${event['date']} at ${event['time']}'),
            Text(
              event['location'],
              style: TextStyle(
                color: AppTheme.secondaryColor,
                fontSize: 12,
              ),
            ),
          ],
        ),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: AppTheme.primaryColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            event['type'],
            style: TextStyle(
              color: AppTheme.primaryColor,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        onTap: () {
          // TODO: Navigate to event details
        },
      ),
    );
  }

  void _showLeaveApplicationDialog(BuildContext context, String leaveType) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Apply $leaveType'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              decoration: const InputDecoration(
                labelText: 'Start Date',
                hintText: 'Select start date',
              ),
              readOnly: true,
              onTap: () {
                // TODO: Show date picker
              },
            ),
            const SizedBox(height: 16),
            TextField(
              decoration: const InputDecoration(
                labelText: 'End Date',
                hintText: 'Select end date',
              ),
              readOnly: true,
              onTap: () {
                // TODO: Show date picker
              },
            ),
            const SizedBox(height: 16),
            TextField(
              decoration: const InputDecoration(
                labelText: 'Reason',
                hintText: 'Enter reason for leave',
              ),
              maxLines: 3,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('$leaveType application submitted')),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryColor,
              foregroundColor: Colors.white,
            ),
            child: const Text('Submit'),
          ),
        ],
      ),
    );
  }
}
