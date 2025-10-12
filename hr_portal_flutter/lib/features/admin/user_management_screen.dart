import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/app_drawer.dart';

class UserManagementScreen extends ConsumerStatefulWidget {
  @override
  ConsumerState<UserManagementScreen> createState() => _UserManagementScreenState();
}

class _UserManagementScreenState extends ConsumerState<UserManagementScreen> {
  final List<Map<String, dynamic>> _users = [];
  final List<Map<String, dynamic>> _organizations = [];
  bool _isLoading = false;
  String _searchQuery = '';
  String _selectedFilter = 'All';

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final apiService = ref.read(apiServiceProvider);
      final users = await apiService.getUsers();
      final organizations = await apiService.getOrganizations();
      
      setState(() {
        _users.clear();
        _users.addAll(users);
        _organizations.clear();
        _organizations.addAll(organizations);
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to load data: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  List<Map<String, dynamic>> get _filteredUsers {
    var filtered = _users.where((user) {
      final matchesSearch = _searchQuery.isEmpty ||
          user['name'].toString().toLowerCase().contains(_searchQuery.toLowerCase()) ||
          user['email'].toString().toLowerCase().contains(_searchQuery.toLowerCase()) ||
          user['username'].toString().toLowerCase().contains(_searchQuery.toLowerCase());
      
      final matchesFilter = _selectedFilter == 'All' || user['role'] == _selectedFilter;
      
      return matchesSearch && matchesFilter;
    }).toList();

    // Sort by name
    filtered.sort((a, b) => a['name'].toString().compareTo(b['name'].toString()));
    
    return filtered;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('User Management'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _showAddUserDialog(),
          ),
        ],
      ),
      drawer: const AppDrawer(),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // Search and Filter Bar
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      TextField(
                        decoration: InputDecoration(
                          hintText: 'Search users...',
                          prefixIcon: const Icon(Icons.search),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        onChanged: (value) {
                          setState(() {
                            _searchQuery = value;
                          });
                        },
                      ),
                      const SizedBox(height: 12),
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: [
                            'All',
                            'Employee',
                            'HR',
                            'Admin',
                          ].map((filter) {
                            return Padding(
                              padding: const EdgeInsets.only(right: 8),
                              child: FilterChip(
                                label: Text(filter),
                                selected: _selectedFilter == filter,
                                onSelected: (selected) {
                                  setState(() {
                                    _selectedFilter = filter;
                                  });
                                },
                              ),
                            );
                          }).toList(),
                        ),
                      ),
                    ],
                  ),
                ),
                // Users List
                Expanded(
                  child: _filteredUsers.isEmpty
                      ? const Center(
                          child: Text(
                            'No users found',
                            style: TextStyle(fontSize: 16),
                          ),
                        )
                      : ListView.builder(
                          itemCount: _filteredUsers.length,
                          itemBuilder: (context, index) {
                            final user = _filteredUsers[index];
                            return _buildUserCard(user);
                          },
                        ),
                ),
              ],
            ),
    );
  }

  Widget _buildUserCard(Map<String, dynamic> user) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: _getRoleColor(user['role']).withOpacity(0.2),
          child: Text(
            user['name'].toString().isNotEmpty 
                ? user['name'][0].toUpperCase() 
                : 'U',
            style: TextStyle(
              color: _getRoleColor(user['role']),
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        title: Text(
          user['name'] ?? 'Unknown',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('${user['email']} • ${user['username']}'),
            Text(
              '${user['designation']} • ${user['department']}',
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
                color: _getRoleColor(user['role']).withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: _getRoleColor(user['role'])),
              ),
              child: Text(
                user['role'] ?? 'Unknown',
                style: TextStyle(
                  color: _getRoleColor(user['role']),
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            PopupMenuButton<String>(
              onSelected: (value) {
                switch (value) {
                  case 'view':
                    _showUserDetails(user);
                    break;
                  case 'edit':
                    _showEditUserDialog(user);
                    break;
                  case 'delete':
                    _showDeleteConfirmation(user);
                    break;
                }
              },
              itemBuilder: (context) => [
                const PopupMenuItem(
                  value: 'view',
                  child: Row(
                    children: [
                      Icon(Icons.visibility),
                      SizedBox(width: 8),
                      Text('View Details'),
                    ],
                  ),
                ),
                const PopupMenuItem(
                  value: 'edit',
                  child: Row(
                    children: [
                      Icon(Icons.edit),
                      SizedBox(width: 8),
                      Text('Edit'),
                    ],
                  ),
                ),
                const PopupMenuItem(
                  value: 'delete',
                  child: Row(
                    children: [
                      Icon(Icons.delete, color: Colors.red),
                      SizedBox(width: 8),
                      Text('Delete', style: TextStyle(color: Colors.red)),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Color _getRoleColor(String role) {
    switch (role.toLowerCase()) {
      case 'admin':
        return AppTheme.primaryColor;
      case 'hr':
        return AppTheme.accentColor;
      case 'manager':
        return AppTheme.successColor;
      case 'employee':
        return AppTheme.secondaryColor;
      default:
        return AppTheme.secondaryColor;
    }
  }

  void _showUserDetails(Map<String, dynamic> user) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('User Details - ${user['name']}'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildDetailRow('Name', user['name']),
              _buildDetailRow('Email', user['email']),
              _buildDetailRow('Username', user['username']),
              _buildDetailRow('Role', user['role']),
              _buildDetailRow('Designation', user['designation']),
              _buildDetailRow('Department', user['department']),
              _buildDetailRow('CTC', user['ctc']?.toString() ?? 'Not set'),
              _buildDetailRow('Status', user['is_active'] ? 'Active' : 'Inactive'),
              _buildDetailRow('Last Login', user['last_login_at'] ?? 'Never'),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _showEditUserDialog(user);
            },
            child: const Text('Edit'),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              '$label:',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
          Expanded(
            child: Text(value.isEmpty ? 'Not set' : value),
          ),
        ],
      ),
    );
  }

  void _showAddUserDialog() {
    _showUserFormDialog();
  }

  void _showEditUserDialog(Map<String, dynamic> user) {
    _showUserFormDialog(user: user);
  }

  void _showUserFormDialog({Map<String, dynamic>? user}) {
    final isEditing = user != null;
    final formKey = GlobalKey<FormState>();
    
    final nameController = TextEditingController(text: user?['name'] ?? '');
    final emailController = TextEditingController(text: user?['email'] ?? '');
    final usernameController = TextEditingController(text: user?['username'] ?? '');
    final designationController = TextEditingController(text: user?['designation'] ?? '');
    final departmentController = TextEditingController(text: user?['department'] ?? '');
    final ctcController = TextEditingController(text: user?['ctc']?.toString() ?? '');
    final passwordController = TextEditingController();
    
    String selectedRole = user?['role'] ?? 'Employee';
    String selectedOrgId = user?['organization_id'] ?? (_organizations.isNotEmpty ? _organizations.first['id'] : '');
    bool isActive = user?['is_active'] ?? true;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: Text(isEditing ? 'Edit User' : 'Add New User'),
          content: SingleChildScrollView(
            child: Form(
              key: formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextFormField(
                    controller: nameController,
                    decoration: const InputDecoration(
                      labelText: 'Full Name',
                      prefixIcon: Icon(Icons.person),
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
                    controller: emailController,
                    decoration: const InputDecoration(
                      labelText: 'Email',
                      prefixIcon: Icon(Icons.email),
                    ),
                    keyboardType: TextInputType.emailAddress,
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Please enter email';
                      }
                      if (!value.contains('@')) {
                        return 'Please enter a valid email';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: usernameController,
                    decoration: const InputDecoration(
                      labelText: 'Username',
                      prefixIcon: Icon(Icons.account_circle),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Please enter username';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  if (!isEditing) ...[
                    TextFormField(
                      controller: passwordController,
                      decoration: const InputDecoration(
                        labelText: 'Password',
                        prefixIcon: Icon(Icons.lock),
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
                    const SizedBox(height: 16),
                  ],
                  DropdownButtonFormField<String>(
                    value: selectedRole,
                    decoration: const InputDecoration(
                      labelText: 'Role',
                      prefixIcon: Icon(Icons.work),
                    ),
                    items: ['Employee', 'HR', 'Admin'].map((role) {
                      return DropdownMenuItem<String>(
                        value: role,
                        child: Text(role),
                      );
                    }).toList(),
                    onChanged: (value) {
                      setState(() {
                        selectedRole = value!;
                      });
                    },
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: designationController,
                    decoration: const InputDecoration(
                      labelText: 'Designation',
                      prefixIcon: Icon(Icons.badge),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: departmentController,
                    decoration: const InputDecoration(
                      labelText: 'Department',
                      prefixIcon: Icon(Icons.business),
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
                    controller: ctcController,
                    decoration: const InputDecoration(
                      labelText: 'CTC (Annual)',
                      prefixIcon: Icon(Icons.attach_money),
                    ),
                    keyboardType: TextInputType.number,
                  ),
                  const SizedBox(height: 16),
                  if (_organizations.isNotEmpty) ...[
                    DropdownButtonFormField<String>(
                      value: selectedOrgId,
                      decoration: const InputDecoration(
                        labelText: 'Organization',
                        prefixIcon: Icon(Icons.business),
                      ),
                      items: _organizations.map((org) {
                        return DropdownMenuItem<String>(
                          value: org['id'].toString(),
                          child: Text(org['name'].toString()),
                        );
                      }).toList(),
                      onChanged: (value) {
                        setState(() {
                          selectedOrgId = value!;
                        });
                      },
                    ),
                    const SizedBox(height: 16),
                  ],
                  Row(
                    children: [
                      Checkbox(
                        value: isActive,
                        onChanged: (value) {
                          setState(() {
                            isActive = value!;
                          });
                        },
                      ),
                      const Text('Active'),
                    ],
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (formKey.currentState!.validate()) {
                  try {
                    final apiService = ref.read(apiServiceProvider);
                    final userData = {
                      'name': nameController.text,
                      'email': emailController.text,
                      'username': usernameController.text,
                      'role': selectedRole,
                      'designation': designationController.text,
                      'department': departmentController.text,
                      'organization_id': selectedOrgId,
                      'is_active': isActive,
                      if (ctcController.text.isNotEmpty) 'ctc': double.tryParse(ctcController.text),
                      if (!isEditing) 'password': passwordController.text,
                    };

                    if (isEditing) {
                      await apiService.updateUser(user!['id'], userData);
                    } else {
                      await apiService.createUser(userData);
                    }

                    Navigator.pop(context);
                    _loadData();
                    
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(isEditing ? 'User updated successfully' : 'User created successfully'),
                        backgroundColor: Colors.green,
                      ),
                    );
                  } catch (e) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Error: ${e.toString()}'),
                        backgroundColor: Colors.red,
                      ),
                    );
                  }
                }
              },
              child: Text(isEditing ? 'Update' : 'Create'),
            ),
          ],
        ),
      ),
    );
  }

  void _showDeleteConfirmation(Map<String, dynamic> user) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete User'),
        content: Text('Are you sure you want to delete ${user['name']}? This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              try {
                final apiService = ref.read(apiServiceProvider);
                await apiService.deleteUser(user['id']);
                
                Navigator.pop(context);
                _loadData();
                
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('User deleted successfully'),
                    backgroundColor: Colors.green,
                  ),
                );
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Error: ${e.toString()}'),
                    backgroundColor: Colors.red,
                  ),
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
}
