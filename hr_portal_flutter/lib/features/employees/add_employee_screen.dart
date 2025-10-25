import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../shared/widgets/app_drawer.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/liquid_glass_theme.dart';
import '../../core/widgets/glass_components.dart';
import '../../core/services/api_service.dart';
import '../../core/providers/providers.dart';

class AddEmployeeScreen extends ConsumerStatefulWidget {
  @override
  ConsumerState<AddEmployeeScreen> createState() => _AddEmployeeScreenState();
}

class _AddEmployeeScreenState extends ConsumerState<AddEmployeeScreen> {
  final PageController _pageController = PageController();
  final _formKey = GlobalKey<FormState>();
  
  int _currentStep = 0;
  bool _isLoading = false;
  
  // Form controllers
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
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
    _passwordController.dispose();
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
      
      setState(() {
        _managers = managers.where((user) => 
          user['role'] == 'HR' || user['role'] == 'Admin'
        ).toList();
        _organizations = organizations;
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to load data: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(0), // Hide the default app bar
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
              _buildCustomHeader(context)
                  .animate()
                  .fadeIn(duration: 600.ms, delay: 100.ms)
                  .slideY(begin: 0.2, end: 0),
              
              // Progress indicator
              _buildProgressIndicator(context)
                  .animate()
                  .fadeIn(duration: 600.ms, delay: 200.ms)
                  .slideY(begin: 0.2, end: 0),
              
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
                    Icons.person_add,
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
                    'Enter the basic personal details of the employee',
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
            
            TextFormField(
              controller: _passwordController,
              decoration: const InputDecoration(
                labelText: 'Password',
                hintText: 'Enter password',
                prefixIcon: Icon(Icons.lock),
                border: OutlineInputBorder(),
              ),
              obscureText: true,
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter password';
                }
                if (value.length < 6) {
                  return 'Password must be at least 6 characters';
                }
                return null;
              },
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
                  'Enter the work-related details of the employee',
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
                  'Review Information',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.successColor,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Review all information before creating the employee',
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
        'password': _passwordController.text,
        'role': _selectedRole,
        'designation': _designationController.text,
        'department': _departmentController.text,
        'is_active': _isActive,
        if (_ctcController.text.isNotEmpty) 'ctc': double.tryParse(_ctcController.text),
        if (_selectedManagerId != null) 'manager_id': _selectedManagerId,
        if (_organizations.isNotEmpty) 'organization_id': _organizations.first['id'],
      };

      await apiService.createUser(employeeData);

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Employee created successfully'),
          backgroundColor: Colors.green,
        ),
      );
      
      context.pop();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to create employee: $e'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Widget _buildCustomHeader(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(LiquidGlassTheme.spacingM),
      child: Row(
        children: [
          // Back Button
          GlassButton(
            onPressed: () => context.pop(),
            backgroundColor: Colors.white.withOpacity(0.2),
            foregroundColor: Colors.white,
            padding: const EdgeInsets.all(LiquidGlassTheme.spacingS),
            child: const Icon(Icons.arrow_back_rounded, size: 20),
          ),
          const SizedBox(width: LiquidGlassTheme.spacingM),
          // Title
          Expanded(
            child: Text(
              'Add Employee',
              style: LiquidGlassTheme.heading2.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          // Action Buttons
          Row(
            children: [
              if (_currentStep > 0)
                GlassButton(
                  onPressed: _previousStep,
                  backgroundColor: Colors.white.withOpacity(0.2),
                  foregroundColor: Colors.white,
                  child: const Text('Previous'),
                ),
              const SizedBox(width: LiquidGlassTheme.spacingS),
              GlassButton(
                onPressed: _currentStep < 2 ? _nextStep : _submitForm,
                backgroundColor: LiquidGlassTheme.primaryPurple,
                foregroundColor: Colors.white,
                child: Text(_currentStep < 2 ? 'Next' : 'Save'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildProgressIndicator(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: LiquidGlassTheme.spacingM,
        vertical: LiquidGlassTheme.spacingS,
      ),
      child: GlassCard(
        backgroundColor: Colors.white.withOpacity(0.15),
        child: Row(
          children: [
            Expanded(
              child: LinearProgressIndicator(
                value: (_currentStep + 1) / 3,
                backgroundColor: Colors.white.withOpacity(0.2),
                valueColor: const AlwaysStoppedAnimation<Color>(Colors.white),
              ),
            ),
            const SizedBox(width: LiquidGlassTheme.spacingM),
            Text(
              'Step ${_currentStep + 1} of 3',
              style: LiquidGlassTheme.bodyMedium.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
