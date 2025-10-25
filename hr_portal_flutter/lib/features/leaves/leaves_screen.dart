import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../shared/widgets/app_drawer.dart';
import '../../core/theme/app_theme.dart';
import '../../core/services/api_service.dart';
import '../../core/providers/providers.dart';

class LeavesScreen extends ConsumerStatefulWidget {
  @override
  ConsumerState<LeavesScreen> createState() => _LeavesScreenState();
}

class _LeavesScreenState extends ConsumerState<LeavesScreen> {
  final List<Map<String, dynamic>> _leaves = [];
  List<Map<String, dynamic>> _availableLeaveTypes = [];
  List<Map<String, dynamic>> _leaveBalance = [];
  bool _isLoadingLeaveTypes = false;

  @override
  void initState() {
    super.initState();
    _loadAvailableLeaveTypes();
    _loadLeaves();
  }

  Future<void> _loadAvailableLeaveTypes() async {
    setState(() {
      _isLoadingLeaveTypes = true;
    });

    try {
      final apiService = ref.read(apiServiceProvider);
      final authState = ref.read(authProvider);
      final currentUser = authState.user;
      
      if (currentUser != null) {
        final leaveBalance = await apiService.getLeaveBalance(currentUser.id);
        
        // Get available leave types (categories with allocations + LOP)
        final availableTypes = <Map<String, dynamic>>[];
        
        // Add leave categories with allocations
        for (final balance in leaveBalance) {
          availableTypes.add({
            'name': balance['category_name'] ?? balance['type'] ?? 'Leave',
            'type': balance['category_name'] ?? balance['type'] ?? 'Leave',
            'category_id': balance['category_id']?.toString(),
          });
        }
        
        // Always add LOP (Loss of Pay)
        availableTypes.add({
          'name': 'LOP',
          'type': 'LOP',
          'category_id': null, // LOP doesn't need category_id
        });
        
        setState(() {
          _availableLeaveTypes = availableTypes;
          _leaveBalance = leaveBalance;
          _isLoadingLeaveTypes = false;
        });
      }
    } catch (e) {
      print('Failed to load available leave types: $e');
      setState(() {
        _isLoadingLeaveTypes = false;
      });
    }
  }

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
          
          // Leave Balance Section
          if (_leaveBalance.isNotEmpty)
            Container(
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppTheme.primaryColor.withOpacity(0.1),
                    AppTheme.accentColor.withOpacity(0.1),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: AppTheme.primaryColor.withOpacity(0.3),
                  width: 1,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.event_available,
                        color: AppTheme.primaryColor,
                        size: 24,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Leave Balance',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.primaryColor,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 12,
                    runSpacing: 8,
                    children: _leaveBalance.map((balance) {
                      final categoryName = balance['category_name'] ?? 'Unknown';
                      final totalDays = balance['total_days'] ?? 0;
                      final usedDays = balance['used_days'] ?? 0;
                      final remainingDays = totalDays - usedDays;
                      
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: remainingDays > 0 
                              ? AppTheme.successColor.withOpacity(0.1)
                              : AppTheme.warningColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: remainingDays > 0 
                                ? AppTheme.successColor.withOpacity(0.3)
                                : AppTheme.warningColor.withOpacity(0.3),
                            width: 1,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              categoryName,
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: remainingDays > 0 
                                    ? AppTheme.successColor
                                    : AppTheme.warningColor,
                              ),
                            ),
                            Text(
                              '$remainingDays / $totalDays days',
                              style: TextStyle(
                                fontSize: 12,
                                color: AppTheme.secondaryColor,
                              ),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
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
                              leave['user']?['name'] ?? leave['employee'] ?? 'Unknown Employee',
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
                                leave['status']?.toString().toUpperCase() ?? 'UNKNOWN',
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
                          leave['type'] ?? 'Unknown Type',
                          style: TextStyle(
                            color: AppTheme.primaryColor,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${leave['from_date'] ?? leave['startDate']} - ${leave['to_date'] ?? leave['endDate']} (${leave['days'] ?? 0} days)',
                          style: const TextStyle(fontSize: 14),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          leave['reason'] ?? 'No reason provided',
                          style: TextStyle(
                            color: AppTheme.secondaryColor,
                            fontSize: 12,
                          ),
                        ),
                        if (leave['status']?.toString().toLowerCase() == 'pending') ...[
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
          setState(() {
            // Filter logic implementation
            if (selected) {
              // Apply filter based on label
              // This would filter the _leaves list based on status
            } else {
              // Show all leaves
            }
          });
        },
        selectedColor: AppTheme.primaryColor.withOpacity(0.2),
        checkmarkColor: AppTheme.primaryColor,
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'approved':
        return AppTheme.successColor;
      case 'rejected':
        return AppTheme.errorColor;
      case 'pending':
        return AppTheme.warningColor;
      default:
        return AppTheme.secondaryColor;
    }
  }

