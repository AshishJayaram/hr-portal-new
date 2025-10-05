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
          _upcomingHolidays.addAll((holidays as List).cast<Map<String, dynamic>>());
        }
      });
    } catch (e) {
      // Handle error silently
    }
  }

  Future<void> _loadEvents() async {
    try {
      final apiService = ref.read(apiServiceProvider);
      
      // Load holidays as events
      final holidays = await apiService.getHolidays();
      
      setState(() {
        _upcomingEvents.clear();
        
        // Add holidays as events
        if (holidays is List) {
          for (var holiday in holidays) {
            _upcomingEvents.add({
              'id': holiday['id'] ?? '',
              'name': holiday['name'] ?? holiday['title'] ?? 'Holiday',
              'type': holiday['type'] ?? 'Holiday',
              'date': holiday['date'] ?? '',
              'time': 'All Day', // Default time for holidays
              'location': 'Office', // Default location for holidays
              'description': holiday['description'] ?? '',
              'color': holiday['color'] ?? 'purple',
              'icon': Icons.event,
              'isHoliday': true,
            });
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
                size: 28,
                color: _parseColor(leaveType['color']),
              ),
              const SizedBox(height: 6),
              Text(
                leaveType['name'],
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 2),
              Text(
                leaveType['description'],
                style: TextStyle(
                  fontSize: 10,
                  color: AppTheme.secondaryColor,
                ),
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: _parseColor(leaveType['color']).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '$remaining/$balance left',
                  style: TextStyle(
                    fontSize: 11,
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
}
