import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../shared/widgets/app_drawer.dart';
import '../../core/theme/app_theme.dart';
import '../../core/services/api_service.dart';
import '../../core/providers/providers.dart';

class EditEmployeeScreen extends ConsumerStatefulWidget {
  final String employeeId;
  final String? returnRoute;
  
  const EditEmployeeScreen({Key? key, required this.employeeId, this.returnRoute}) : super(key: key);

  @override
  ConsumerState<EditEmployeeScreen> createState() => _EditEmployeeScreenState();
}

class _EditEmployeeScreenState extends ConsumerState<EditEmployeeScreen> {
  final PageController _pageController = PageController();
  final _formKey = GlobalKey<FormState>();
  
  int _currentStep = 0;
  bool _isLoading = false;
  bool _isLoadingData = true;
  
  // Form controllers
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _usernameController = TextEditingController();
  final _designationController = TextEditingController();
  final _departmentController = TextEditingController();
  final _ctcController = TextEditingController();
  
  // Form data
  String _selectedRole = 'Employee';
  String? _selectedManagerId;
  bool _isActive = true;
  
  // Data lists
  List<Map<String, dynamic>> _managers = [];
  List<Map<String, dynamic>> _organizations = [];
  List<Map<String, dynamic>> _leaveCategories = [];
  Map<String, dynamic>? _employee;
  
  // Leave allocations
  Map<String, int> _leaveAllocations = {};

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _pageController.dispose();
    _nameController.dispose();
    _emailController.dispose();
    _usernameController.dispose();
    _designationController.dispose();
    _departmentController.dispose();
    _ctcController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    try {
      final apiService = ref.read(apiServiceProvider);
      final managers = await apiService.getUsers();
      final organizations = await apiService.getOrganizations();
      final employee = await apiService.getUser(widget.employeeId);
      final leaveCategories = await apiService.getLeaveCategories();
      
      setState(() {
        _managers = managers.where((user) => 
          user['role'] == 'HR' || user['role'] == 'Admin'
        ).toList();
        _organizations = organizations;
        _leaveCategories = leaveCategories;
        _employee = employee;
        _isLoadingData = false;
      });
      
      // Populate form with existing data
      if (_employee != null) {
        _nameController.text = _employee!['name'] ?? '';
        _emailController.text = _employee!['email'] ?? '';
        _usernameController.text = _employee!['username'] ?? '';
        _designationController.text = _employee!['designation'] ?? '';
        _departmentController.text = _employee!['department'] ?? '';
        _ctcController.text = _employee!['ctc']?.toString() ?? '';
        _selectedRole = _employee!['role'] ?? 'Employee';
        _selectedManagerId = _employee!['manager_id']?.toString();
        _isActive = _employee!['is_active'] ?? true;
      }
      
      // Load existing leave allocations
      await _loadLeaveAllocations();
    } catch (e) {
      setState(() {
        _isLoadingData = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to load data: $e')),
      );
    }
  }

