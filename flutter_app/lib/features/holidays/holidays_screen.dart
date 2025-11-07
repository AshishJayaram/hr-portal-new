import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../shared/widgets/app_drawer.dart';
import '../../core/theme/app_theme.dart';
import '../../core/services/api_service.dart';
import '../../core/providers/providers.dart';

class HolidaysScreen extends ConsumerStatefulWidget {
  @override
  ConsumerState<HolidaysScreen> createState() => _HolidaysScreenState();
}

class _HolidaysScreenState extends ConsumerState<HolidaysScreen> with TickerProviderStateMixin {
  late TabController _tabController;
  
  final List<Map<String, dynamic>> _upcomingHolidays = [];
  final List<Map<String, dynamic>> _userLeaves = [];
  final List<int> _availableYears = [];
  int? _selectedYear;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadAvailableYears();
    _loadHolidays();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Holidays & Leaves'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Upcoming Holidays', icon: Icon(Icons.event)),
            Tab(text: 'My Leaves', icon: Icon(Icons.person)),
          ],
        ),
        actions: [
          Consumer(
            builder: (context, ref, child) {
              final authState = ref.watch(authProvider);
              final user = authState.user;
              final canCreateHoliday = user?.role == 'HR' || user?.role == 'Admin' || user?.role == 'God';
              
              if (canCreateHoliday) {
                return IconButton(
                  icon: const Icon(Icons.add),
                  onPressed: () {
                    context.go('/holidays/add');
                  },
                );
              }
              return const SizedBox.shrink();
            },
          ),
        ],
      ),
      drawer: const AppDrawer(),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildHolidaysTab(),
          _buildLeavesTab(),
        ],
      ),
    );
  }

  Widget _buildHolidaysTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Holidays & Events',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              if (_availableYears.isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppTheme.primaryColor.withOpacity(0.3)),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<int>(
                      value: _selectedYear,
                      hint: const Text('Select Year'),
                      items: _availableYears.map((year) {
                        final financialYearLabel = '${year} (Apr ${year.toString().substring(2)} - Mar ${(year + 1).toString().substring(2)})';
                        return DropdownMenuItem<int>(
                          value: year,
                          child: Text(
                            financialYearLabel,
                            style: const TextStyle(fontSize: 12),
                          ),
                        );
                      }).toList(),
                      onChanged: (year) {
                        setState(() {
                          _selectedYear = year;
                        });
                        _loadHolidays();
                      },
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),
          if (_isLoading)
            const Center(child: CircularProgressIndicator())
          else if (_upcomingHolidays.isEmpty)
            const Center(
              child: Column(
                children: [
                  Icon(Icons.event, size: 64, color: Colors.grey),
                  SizedBox(height: 16),
                  Text(
                    'No holidays found for selected year',
                    style: TextStyle(fontSize: 16, color: Colors.grey),
                  ),
                ],
              ),
            )
          else
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _upcomingHolidays.length,
              itemBuilder: (context, index) {
                final holiday = _upcomingHolidays[index];
                return _buildHolidayCard(context, holiday);
              },
            ),
        ],
      ),
    );
  }

  Widget _buildLeavesTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'My Leave Applications',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              ElevatedButton.icon(
                onPressed: () {
                  _showApplyLeaveDialog();
                },
                icon: const Icon(Icons.add),
                label: const Text('Apply Leave'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                  foregroundColor: Colors.white,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _userLeaves.length,
            itemBuilder: (context, index) {
              final leave = _userLeaves[index];
              return _buildLeaveCard(context, leave);
            },
          ),
        ],
      ),
    );
  }

  Widget _buildHolidayCard(BuildContext context, Map<String, dynamic> holiday) {
    final type = holiday['type'] ?? 'holiday';
    final color = _getHolidayTypeColor(type);
    
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(30),
                border: Border.all(
                  color: color,
                  width: 2,
                ),
              ),
              child: Icon(
                _getHolidayTypeIcon(type),
                color: color,
                size: 30,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    holiday['title'] ?? holiday['name'] ?? 'Untitled',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _formatDate(holiday['date']),
                    style: TextStyle(
                      color: AppTheme.secondaryColor,
                      fontSize: 14,
                    ),
                  ),
                  if (holiday['description'] != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      holiday['description'],
                      style: TextStyle(
                        color: AppTheme.secondaryColor,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.transparent,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: (Theme.of(context).brightness == Brightness.dark)
                      ? color.withOpacity(0.6)
                      : color.withOpacity(0.95),
                ),
              ),
              child: Text(
                type.toUpperCase(),
                style: TextStyle(
                  color: color,
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.4,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLeaveCard(BuildContext context, Map<String, dynamic> leave) {
    Color statusColor;
    IconData statusIcon;
    
    switch (leave['status']) {
      case 'Approved':
        statusColor = AppTheme.successColor;
        statusIcon = Icons.check_circle;
        break;
      case 'Pending':
        statusColor = AppTheme.warningColor;
        statusIcon = Icons.pending;
        break;
      case 'Rejected':
        statusColor = AppTheme.errorColor;
        statusIcon = Icons.cancel;
        break;
      default:
        statusColor = AppTheme.secondaryColor;
        statusIcon = Icons.help;
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  leave['type'],
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        statusIcon,
                        color: statusColor,
                        size: 16,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        leave['status'],
                        style: TextStyle(
                          color: statusColor,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Icon(Icons.calendar_today, color: AppTheme.secondaryColor, size: 16),
                const SizedBox(width: 8),
                Text(
                  '${leave['startDate']} - ${leave['endDate']}',
                  style: TextStyle(
                    color: AppTheme.secondaryColor,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(width: 16),
                Icon(Icons.schedule, color: AppTheme.secondaryColor, size: 16),
                const SizedBox(width: 8),
                Text(
                  '${leave['days']} day${leave['days'] > 1 ? 's' : ''}',
                  style: TextStyle(
                    color: AppTheme.secondaryColor,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(Icons.note, color: AppTheme.secondaryColor, size: 16),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    leave['reason'],
                    style: TextStyle(
                      color: AppTheme.secondaryColor,
                      fontSize: 14,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(Icons.access_time, color: AppTheme.secondaryColor, size: 16),
                const SizedBox(width: 8),
                Text(
                  'Applied on ${leave['appliedDate']}',
                  style: TextStyle(
                    color: AppTheme.secondaryColor,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showApplyLeaveDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Apply for Leave'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            DropdownButtonFormField<String>(
              decoration: const InputDecoration(
                labelText: 'Leave Type',
                prefixIcon: Icon(Icons.category),
              ),
              items: ['Annual Leave', 'Sick Leave', 'Personal Leave', 'Emergency Leave']
                  .map((type) => DropdownMenuItem(value: type, child: Text(type)))
                  .toList(),
              onChanged: (value) {
                // Handle leave type selection
              },
            ),
            const SizedBox(height: 16),
            TextField(
              decoration: const InputDecoration(
                labelText: 'Start Date',
                prefixIcon: Icon(Icons.calendar_today),
              ),
              readOnly: true,
              onTap: () async {
                final date = await showDatePicker(
                  context: context,
                  initialDate: DateTime.now(),
                  firstDate: DateTime.now().subtract(const Duration(days: 365)),
                  lastDate: DateTime.now().add(const Duration(days: 365)),
                );
                if (date != null) {
                  // Update the start date field
                  // This would need to be connected to a controller
                }
              },
            ),
            const SizedBox(height: 16),
            TextField(
              decoration: const InputDecoration(
                labelText: 'End Date',
                prefixIcon: Icon(Icons.calendar_today),
              ),
              readOnly: true,
              onTap: () async {
                final date = await showDatePicker(
                  context: context,
                  initialDate: DateTime.now(),
                  firstDate: DateTime.now().subtract(const Duration(days: 365)),
                  lastDate: DateTime.now().add(const Duration(days: 365)),
                );
                if (date != null) {
                  // Update the start date field
                  // This would need to be connected to a controller
                }
              },
            ),
            const SizedBox(height: 16),
            TextField(
              decoration: const InputDecoration(
                labelText: 'Reason',
                prefixIcon: Icon(Icons.note),
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
                const SnackBar(content: Text('Leave application submitted')),
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

  Color _getHolidayTypeColor(String type) {
    switch (type.toLowerCase()) {
      case 'holiday':
        return Colors.red;
      case 'event':
        return Colors.amber;
      case 'notice':
        return Colors.green;
      default:
        return AppTheme.primaryColor;
    }
  }

  IconData _getHolidayTypeIcon(String type) {
    switch (type.toLowerCase()) {
      case 'holiday':
        return Icons.event;
      case 'event':
        return Icons.calendar_today;
      case 'notice':
        return Icons.notifications;
      default:
        return Icons.event;
    }
  }

  String _formatDate(String? dateString) {
    if (dateString == null) return '';
    try {
      // Check if it's a date range (e.g., "2024-01-01 to 2024-01-03")
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
      return '';
    }
  }

  Future<void> _loadAvailableYears() async {
    try {
      final apiService = ref.read(apiServiceProvider);
      final years = await apiService.getAvailableHolidayYears();
      
      setState(() {
        _availableYears.clear();
        _availableYears.addAll(years);
        if (years.isNotEmpty && _selectedYear == null) {
          _selectedYear = years.first; // Default to first available year
        }
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to load available years: $e')),
      );
    }
  }

  Future<void> _loadHolidays() async {
    // Use current year if no year is selected
    final yearToLoad = _selectedYear ?? DateTime.now().year;
    
    setState(() {
      _isLoading = true;
    });

    try {
      final apiService = ref.read(apiServiceProvider);
      final holidays = await apiService.getHolidaysWithFilters(year: yearToLoad);
      
      setState(() {
        _upcomingHolidays.clear();
        if (holidays is List) {
          _upcomingHolidays.addAll((holidays as List).cast<Map<String, dynamic>>());
        } else if (holidays is Map && holidays.containsKey('data')) {
          final data = holidays['data'];
          if (data is List) {
            _upcomingHolidays.addAll((data as List).cast<Map<String, dynamic>>());
          }
        }
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to load holidays: $e')),
      );
    }
  }
}
