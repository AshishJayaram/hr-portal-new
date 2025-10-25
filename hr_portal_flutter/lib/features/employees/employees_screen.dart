import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/liquid_glass_theme.dart';
import '../../core/widgets/glass_components.dart';
import '../../shared/widgets/app_drawer.dart';

class EmployeesScreen extends StatefulWidget {
  const EmployeesScreen({super.key});

  @override
  State<EmployeesScreen> createState() => _EmployeesScreenState();
}

class _EmployeesScreenState extends State<EmployeesScreen> {
  List<Map<String, dynamic>> _employees = [];
  bool _isLoading = true;
  String _searchQuery = '';
  String _selectedFilter = 'All';

  @override
  void initState() {
    super.initState();
    _loadEmployees();
  }

  Future<void> _loadEmployees() async {
    setState(() {
      _isLoading = true;
    });

    // Simulate API call
    await Future.delayed(const Duration(seconds: 1));

    setState(() {
      _employees = [
        {
          'id': 1,
          'name': 'John Doe',
          'email': 'john@company.com',
          'role': 'Employee',
          'department': 'Engineering',
          'designation': 'Software Engineer',
          'is_active': true,
        },
        {
          'id': 2,
          'name': 'Jane Smith',
          'email': 'jane@company.com',
          'role': 'Manager',
          'department': 'Engineering',
          'designation': 'Engineering Manager',
          'is_active': true,
        },
        {
          'id': 3,
          'name': 'Bob Johnson',
          'email': 'bob@company.com',
          'role': 'HR',
          'department': 'Human Resources',
          'designation': 'HR Manager',
          'is_active': false,
        },
      ];
      _isLoading = false;
    });
  }

  void _showFilterOptions() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Filter Employees'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              title: const Text('All'),
              onTap: () {
                setState(() {
                  _selectedFilter = 'All';
                });
                Navigator.pop(context);
              },
            ),
            ListTile(
              title: const Text('Active'),
              onTap: () {
                setState(() {
                  _selectedFilter = 'Active';
                });
                Navigator.pop(context);
              },
            ),
            ListTile(
              title: const Text('Inactive'),
              onTap: () {
                setState(() {
                  _selectedFilter = 'Inactive';
                });
                Navigator.pop(context);
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(0),
        child: Container(),
      ),
      drawer: const AppDrawer(),
      body: Container(
        decoration: BoxDecoration(
          gradient: isDark 
              ? LiquidGlassTheme.darkPrimaryGradient 
              : LiquidGlassTheme.primaryGradient,
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Custom Header
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    GlassButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Icon(Icons.arrow_back_ios, color: Colors.white),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Text(
                        'Employees',
                        style: LiquidGlassTheme.heading2.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    GlassButton(
                      onPressed: () => context.go('/employees/add'),
                      child: const Icon(Icons.add, color: Colors.white),
                    ),
                  ],
                ),
              ),
              
              // Search and Filter Bar
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Expanded(
                      child: GlassTextField(
                        hintText: 'Search employees...',
                        prefixIcon: const Icon(Icons.search),
                        onChanged: (value) {
                          setState(() {
                            _searchQuery = value;
                          });
                        },
                      ),
                    ),
                    const SizedBox(width: 8),
                    GlassButton(
                      onPressed: _showFilterOptions,
                      child: const Icon(Icons.filter_list, color: Colors.white),
                    ),
                  ],
                ),
              ),
              
              // Employees List
              Expanded(
                child: _isLoading
                    ? const Center(child: CircularProgressIndicator(valueColor: AlwaysStoppedAnimation<Color>(Colors.white)))
                    : _employees.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.people_outline,
                                  size: 64,
                                  color: Colors.white.withOpacity(0.5),
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  'No employees found',
                                  style: LiquidGlassTheme.bodyLarge.copyWith(
                                    color: Colors.white.withOpacity(0.7),
                                  ),
                                ),
                              ],
                            ),
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            itemCount: _employees.length,
                            itemBuilder: (context, index) {
                              final employee = _employees[index];
                              return GlassCard(
                                margin: const EdgeInsets.only(bottom: 12),
                                child: ListTile(
                                  leading: CircleAvatar(
                                    backgroundColor: LiquidGlassTheme.primaryPurple,
                                    child: Text(
                                      (employee['name'] ?? 'U')[0].toUpperCase(),
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                  title: Text(
                                    employee['name'] ?? 'Unknown',
                                    style: LiquidGlassTheme.bodyLarge.copyWith(
                                      fontWeight: FontWeight.w600,
                                      color: Colors.white,
                                    ),
                                  ),
                                  subtitle: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        employee['role'] ?? 'Unknown Role',
                                        style: LiquidGlassTheme.bodyMedium.copyWith(
                                          color: Colors.white.withOpacity(0.8),
                                        ),
                                      ),
                                      Text(
                                        '${employee['department'] ?? 'Unknown Department'} • ${employee['designation'] ?? 'Unknown Designation'}',
                                        style: LiquidGlassTheme.caption.copyWith(
                                          color: LiquidGlassTheme.accentBlue,
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
                                          color: (employee['is_active'] ?? true) 
                                              ? LiquidGlassTheme.accentGreen 
                                              : LiquidGlassTheme.accentRed,
                                          borderRadius: BorderRadius.circular(12),
                                        ),
                                        child: Text(
                                          (employee['is_active'] ?? true) ? 'Active' : 'Inactive',
                                          style: LiquidGlassTheme.caption.copyWith(
                                            color: Colors.white,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      PopupMenuButton<String>(
                                        icon: const Icon(Icons.more_vert, color: Colors.white),
                                        onSelected: (value) {
                                          switch (value) {
                                            case 'edit':
                                              // Navigate to edit employee
                                              break;
                                            case 'delete':
                                              // Show delete confirmation
                                              break;
                                          }
                                        },
                                        itemBuilder: (context) => [
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
                                ),
                              ).animate().fadeIn(duration: 600.ms, delay: (index * 100).ms).slideX(begin: 0.2, end: 0);
                            },
                          ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}