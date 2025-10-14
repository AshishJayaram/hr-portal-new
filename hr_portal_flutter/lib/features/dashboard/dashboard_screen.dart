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
  final List<Map<String, dynamic>> _recentOffSites = [];
  
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
      _loadOffSites(),
    ]);
    
    // Load leave types after dashboard stats (so we can use the data from stats)
    await _loadLeaveTypes();
  }

  Future<void> _loadHolidays() async {
    try {
      final apiService = ref.read(apiServiceProvider);
      final holidays = await apiService.getHolidays();
      
      setState(() {
        _upcomingHolidays.clear();
        if (holidays is List) {
          // Filter out notices (only show holidays and events)
          final filteredHolidays = (holidays as List).where((holiday) => 
            holiday['type'] != 'notice').toList();
          _upcomingHolidays.addAll(filteredHolidays.cast<Map<String, dynamic>>());
        }
      });
    } catch (e) {
      // Handle error silently
    }
  }

  Future<void> _loadEvents() async {
    try {
      final apiService = ref.read(apiServiceProvider);
      
      // Load holidays and filter for notices only
      final holidays = await apiService.getHolidays();
      
      setState(() {
        _upcomingEvents.clear();
        
        // Add only notices (type = 'notice')
        if (holidays is List) {
          for (var holiday in holidays) {
            if (holiday['type'] == 'notice') {
              _upcomingEvents.add({
                'id': holiday['id'] ?? '',
                'name': holiday['name'] ?? holiday['title'] ?? 'Notice',
                'type': holiday['type'] ?? 'Notice',
                'date': holiday['date'] ?? '',
                'time': 'All Day', // Default time for notices
                'location': 'Office', // Default location for notices
                'description': holiday['description'] ?? '',
                'color': holiday['color'] ?? AppTheme.noticePurple.value.toRadixString(16),
                'icon': Icons.notifications,
                'isNotice': true,
              });
            }
          }
        }
        
        // Sort by date
        _upcomingEvents.sort((a, b) {
          final dateA = DateTime.tryParse(a['date'] ?? '') ?? DateTime.now();
          final dateB = DateTime.tryParse(b['date'] ?? '') ?? DateTime.now();
          return dateA.compareTo(dateB);
        });
        
        // Keep only upcoming events (next 5)
        final now = DateTime.now();
        _upcomingEvents.removeWhere((event) {
          final eventDate = DateTime.tryParse(event['date'] ?? '') ?? DateTime.now();
          return eventDate.isBefore(now);
        });
        
        if (_upcomingEvents.length > 5) {
          _upcomingEvents.removeRange(5, _upcomingEvents.length);
        }
      });
    } catch (e) {
      // Handle error silently
    }
  }

  Future<void> _loadLeaveTypes() async {
    try {
      // Use leave balances from dashboard stats if available
      if (_dashboardStats != null && _dashboardStats!['leave_balances'] != null) {
        final leaveBalances = _dashboardStats!['leave_balances'] as List;
        
        setState(() {
          _leaveTypes.clear();
          
          // Convert leave balances to leave types for display
          for (final balance in leaveBalances) {
            final categoryName = balance['category_name'] ?? 'Leave';
            final totalDays = balance['total_days'] ?? 0;
            final usedDays = balance['used_days'] ?? 0;
            final remainingDays = balance['remaining_days'] ?? 0;
            
            _leaveTypes.add({
              'name': categoryName,
              'description': 'Apply for $categoryName',
              'balance': totalDays,
              'used': usedDays,
              'remaining': remainingDays,
              'icon': _getLeaveTypeIcon(categoryName),
              'color': _getLeaveTypeColor(categoryName),
            });
          }
          
          // Always add LOP (Loss of Pay) option
          _leaveTypes.add({
            'name': 'LOP',
            'description': 'Loss of Pay',
            'balance': 999, // Unlimited
            'used': 0,
            'remaining': 999,
            'icon': Icons.money_off,
            'color': Colors.orange,
          });
        });
      } else {
        // Fallback to separate API call if dashboard stats not available
        final apiService = ref.read(apiServiceProvider);
        final currentUser = await apiService.getCurrentUser();
        
        if (currentUser != null && currentUser['id'] != null) {
          final leaveBalances = await apiService.getLeaveBalance(currentUser['id'].toString());
          
          setState(() {
            _leaveTypes.clear();
            
            // Convert leave balances to leave types for display
            for (final balance in leaveBalances) {
              final categoryName = balance['category_name'] ?? 'Leave';
              final totalDays = balance['total_days'] ?? 0;
              final usedDays = balance['used_days'] ?? 0;
              final remainingDays = balance['remaining_days'] ?? 0;
              
              _leaveTypes.add({
                'name': categoryName,
                'description': 'Apply for $categoryName',
                'balance': totalDays,
                'used': usedDays,
                'remaining': remainingDays,
                'icon': _getLeaveTypeIcon(categoryName),
                'color': _getLeaveTypeColor(categoryName),
              });
            }
            
            // Always add LOP (Loss of Pay) option
            _leaveTypes.add({
              'name': 'LOP',
              'description': 'Loss of Pay',
              'balance': 999, // Unlimited
              'used': 0,
              'remaining': 999,
              'icon': Icons.money_off,
              'color': Colors.orange,
            });
          });
        }
      }
    } catch (e) {
      // Handle error silently
    }
  }

  Future<void> _loadOffSites() async {
    try {
      final apiService = ref.read(apiServiceProvider);
      final offSites = await apiService.getOffSites();
      
      setState(() {
        _recentOffSites.clear();
        if (offSites is List) {
          // Filter to show only upcoming off-sites (next 5)
          final now = DateTime.now();
          final upcomingOffSites = offSites.where((offSite) {
            final startDate = DateTime.tryParse(offSite['start_date'] ?? '') ?? DateTime.now();
            return startDate.isAfter(now) || startDate.isAtSameMomentAs(now);
          }).toList();
          
          // Sort by start date and take first 5
          upcomingOffSites.sort((a, b) {
            final dateA = DateTime.tryParse(a['start_date'] ?? '') ?? DateTime.now();
            final dateB = DateTime.tryParse(b['start_date'] ?? '') ?? DateTime.now();
            return dateA.compareTo(dateB);
          });
          
          _recentOffSites.addAll(upcomingOffSites.take(5).cast<Map<String, dynamic>>());
        }
      });
    } catch (e) {
      // Handle error silently
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
      
      // Load leave types using the dashboard stats data
      await _loadLeaveTypes();
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
            
            // Notices (First)
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Notices',
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
            _upcomingEvents.isEmpty
                ? const Center(
                    child: Padding(
                      padding: EdgeInsets.all(32.0),
                      child: Text(
                        'No notices available',
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
            
            // Calendar View
            Text(
              'Calendar',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            _buildCalendarView(),
            
            const SizedBox(height: 32),
            
            // Upcoming Holidays & Events (Second)
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Upcoming Holidays & Events',
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
            
            // Recent Off-site Work (Third)
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Recent Off-site Work',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                TextButton(
                  onPressed: () {
                    context.go('/off-site');
                  },
                  child: const Text('View All'),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _recentOffSites.isEmpty
                ? const Center(
                    child: Padding(
                      padding: EdgeInsets.all(32.0),
                      child: Text(
                        'No upcoming off-site work',
                        style: TextStyle(color: Colors.grey),
                      ),
                    ),
                  )
                : ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: _recentOffSites.length,
                    itemBuilder: (context, index) {
                      final offSite = _recentOffSites[index];
                      return _buildOffSiteCard(context, offSite);
                    },
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
                              _dashboardStats!['total_users']?.toString() ?? '0',
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
                              'Approved Leaves',
                              _dashboardStats!['approved_leaves']?.toString() ?? '0',
                              Icons.check_circle,
                              AppTheme.accentColor,
                              onTap: () => context.go('/leaves'),
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
                    childAspectRatio: 1.1,
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
          padding: const EdgeInsets.all(8),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                leaveType['icon'],
                size: 32,
                color: _parseColor(leaveType['color']),
              ),
              const SizedBox(height: 6),
              Text(
                leaveType['name'],
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 8),
              // Only show "days left" for non-LOP leave types
              if (leaveType['name'].toString().toLowerCase() != 'lop' && 
                  leaveType['name'].toString().toLowerCase() != 'loss of pay')
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: _parseColor(leaveType['color']).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '$remaining/$balance left',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: _parseColor(leaveType['color']),
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
                      color: _parseColor(holiday['color']),
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
                  color: _parseColor(holiday['color']),
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
          event['name'] ?? 'Unknown Event',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('${_formatEventDate(event['date'])} at ${event['time'] ?? 'No time'}'),
            Text(
              event['location'] ?? 'No location',
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
            event['type'] ?? 'Event',
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

  void _showLeaveApplicationDialog(BuildContext context, String leaveType) async {
    // Check if the leave type is available for the current user
    try {
      final apiService = ref.read(apiServiceProvider);
      final currentUser = await apiService.getCurrentUser();
      
      if (currentUser != null && currentUser['id'] != null) {
        final leaveBalance = await apiService.getLeaveBalance(currentUser['id'].toString());
        
        // Get available leave types (categories with allocations + LOP)
        final availableTypes = <String>[];
        
        // Add leave categories with allocations
        for (final balance in leaveBalance) {
          final type = balance['category_name'] ?? balance['type'] ?? 'Leave';
          availableTypes.add(type);
        }
        
        // Always add LOP (Loss of Pay)
        availableTypes.add('LOP');
        
        // Check if the selected leave type is available
        if (!availableTypes.contains(leaveType)) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('$leaveType is not available. Please contact HR to set up your leave allocations.')),
          );
          return;
        }
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to check leave availability. Please try again.')),
      );
      return;
    }

    final startDateController = TextEditingController();
    final endDateController = TextEditingController();
    final reasonController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Apply $leaveType'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: startDateController,
                decoration: const InputDecoration(
                  labelText: 'Start Date',
                  hintText: 'Select start date',
                ),
                readOnly: true,
                onTap: () async {
                  final date = await showDatePicker(
                    context: context,
                    initialDate: DateTime.now(),
                    firstDate: DateTime.now(),
                    lastDate: DateTime.now().add(const Duration(days: 365)),
                  );
                  if (date != null) {
                    startDateController.text = '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
                  }
                },
              ),
              const SizedBox(height: 16),
              TextField(
                controller: endDateController,
                decoration: const InputDecoration(
                  labelText: 'End Date',
                  hintText: 'Select end date',
                ),
                readOnly: true,
                onTap: () async {
                  final date = await showDatePicker(
                    context: context,
                    initialDate: DateTime.now(),
                    firstDate: DateTime.now(),
                    lastDate: DateTime.now().add(const Duration(days: 365)),
                  );
                  if (date != null) {
                    endDateController.text = '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
                  }
                },
              ),
              const SizedBox(height: 16),
              TextField(
                controller: reasonController,
                decoration: const InputDecoration(
                  labelText: 'Reason',
                  hintText: 'Enter reason for leave',
                ),
                maxLines: 3,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: startDateController.text.isNotEmpty && 
                       endDateController.text.isNotEmpty && 
                       reasonController.text.isNotEmpty
                ? () async {
                    try {
                      final apiService = ref.read(apiServiceProvider);
                      await apiService.createLeave({
                        'type': leaveType,
                        'from': startDateController.text,
                        'to': endDateController.text,
                        'reason': reasonController.text,
                      });
                      
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('$leaveType application submitted')),
                      );
                    } catch (e) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Failed to submit leave application: $e')),
                      );
                    }
                  }
                : null,
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

  IconData _getLeaveTypeIcon(String? leaveType) {
    if (leaveType == null) return Icons.event;
    
    switch (leaveType.toLowerCase()) {
      case 'sick leave':
      case 'sick':
        return Icons.medical_services;
      case 'casual leave':
      case 'casual':
        return Icons.beach_access;
      case 'professional leave':
      case 'professional':
        return Icons.business;
      case 'lop':
      case 'loss of pay':
        return Icons.money_off;
      default:
        return Icons.event;
    }
  }

  Color _getLeaveTypeColor(String? leaveType) {
    if (leaveType == null) return AppTheme.primaryColor;
    
    switch (leaveType.toLowerCase()) {
      case 'sick leave':
      case 'sick':
        return Colors.red;
      case 'casual leave':
      case 'casual':
        return Colors.blue;
      case 'professional leave':
      case 'professional':
        return Colors.green;
      case 'lop':
      case 'loss of pay':
        return Colors.orange;
      default:
        return AppTheme.primaryColor;
    }
  }

  String _formatEventDate(String? dateString) {
    if (dateString == null || dateString.isEmpty) return 'No date';
    
    try {
      // Handle date ranges (e.g., "2024-01-01 to 2024-01-03")
      if (dateString.contains(' to ')) {
        final parts = dateString.split(' to ');
        if (parts.length == 2) {
          final startDate = DateTime.parse(parts[0].trim());
          final endDate = DateTime.parse(parts[1].trim());
          return '${startDate.day}/${startDate.month}/${startDate.year} - ${endDate.day}/${endDate.month}/${endDate.year}';
        }
      }
      
      // Single date
      final date = DateTime.parse(dateString);
      return '${date.day}/${date.month}/${date.year}';
    } catch (e) {
      return dateString; // Return original string if parsing fails
    }
  }

  String _formatDate(String? dateString) {
    if (dateString == null || dateString.isEmpty) return 'No date';
    
    try {
      final date = DateTime.parse(dateString);
      return '${date.day}/${date.month}/${date.year}';
    } catch (e) {
      return dateString; // Return original string if parsing fails
    }
  }

  Color _parseColor(dynamic colorValue) {
    if (colorValue == null) return AppTheme.primaryColor;
    
    if (colorValue is Color) return colorValue;
    
    if (colorValue is String) {
      // Handle hex colors like "#FF0000" or "FF0000"
      String hexColor = colorValue.replaceAll('#', '');
      if (hexColor.length == 6) {
        return Color(int.parse('FF$hexColor', radix: 16));
      } else if (hexColor.length == 8) {
        return Color(int.parse(hexColor, radix: 16));
      }
      
      // Handle named colors
      switch (colorValue.toLowerCase()) {
        case 'red':
          return Colors.red;
        case 'blue':
          return Colors.blue;
        case 'green':
          return Colors.green;
        case 'orange':
          return Colors.orange;
        case 'purple':
          return Colors.purple;
        case 'yellow':
          return Colors.yellow;
        case 'pink':
          return Colors.pink;
        case 'teal':
          return Colors.teal;
        case 'cyan':
          return Colors.cyan;
        case 'indigo':
          return Colors.indigo;
        case 'brown':
          return Colors.brown;
        case 'grey':
        case 'gray':
          return Colors.grey;
        default:
          return AppTheme.primaryColor;
      }
    }
    
    return AppTheme.primaryColor;
  }

  Widget _buildCalendarView() {
    final now = DateTime.now();
    final currentMonth = now.month;
    final currentYear = now.year;
    final firstDayOfMonth = DateTime(currentYear, currentMonth, 1);
    final lastDayOfMonth = DateTime(currentYear, currentMonth + 1, 0);
    final firstWeekday = firstDayOfMonth.weekday;
    
    // Get all events for the current month
    final monthEvents = <DateTime, List<Map<String, dynamic>>>{};
    
    // Add holidays
    for (final holiday in _upcomingHolidays) {
      final date = DateTime.tryParse(holiday['date'] ?? '');
      if (date != null && date.month == currentMonth && date.year == currentYear) {
        monthEvents[date] = (monthEvents[date] ?? [])..add({
          'title': holiday['name'] ?? 'Holiday',
          'type': 'holiday',
          'color': Colors.red,
        });
      }
    }
    
    // Add off-site entries
    for (final offSite in _recentOffSites) {
      final startDate = DateTime.tryParse(offSite['start_date'] ?? '');
      final endDate = DateTime.tryParse(offSite['end_date'] ?? '');
      if (startDate != null && endDate != null) {
        var currentDate = DateTime(startDate.year, startDate.month, startDate.day);
        final endDateOnly = DateTime(endDate.year, endDate.month, endDate.day);
        
        while (currentDate.isBefore(endDateOnly.add(const Duration(days: 1)))) {
          if (currentDate.month == currentMonth && currentDate.year == currentYear) {
            monthEvents[currentDate] = (monthEvents[currentDate] ?? [])..add({
              'title': offSite['title'] ?? 'Off-site',
              'type': 'offsite',
              'color': Colors.orange,
            });
          }
          currentDate = currentDate.add(const Duration(days: 1));
        }
      }
    }
    
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Month header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '${_getMonthName(currentMonth)} $currentYear',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.chevron_left),
                      onPressed: () {
                        // TODO: Navigate to previous month
                      },
                    ),
                    IconButton(
                      icon: const Icon(Icons.chevron_right),
                      onPressed: () {
                        // TODO: Navigate to next month
                      },
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 16),
            
            // Calendar grid
            Table(
              children: [
                // Weekday headers
                TableRow(
                  children: ['S', 'M', 'T', 'W', 'T', 'F', 'S']
                      .map((day) => Padding(
                            padding: const EdgeInsets.all(8),
                            child: Text(
                              day,
                              textAlign: TextAlign.center,
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                fontWeight: FontWeight.bold,
                                color: Colors.grey[600],
                              ),
                            ),
                          ))
                      .toList(),
                ),
                
                // Calendar days
                ...List.generate(6, (weekIndex) {
                  return TableRow(
                    children: List.generate(7, (dayIndex) {
                      final dayNumber = weekIndex * 7 + dayIndex - firstWeekday + 2;
                      final isCurrentMonth = dayNumber >= 1 && dayNumber <= lastDayOfMonth.day;
                      final isToday = isCurrentMonth && 
                          dayNumber == now.day && 
                          currentMonth == now.month && 
                          currentYear == now.year;
                      
                      if (!isCurrentMonth) {
                        return const SizedBox(height: 40);
                      }
                      
                      final dayDate = DateTime(currentYear, currentMonth, dayNumber);
                      final dayEvents = monthEvents[dayDate] ?? [];
                      
                      return Container(
                        height: 40,
                        margin: const EdgeInsets.all(2),
                        decoration: BoxDecoration(
                          color: isToday ? AppTheme.primaryColor.withOpacity(0.1) : null,
                          borderRadius: BorderRadius.circular(8),
                          border: isToday ? Border.all(color: AppTheme.primaryColor) : null,
                        ),
                        child: Column(
                          children: [
                            Text(
                              dayNumber.toString(),
                              style: TextStyle(
                                fontWeight: isToday ? FontWeight.bold : FontWeight.normal,
                                color: isToday ? AppTheme.primaryColor : null,
                              ),
                            ),
                            if (dayEvents.isNotEmpty)
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: dayEvents.take(3).map((event) {
                                  return Container(
                                    width: 6,
                                    height: 6,
                                    margin: const EdgeInsets.symmetric(horizontal: 1),
                                    decoration: BoxDecoration(
                                      color: event['color'],
                                      shape: BoxShape.circle,
                                    ),
                                  );
                                }).toList(),
                              ),
                          ],
                        ),
                      );
                    }),
                  );
                }),
              ],
            ),
            
            const SizedBox(height: 16),
            
            // Legend
            Wrap(
              spacing: 16,
              runSpacing: 8,
              children: [
                _buildLegendItem('Holidays', Colors.red),
                _buildLegendItem('Off-site', Colors.orange),
                _buildLegendItem('Today', AppTheme.primaryColor),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLegendItem(String label, Color color) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ],
    );
  }

  String _getMonthName(int month) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
  }

  Widget _buildOffSiteCard(BuildContext context, Map<String, dynamic> offSite) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: Colors.purple.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: const Icon(
            Icons.work_outline,
            color: Colors.purple,
          ),
        ),
        title: Text(
          offSite['title'] ?? 'Untitled',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('${_formatDate(offSite['start_date'])} - ${_formatDate(offSite['end_date'])}'),
            if (offSite['location'] != null && offSite['location'].isNotEmpty)
              Text(
                offSite['location'],
                style: TextStyle(
                  color: AppTheme.secondaryColor,
                  fontSize: 12,
                ),
              ),
          ],
        ),
        trailing: _buildOffSiteStatusChip(offSite['status'] ?? 'planned'),
        onTap: () {
          context.go('/off-site');
        },
      ),
    );
  }

  Widget _buildOffSiteStatusChip(String status) {
    Color color;
    String label;
    
    switch (status.toLowerCase()) {
      case 'planned':
        color = Colors.blue;
        label = 'Planned';
        break;
      case 'in_progress':
        color = Colors.orange;
        label = 'In Progress';
        break;
      case 'completed':
        color = Colors.green;
        label = 'Completed';
        break;
      case 'cancelled':
        color = Colors.red;
        label = 'Cancelled';
        break;
      default:
        color = Colors.grey;
        label = 'Unknown';
    }
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}
