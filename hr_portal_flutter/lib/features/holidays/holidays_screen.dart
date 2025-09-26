import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../shared/widgets/app_drawer.dart';
import '../../core/theme/app_theme.dart';

class HolidaysScreen extends ConsumerStatefulWidget {
  @override
  ConsumerState<HolidaysScreen> createState() => _HolidaysScreenState();
}

class _HolidaysScreenState extends ConsumerState<HolidaysScreen> with TickerProviderStateMixin {
  late TabController _tabController;
  
  final List<Map<String, dynamic>> _upcomingHolidays = [];

  final List<Map<String, dynamic>> _userLeaves = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
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
        actions: [],
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
          Text(
            'Upcoming Public Holidays',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
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
                color: holiday['color'].withOpacity(0.1),
                borderRadius: BorderRadius.circular(30),
                border: Border.all(
                  color: holiday['color'],
                  width: 2,
                ),
              ),
              child: Icon(
                Icons.event,
                color: holiday['color'],
                size: 30,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    holiday['name'],
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    holiday['date'],
                    style: TextStyle(
                      color: AppTheme.secondaryColor,
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    holiday['description'],
                    style: TextStyle(
                      color: AppTheme.secondaryColor,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: holiday['color'].withOpacity(0.1),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Text(
                holiday['type'],
                style: TextStyle(
                  color: holiday['color'],
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
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
              onTap: () {
                // TODO: Show date picker
              },
            ),
            const SizedBox(height: 16),
            TextField(
              decoration: const InputDecoration(
                labelText: 'End Date',
                prefixIcon: Icon(Icons.calendar_today),
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
}
