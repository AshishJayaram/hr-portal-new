import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../shared/widgets/app_drawer.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/liquid_glass_theme.dart';
import '../../core/widgets/glass_components.dart';
import '../../core/providers/providers.dart';

class LeavesOnlyScreen extends ConsumerStatefulWidget {
  @override
  ConsumerState<LeavesOnlyScreen> createState() => _LeavesOnlyScreenState();
}

class _LeavesOnlyScreenState extends ConsumerState<LeavesOnlyScreen> {
  final List<Map<String, dynamic>> _leaves = [];
  List<Map<String, dynamic>> _availableLeaveTypes = [];
  List<Map<String, dynamic>> _leaveBalance = [];
  bool _isLoadingLeaveTypes = false;
  bool _isLoadingLeaves = false;
  String _selectedFilter = 'All';

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
      final currentUser = await apiService.getCurrentUser();
      
      if (currentUser != null && currentUser['id'] != null) {
        final leaveBalance = await apiService.getLeaveBalance(currentUser['id'].toString());
        
        setState(() {
          _leaveBalance = leaveBalance;
          _availableLeaveTypes.clear();
          
          // Add leave categories with allocations
          for (final balance in leaveBalance) {
            _availableLeaveTypes.add({
              'name': balance['category_name'] ?? balance['type'] ?? 'Leave',
              'type': balance['category_name'] ?? balance['type'] ?? 'Leave',
              'balance': balance['total_days'] ?? 0,
              'used': balance['used_days'] ?? 0,
              'remaining': balance['remaining_days'] ?? 0,
            });
          }
          
          // Always add LOP (Loss of Pay)
          _availableLeaveTypes.add({
            'name': 'LOP',
            'type': 'LOP',
            'balance': 999,
            'used': 0,
            'remaining': 999,
          });
        });
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to load leave types: $e')),
      );
    } finally {
      setState(() {
        _isLoadingLeaveTypes = false;
      });
    }
  }

  Future<void> _loadLeaves() async {
    setState(() {
      _isLoadingLeaves = true;
    });

    try {
      final apiService = ref.read(apiServiceProvider);
      final leaves = await apiService.getLeaves();
      
      setState(() {
        _leaves.clear();
        _leaves.addAll(leaves);
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to load leaves: $e')),
      );
    } finally {
      setState(() {
        _isLoadingLeaves = false;
      });
    }
  }

  List<Map<String, dynamic>> get _filteredLeaves {
    if (_selectedFilter == 'All') {
      return _leaves;
    }
    return _leaves.where((leave) => leave['status'] == _selectedFilter.toLowerCase()).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: Colors.white,
        leading: Builder(
          builder: (context) => IconButton(
            icon: const Icon(Icons.menu),
            onPressed: () => Scaffold.of(context).openDrawer(),
          ),
        ),
        title: Text(
          'My Leaves',
          style: LiquidGlassTheme.heading4.copyWith(
            color: Colors.white,
            fontWeight: FontWeight.w600,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: _showLeaveApplicationDialog,
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadLeaves,
          ),
        ],
      ),
      drawer: const AppDrawer(),
      body: Container(
        decoration: BoxDecoration(
          gradient: LiquidGlassTheme.darkPrimaryGradient,
        ),
        child: SafeArea(
          child: Column(
        children: [
          // Leave balance summary
          if (_leaveBalance.isNotEmpty) ...[
            GlassCard(
              backgroundColor: Colors.white.withOpacity(0.1),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Leave Balance',
                      style: LiquidGlassTheme.bodyLarge.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 12,
                      runSpacing: 8,
                      children: _leaveBalance.map((balance) {
                        final remaining = balance['remaining_days'] ?? 0;
                        final total = balance['total_days'] ?? 0;
                        final categoryName = balance['category_name'] ?? 'Leave';
                        final color = LiquidGlassTheme.accentBlue;
                        return Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: color.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: color.withOpacity(0.3)),
                          ),
                          child: Text(
                            '$categoryName: $remaining/$total',
                            style: LiquidGlassTheme.bodySmall.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ],
                ),
              ),
            ),
          ],
          
          // Filter chips
          GlassCard(
            backgroundColor: Colors.white.withOpacity(0.1),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildFilterChip('All'),
                  _buildFilterChip('Pending'),
                  _buildFilterChip('Approved'),
                  _buildFilterChip('Rejected'),
                  _buildFilterChip('Cancelled'),
                ],
              ),
            ),
          ),
          
          const SizedBox(height: 16),
          
          // Content
          Expanded(
            child: _isLoadingLeaves
                ? const Center(child: CircularProgressIndicator(color: Colors.white))
                : _filteredLeaves.isEmpty
                    ? GlassCard(
                        backgroundColor: Colors.white.withOpacity(0.1),
                        child: const Padding(
                          padding: EdgeInsets.all(24),
                          child: Text('No leave applications found', style: TextStyle(color: Colors.white70)),
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _filteredLeaves.length,
                        itemBuilder: (context, index) {
                          final leave = _filteredLeaves[index];
                          return _buildLeaveCard(leave);
                        },
                      ),
          ),
        ],
      ),
        ),
      ),
    );
  }

  Widget _buildFilterChip(String label) {
    final isSelected = _selectedFilter == label;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: FilterChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (selected) {
          setState(() {
            _selectedFilter = label;
          });
        },
        selectedColor: AppTheme.primaryColor.withOpacity(0.3),
        checkmarkColor: AppTheme.primaryColor,
      ),
    );
  }

  Widget _buildLeaveCard(Map<String, dynamic> leave) {
    return GlassCard(
      backgroundColor: Colors.white.withOpacity(0.1),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    leave['type'] ?? 'Leave',
                    style: LiquidGlassTheme.bodyLarge.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                _buildStatusChip(leave['status'] ?? 'pending'),
              ],
            ),
            
            const SizedBox(height: 8),
            
            Row(
              children: [
                const Icon(Icons.calendar_today, size: 16, color: Colors.white70),
                const SizedBox(width: 4),
                Text(
                  '${_formatDate(leave['from'])} - ${_formatDate(leave['to'])}',
                  style: LiquidGlassTheme.bodySmall.copyWith(color: Colors.white70),
                ),
              ],
            ),
            
            if (leave['reason'] != null && leave['reason'].isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                leave['reason'],
                style: LiquidGlassTheme.bodySmall.copyWith(color: Colors.white70),
              ),
            ],
            
            const SizedBox(height: 12),
            
            Row(
              children: [
                if (leave['status'] == 'pending') ...[
                  IconButton(
                    icon: const Icon(Icons.edit, color: Colors.white70),
                    onPressed: () {
                      _showEditLeaveDialog(leave);
                    },
                  ),
                  IconButton(
                    icon: const Icon(Icons.cancel, color: Colors.orangeAccent),
                    onPressed: () {
                      _showCancelConfirmation(leave);
                    },
                  ),
                ],
                IconButton(
                  icon: const Icon(Icons.delete, color: Colors.redAccent),
                  onPressed: () {
                    _showDeleteConfirmation(leave);
                  },
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusChip(String status) {
    Color color;
    String label;
    
    switch (status.toLowerCase()) {
      case 'pending':
        color = Colors.orange;
        label = 'Pending';
        break;
      case 'approved':
        color = Colors.green;
        label = 'Approved';
        break;
      case 'rejected':
        color = Colors.red;
        label = 'Rejected';
        break;
      case 'cancelled':
        color = Colors.grey;
        label = 'Cancelled';
        break;
      default:
        color = Colors.grey;
        label = 'Unknown';
    }
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(
        label,
        style: LiquidGlassTheme.caption.copyWith(
          color: Colors.white,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  void _showLeaveApplicationDialog() {
    final startDateController = TextEditingController();
    final endDateController = TextEditingController();
    final reasonController = TextEditingController();
    String selectedLeaveType = _availableLeaveTypes.isNotEmpty ? _availableLeaveTypes.first['type'] : 'Leave';

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
                  value: selectedLeaveType,
                  decoration: const InputDecoration(
                    labelText: 'Leave Type',
                    border: OutlineInputBorder(),
                  ),
                  items: _availableLeaveTypes.map((leaveType) {
                    return DropdownMenuItem<String>(
                      value: leaveType['type'],
                      child: Text(leaveType['name']),
                    );
                  }).toList(),
                  onChanged: (value) {
                    setState(() {
                      selectedLeaveType = value!;
                    });
                  },
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: startDateController,
                  decoration: const InputDecoration(
                    labelText: 'Start Date',
                    border: OutlineInputBorder(),
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
                    border: OutlineInputBorder(),
                  ),
                  readOnly: true,
                  onTap: () async {
                    final date = await showDatePicker(
                      context: context,
                      initialDate: startDateController.text.isNotEmpty
                          ? DateTime.parse(startDateController.text)
                          : DateTime.now(),
                      firstDate: startDateController.text.isNotEmpty
                          ? DateTime.parse(startDateController.text)
                          : DateTime.now(),
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
                    border: OutlineInputBorder(),
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
                        String toRfc3339Z(DateTime d) {
                          final u = d.toUtc();
                          final base = u.toIso8601String();
                          final noFrac = base.contains('.') ? base.split('.').first : base;
                          return noFrac.endsWith('Z') ? noFrac : noFrac + 'Z';
                        }
                        final fromDate = DateTime.parse(startDateController.text);
                        final toDate = DateTime.parse(endDateController.text);
                        if (toDate.isBefore(fromDate)) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('End date cannot be before start date')),
                          );
                          return;
                        }
                        await apiService.createLeave({
                          'type': selectedLeaveType,
                          'from_date': toRfc3339Z(fromDate),
                          'to_date': toRfc3339Z(toDate),
                          'reason': reasonController.text,
                        });
                        
                        Navigator.pop(context);
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Leave application submitted')),
                        );
                        _loadLeaves();
                      } catch (e) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Failed to submit leave application: $e')),
                        );
                      }
                    }
                  : null,
              child: const Text('Submit'),
            ),
          ],
        ),
      ),
    );
  }

  void _showEditLeaveDialog(Map<String, dynamic> leave) {
    // TODO: Implement edit leave dialog
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Edit leave functionality coming soon')),
    );
  }

  void _showCancelConfirmation(Map<String, dynamic> leave) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel Leave'),
        content: Text('Are you sure you want to cancel this leave application?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('No'),
          ),
          ElevatedButton(
            onPressed: () async {
              try {
                final apiService = ref.read(apiServiceProvider);
                final success = await apiService.cancelLeave(leave['id'].toString());
                
                if (success) {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Leave application cancelled')),
                  );
                  _loadLeaves();
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Failed to cancel leave application')),
                  );
                }
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Failed to cancel leave application: $e')),
                );
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.orange),
            child: const Text('Yes, Cancel'),
          ),
        ],
      ),
    );
  }

  void _showDeleteConfirmation(Map<String, dynamic> leave) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Leave'),
        content: Text('Are you sure you want to delete this leave application?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              try {
                final apiService = ref.read(apiServiceProvider);
                final success = await apiService.deleteLeave(leave['id'].toString());
                
                if (success) {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Leave application deleted')),
                  );
                  _loadLeaves();
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Failed to delete leave application')),
                  );
                }
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Failed to delete leave application: $e')),
                );
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  String _formatDate(String? dateString) {
    if (dateString == null) return 'No date';
    try {
      final date = DateTime.parse(dateString);
      return '${date.day}/${date.month}/${date.year}';
    } catch (e) {
      return dateString;
    }
  }
}
