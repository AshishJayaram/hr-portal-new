import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../shared/widgets/app_drawer.dart';
import '../../core/theme/app_theme.dart';

class EmployeesScreen extends ConsumerStatefulWidget {
  @override
  ConsumerState<EmployeesScreen> createState() => _EmployeesScreenState();
}

class _EmployeesScreenState extends ConsumerState<EmployeesScreen> {
  final List<Map<String, dynamic>> _employees = [];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Employees'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () {
              context.go('/employees/add');
            },
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadEmployees,
          ),
        ],
      ),
      drawer: const AppDrawer(),
      body: Column(
        children: [
          // Search and Filter Bar
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    decoration: InputDecoration(
                      hintText: 'Search employees...',
                      prefixIcon: const Icon(Icons.search),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  onPressed: () {
                    // TODO: Show filter options
                  },
                  icon: const Icon(Icons.filter_list),
                ),
              ],
            ),
          ),
          
          // Employees List
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _employees.length,
              itemBuilder: (context, index) {
                final employee = _employees[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: AppTheme.primaryColor,
                      child: Text(
                        employee['name'][0],
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    title: Text(
                      employee['name'],
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(employee['role']),
                        Text(
                          '${employee['department']} • Joined ${employee['joinDate']}',
                          style: TextStyle(
                            color: AppTheme.secondaryColor,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: employee['status'] == 'Active' 
                                ? AppTheme.successColor 
                                : AppTheme.warningColor,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            employee['status'],
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        PopupMenuButton<String>(
                          onSelected: (value) {
                            switch (value) {
                              case 'edit':
                                context.go('/employees/edit');
                                break;
                              case 'view':
                                // TODO: Navigate to employee details
                                break;
                              case 'delete':
                                _deleteEmployee(employee['name']);
                                break;
                            }
                          },
                          itemBuilder: (context) => [
                            const PopupMenuItem(
                              value: 'view',
                              child: Text('View Details'),
                            ),
                            const PopupMenuItem(
                              value: 'edit',
                              child: Text('Edit'),
                            ),
                            const PopupMenuItem(
                              value: 'delete',
                              child: Text('Delete'),
                            ),
                          ],
                        ),
                      ],
                    ),
                    onTap: () {
                      // TODO: Navigate to employee details
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  void _loadEmployees() {
    // TODO: Implement employees loading
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Employees refreshed')),
    );
  }

  void _deleteEmployee(String name) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Employee'),
        content: Text('Are you sure you want to delete $name?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('$name deleted')),
              );
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }
}
