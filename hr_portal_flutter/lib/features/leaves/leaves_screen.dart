import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../shared/widgets/app_drawer.dart';
import '../../core/theme/app_theme.dart';

class LeavesScreen extends ConsumerStatefulWidget {
  @override
  ConsumerState<LeavesScreen> createState() => _LeavesScreenState();
}

class _LeavesScreenState extends ConsumerState<LeavesScreen> {
  final List<Map<String, dynamic>> _leaves = [];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Leaves'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () {
              _showApplyLeaveDialog();
            },
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadLeaves,
          ),
        ],
      ),
      drawer: const AppDrawer(),
      body: Column(
        children: [
          // Filter Tabs
          Container(
            height: 50,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                _buildFilterChip('All', true),
                _buildFilterChip('Pending', false),
                _buildFilterChip('Approved', false),
                _buildFilterChip('Rejected', false),
              ],
            ),
          ),
          
          // Leaves List
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _leaves.length,
              itemBuilder: (context, index) {
                final leave = _leaves[index];
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
                              leave['employee'],
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: _getStatusColor(leave['status']),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                leave['status'],
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          leave['type'],
                          style: TextStyle(
                            color: AppTheme.primaryColor,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${leave['startDate']} - ${leave['endDate']} (${leave['days']} days)',
                          style: const TextStyle(fontSize: 14),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          leave['reason'],
                          style: TextStyle(
                            color: AppTheme.secondaryColor,
                            fontSize: 12,
                          ),
                        ),
                        if (leave['status'] == 'Pending') ...[
                          const SizedBox(height: 12),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              TextButton(
                                onPressed: () => _rejectLeave(leave['id']),
                                child: Text(
                                  'Reject',
                                  style: TextStyle(color: AppTheme.errorColor),
                                ),
                              ),
                              const SizedBox(width: 8),
                              ElevatedButton(
                                onPressed: () => _approveLeave(leave['id']),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppTheme.successColor,
                                ),
                                child: const Text('Approve'),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, bool isSelected) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: FilterChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (selected) {
          // TODO: Implement filter logic
        },
        selectedColor: AppTheme.primaryColor.withOpacity(0.2),
        checkmarkColor: AppTheme.primaryColor,
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'Approved':
        return AppTheme.successColor;
      case 'Rejected':
        return AppTheme.errorColor;
      case 'Pending':
        return AppTheme.warningColor;
      default:
        return AppTheme.secondaryColor;
    }
  }

  void _loadLeaves() {
    // TODO: Implement leaves loading
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Leaves refreshed')),
    );
  }

  void _approveLeave(String leaveId) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Leave $leaveId approved')),
    );
  }

  void _rejectLeave(String leaveId) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Leave $leaveId rejected')),
    );
  }

  void _showApplyLeaveDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Apply Leave'),
        content: const Text('Leave application form - Coming Soon'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }
}