  Future<void> _loadLeaves() async {
    try {
      final apiService = ref.read(apiServiceProvider);
      final leaves = await apiService.getLeaves();
      
      setState(() {
        _leaves.clear();
        _leaves.addAll(leaves);
      });
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Leaves refreshed')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to load leaves: $e')),
      );
    }
  }

  Future<void> _approveLeave(String leaveId) async {
    try {
      final apiService = ref.read(apiServiceProvider);
      await apiService.approveLeave(leaveId);
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Leave $leaveId approved successfully')),
      );
      
      // Refresh the leaves list
      _loadLeaves();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to approve leave: $e')),
      );
    }
  }

  Future<void> _rejectLeave(String leaveId) async {
    // Show dialog to get rejection reason
    final reasonController = TextEditingController();
    
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Reject Leave'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Please provide a reason for rejection:'),
            const SizedBox(height: 16),
            TextField(
              controller: reasonController,
              decoration: const InputDecoration(
                labelText: 'Rejection Reason',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.errorColor,
              foregroundColor: Colors.white,
            ),
            child: const Text('Reject'),
          ),
        ],
      ),
    );
    
    if (confirmed == true && reasonController.text.isNotEmpty) {
      try {
        final apiService = ref.read(apiServiceProvider);
        await apiService.rejectLeave(leaveId, reason: reasonController.text);
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Leave $leaveId rejected successfully')),
        );
        
        // Refresh the leaves list
        _loadLeaves();
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to reject leave: $e')),
        );
      }
    }
  }

  void _showApplyLeaveDialog() {
    if (_isLoadingLeaveTypes) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Loading leave types...')),
      );
      return;
    }

    if (_availableLeaveTypes.isEmpty) {
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('No Leave Categories Available'),
          content: const Text('No leave categories are available. Please contact HR to set up your leave allocations.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Close'),
            ),
          ],
        ),
      );
      return;
    }

    String? selectedLeaveType;
    final startDateController = TextEditingController();
    final endDateController = TextEditingController();
    final reasonController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Apply Leave'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButtonFormField<String>(
                  decoration: const InputDecoration(
                    labelText: 'Leave Type',
                    prefixIcon: Icon(Icons.category),
                  ),
                  value: selectedLeaveType,
                  items: _availableLeaveTypes.map((type) {
                    return DropdownMenuItem<String>(
                      value: type['type'],
                      child: Text(type['name']),
                    );
                  }).toList(),
                  onChanged: (value) {
                    setState(() {
                      selectedLeaveType = value;
                    });
                  },
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: startDateController,
                  decoration: const InputDecoration(
                    labelText: 'Start Date',
                    prefixIcon: Icon(Icons.calendar_today),
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
                    prefixIcon: Icon(Icons.calendar_today),
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
                    prefixIcon: Icon(Icons.note),
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
              onPressed: selectedLeaveType != null && 
                         startDateController.text.isNotEmpty && 
                         endDateController.text.isNotEmpty && 
                         reasonController.text.isNotEmpty
                  ? () async {
                      try {
                        final apiService = ref.read(apiServiceProvider);
                        final authState = ref.read(authProvider);
                        final currentUser = authState.user;
                        
                        if (currentUser == null) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('User not found. Please login again.')),
                          );
                          return;
                        }
                        
                        // Find the selected leave type details
                        final selectedType = _availableLeaveTypes.firstWhere(
                          (type) => type['type'] == selectedLeaveType,
                        );
                        
                        // Parse dates
                        final fromDate = DateTime.parse(startDateController.text);
                        final toDate = DateTime.parse(endDateController.text);
                        
                        final leaveData = {
                          'user_id': currentUser.id,
                          'organization_id': currentUser.organizationId,
                          'category_id': selectedType['category_id'] ?? '',
                          'type': selectedLeaveType,
                          'reason': reasonController.text,
                          'from_date': fromDate.toIso8601String(),
                          'to_date': toDate.toIso8601String(),
                          'start_half': 'FULL',
                          'end_half': 'FULL',
                        };
                        
                        await apiService.createLeave(leaveData);
                        
                        Navigator.pop(context);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('$selectedLeaveType application submitted successfully')),
                        );
                        _loadLeaves();
                      } catch (e) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Failed to submit leave application: ${e.toString()}')),
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
      ),
    );
  }
}