  Future<void> _loadLeaveAllocations() async {
    try {
      final apiService = ref.read(apiServiceProvider);
      final allocations = await apiService.getLeaveAllocations(widget.employeeId);
      
      setState(() {
        _leaveAllocations.clear();
        if (allocations is List) {
          for (var allocation in allocations) {
            final categoryName = allocation['category_name'] ?? allocation['leave_category']?['name'];
            if (categoryName != null) {
              _leaveAllocations[categoryName] = allocation['total_days'] ?? allocation['allocated_days'] ?? 0;
            }
          }
        }
      });
    } catch (e) {
      // Handle error silently - leave allocations are optional
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoadingData) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Edit Employee'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () {
              if (widget.returnRoute != null) {
                context.go(widget.returnRoute!);
              } else {
                context.pop();
              }
            },
          ),
        ),
        drawer: const AppDrawer(),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('Edit ${_employee?['name'] ?? 'Employee'}'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (widget.returnRoute != null) {
              context.go(widget.returnRoute!);
            } else {
              context.pop();
            }
          },
        ),
        actions: [
          if (_currentStep > 0)
            TextButton(
              onPressed: _previousStep,
              child: const Text('Previous'),
            ),
          TextButton(
            onPressed: _currentStep < 3 ? _nextStep : _submitForm,
            child: Text(_currentStep < 3 ? 'Next' : 'Update'),
          ),
        ],
      ),
      drawer: const AppDrawer(),
      body: Column(
        children: [
          // Progress indicator
          Container(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: LinearProgressIndicator(
                    value: (_currentStep + 1) / 4,
                    backgroundColor: Colors.grey[300],
                    valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryColor),
                  ),
                ),
                const SizedBox(width: 16),
                Text(
                  'Step ${_currentStep + 1} of 4',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: AppTheme.primaryColor,
                  ),
                ),
              ],
            ),
          ),
          
          // Stepper content
          Expanded(
            child: PageView(
              controller: _pageController,
              onPageChanged: (index) {
                setState(() {
                  _currentStep = index;
                });
              },
              children: [
                _buildPersonalInfoStep(),
                _buildWorkInfoStep(),
                _buildLeaveManagementStep(),
                _buildReviewStep(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPersonalInfoStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [AppTheme.primaryColor.withOpacity(0.1), AppTheme.accentColor.withOpacity(0.1)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.primaryColor.withOpacity(0.2)),
              ),
              child: Column(
                children: [
                  Icon(
                    Icons.person,
                    size: 48,
                    color: AppTheme.primaryColor,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Personal Information',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.primaryColor,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Update the basic personal details of the employee',
                    style: TextStyle(
                      fontSize: 14,
                      color: AppTheme.secondaryColor,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 32),
            
            // Form fields
            TextFormField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Full Name',
                hintText: 'Enter full name',
                prefixIcon: Icon(Icons.person),
                border: OutlineInputBorder(),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter full name';
                }
                return null;
              },
            ),
            
            const SizedBox(height: 16),
            
            TextFormField(
              controller: _emailController,
              decoration: const InputDecoration(
                labelText: 'Email Address',
                hintText: 'Enter email address',
                prefixIcon: Icon(Icons.email),
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.emailAddress,
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter email address';
                }
                if (!value.contains('@')) {
                  return 'Please enter a valid email address';
                }
                return null;
              },
            ),
            
            const SizedBox(height: 16),
            
            TextFormField(
              controller: _usernameController,
              decoration: const InputDecoration(
                labelText: 'Username',
                hintText: 'Enter username',
                prefixIcon: Icon(Icons.account_circle),
                border: OutlineInputBorder(),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter username';
                }
                if (value.length < 3) {
                  return 'Username must be at least 3 characters';
                }
                return null;
              },
            ),
            
            const SizedBox(height: 16),
            
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.blue[50],
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.blue[200]!),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline, color: Colors.blue[700], size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Password cannot be changed here. Use the change password feature in settings.',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.blue[700],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWorkInfoStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [AppTheme.accentColor.withOpacity(0.1), AppTheme.successColor.withOpacity(0.1)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.accentColor.withOpacity(0.2)),
            ),
            child: Column(
              children: [
                Icon(
                  Icons.work,
                  size: 48,
                  color: AppTheme.accentColor,
                ),
                const SizedBox(height: 16),
                Text(
                  'Work Information',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.accentColor,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Update the work-related details of the employee',
                  style: TextStyle(
                    fontSize: 14,
                    color: AppTheme.secondaryColor,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 32),
          
          // Form fields
          DropdownButtonFormField<String>(
            value: _selectedRole,
            decoration: const InputDecoration(
              labelText: 'Role',
              prefixIcon: Icon(Icons.work),
              border: OutlineInputBorder(),
            ),
            items: ['Employee', 'HR', 'Admin'].map((role) {
              return DropdownMenuItem<String>(
                value: role,
                child: Text(role),
              );
            }).toList(),
            onChanged: (value) {
              setState(() {
                _selectedRole = value!;
              });
            },
          ),
          
          const SizedBox(height: 16),
          
          TextFormField(
            controller: _designationController,
            decoration: const InputDecoration(
              labelText: 'Designation',
              hintText: 'Enter designation',
              prefixIcon: Icon(Icons.badge),
              border: OutlineInputBorder(),
            ),
          ),
          
          const SizedBox(height: 16),
          
          TextFormField(
            controller: _departmentController,
            decoration: const InputDecoration(
              labelText: 'Department',
              hintText: 'Enter department',
              prefixIcon: Icon(Icons.business),
              border: OutlineInputBorder(),
            ),
            validator: (value) {
              if (value == null || value.isEmpty) {
                return 'Please enter department';
              }
              return null;
            },
          ),
          
          const SizedBox(height: 16),
          
          TextFormField(
            controller: _ctcController,
            decoration: const InputDecoration(
              labelText: 'CTC (Annual)',
              hintText: 'Enter annual CTC',
              prefixIcon: Icon(Icons.attach_money),
              border: OutlineInputBorder(),
            ),
            keyboardType: TextInputType.number,
          ),
          
          const SizedBox(height: 16),
          
          if (_managers.isNotEmpty) ...[
            DropdownButtonFormField<String>(
              value: _selectedManagerId,
              decoration: const InputDecoration(
                labelText: 'Manager (Optional)',
                prefixIcon: Icon(Icons.supervisor_account),
                border: OutlineInputBorder(),
              ),
              items: [
                DropdownMenuItem<String>(
                  value: null,
                  child: Text('No Manager'),
                ),
                ..._managers.map((manager) {
                  return DropdownMenuItem<String>(
                    value: manager['id'].toString(),
                    child: Text(manager['name'] ?? 'Unknown'),
                  );
                }).toList(),
              ],
              onChanged: (value) {
                setState(() {
                  _selectedManagerId = value;
                });
              },
            ),
            const SizedBox(height: 16),
          ],
          
          Row(
            children: [
              Checkbox(
                value: _isActive,
                onChanged: (value) {
                  setState(() {
                    _isActive = value!;
                  });
                },
              ),
              const Text('Active Employee'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildReviewStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [AppTheme.successColor.withOpacity(0.1), AppTheme.primaryColor.withOpacity(0.1)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.successColor.withOpacity(0.2)),
            ),
            child: Column(
              children: [
                Icon(
                  Icons.check_circle,
                  size: 48,
                  color: AppTheme.successColor,
                ),
                const SizedBox(height: 16),
                Text(
                  'Review Changes',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.successColor,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Review all changes before updating the employee',
                  style: TextStyle(
                    fontSize: 14,
                    color: AppTheme.secondaryColor,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 32),
          
          // Review cards
          _buildReviewCard('Personal Information', [
            _buildReviewItem('Name', _nameController.text),
            _buildReviewItem('Email', _emailController.text),
            _buildReviewItem('Username', _usernameController.text),
          ]),
          
          const SizedBox(height: 16),
          
          _buildReviewCard('Work Information', [
            _buildReviewItem('Role', _selectedRole),
            _buildReviewItem('Designation', _designationController.text.isEmpty ? 'Not specified' : _designationController.text),
            _buildReviewItem('Department', _departmentController.text),
            _buildReviewItem('CTC', _ctcController.text.isEmpty ? 'Not specified' : '₹${_ctcController.text}'),
            _buildReviewItem('Manager', _selectedManagerId != null 
              ? _managers.firstWhere((m) => m['id'].toString() == _selectedManagerId)['name'] 
              : 'No Manager'),
            _buildReviewItem('Status', _isActive ? 'Active' : 'Inactive'),
          ]),
          
          const SizedBox(height: 16),
          
          _buildReviewCard('Leave Allocations', [
            ..._leaveAllocations.entries.map((entry) {
              return _buildReviewItem(entry.key, '${entry.value} days');
            }).toList(),
            if (_leaveAllocations.isEmpty)
              _buildReviewItem('No allocations', 'No leave allocations set'),
          ]),
        ],
      ),
    );
  }

  Widget _buildReviewCard(String title, List<Widget> items) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppTheme.primaryColor,
              ),
            ),
            const SizedBox(height: 16),
            ...items,
          ],
        ),
      ),
    );
  }

  Widget _buildReviewItem(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              '$label:',
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 14,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontSize: 14),
            ),
          ),
        ],
      ),
    );
  }

  void _nextStep() {
    if (_currentStep == 0) {
      if (_formKey.currentState!.validate()) {
        _pageController.nextPage(
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeInOut,
        );
      }
    } else {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }
  }

  void _previousStep() {
    _pageController.previousPage(
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    );
  }

  Future<void> _submitForm() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final apiService = ref.read(apiServiceProvider);
      final employeeData = {
        'name': _nameController.text,
        'email': _emailController.text,
        'username': _usernameController.text,
        'role': _selectedRole,
        'designation': _designationController.text,
        'department': _departmentController.text,
        'is_active': _isActive,
        if (_ctcController.text.isNotEmpty) 'ctc': double.tryParse(_ctcController.text),
        if (_selectedManagerId != null) 'manager_id': _selectedManagerId,
      };

      await apiService.updateUser(widget.employeeId, employeeData);

      // Update leave allocations
      await _updateLeaveAllocations();

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Employee updated successfully'),
          backgroundColor: Colors.green,
        ),
      );
      
      if (widget.returnRoute != null) {
        context.go(widget.returnRoute!);
      } else {
        context.pop();
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to update employee: $e'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _updateLeaveAllocations() async {
    try {
      final apiService = ref.read(apiServiceProvider);
      
      for (var category in _leaveCategories) {
        final categoryName = category['name'] ?? 'Unknown';
        final allocatedDays = _leaveAllocations[categoryName] ?? 0;
        
        if (allocatedDays > 0) {
          await apiService.createLeaveAllocation({
            'user_id': widget.employeeId,
            'category_id': category['id'],
            'total_days': allocatedDays,
            'year': DateTime.now().year,
          });
        }
      }
    } catch (e) {
      // Handle error silently - leave allocations are optional
    }
  }

  Widget _buildLeaveManagementStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              children: [
                Icon(
                  Icons.event_available,
                  size: 48,
                  color: AppTheme.primaryColor,
                ),
                const SizedBox(height: 16),
                Text(
                  'Leave Management',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.primaryColor,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Manage leave allocations for this employee',
                  style: TextStyle(
                    fontSize: 16,
                    color: AppTheme.secondaryColor,
                  ),
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 32),
          
          // Leave allocations
          Text(
            'Leave Allocations',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: AppTheme.primaryColor,
            ),
          ),
          const SizedBox(height: 16),
          
          ..._leaveCategories.map((category) {
            final categoryName = category['name'] ?? 'Unknown';
            final currentAllocation = _leaveAllocations[categoryName] ?? 0;
            
            return Card(
              margin: const EdgeInsets.only(bottom: 12),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            categoryName,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            category['description'] ?? '',
                            style: TextStyle(
                              fontSize: 14,
                              color: AppTheme.secondaryColor,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 16),
                    Row(
                      children: [
                        IconButton(
                          onPressed: () {
                            if (currentAllocation > 0) {
                              setState(() {
                                _leaveAllocations[categoryName] = currentAllocation - 1;
                              });
                            }
                          },
                          icon: const Icon(Icons.remove_circle_outline),
                          color: AppTheme.primaryColor,
                        ),
                        Container(
                          width: 60,
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            border: Border.all(color: AppTheme.primaryColor),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            currentAllocation.toString(),
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        IconButton(
                          onPressed: () {
                            setState(() {
                              _leaveAllocations[categoryName] = currentAllocation + 1;
                            });
                          },
                          icon: const Icon(Icons.add_circle_outline),
                          color: AppTheme.primaryColor,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
          
          if (_leaveCategories.isEmpty)
            Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Text(
                  'No leave categories available',
                  style: TextStyle(
                    fontSize: 16,
                    color: AppTheme.secondaryColor,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
