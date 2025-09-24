import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers/providers.dart';
import '../../core/services/api_service.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/app_drawer.dart';

class OrganizationManagementScreen extends ConsumerStatefulWidget {
  @override
  ConsumerState<OrganizationManagementScreen> createState() => _OrganizationManagementScreenState();
}

class _OrganizationManagementScreenState extends ConsumerState<OrganizationManagementScreen> {
  final List<Map<String, dynamic>> _organizations = [];
  bool _isLoading = false;
  String _searchQuery = '';

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
      final organizations = await apiService.getOrganizations();
      
      setState(() {
        _organizations.clear();
        _organizations.addAll(organizations);
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to load organizations: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  List<Map<String, dynamic>> get _filteredOrganizations {
    var filtered = _organizations.where((org) {
      return _searchQuery.isEmpty ||
          org['name'].toString().toLowerCase().contains(_searchQuery.toLowerCase()) ||
          org['domain'].toString().toLowerCase().contains(_searchQuery.toLowerCase());
    }).toList();

    // Sort by name
    filtered.sort((a, b) => a['name'].toString().compareTo(b['name'].toString()));
    
    return filtered;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Organization Management'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _showAddOrganizationDialog(),
          ),
        ],
      ),
      drawer: const AppDrawer(),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // Search Bar
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: TextField(
                    decoration: InputDecoration(
                      hintText: 'Search organizations...',
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
                ),
                // Organizations List
                Expanded(
                  child: _filteredOrganizations.isEmpty
                      ? const Center(
                          child: Text(
                            'No organizations found',
                            style: TextStyle(fontSize: 16),
                          ),
                        )
                      : ListView.builder(
                          itemCount: _filteredOrganizations.length,
                          itemBuilder: (context, index) {
                            final org = _filteredOrganizations[index];
                            return _buildOrganizationCard(org);
                          },
                        ),
                ),
              ],
            ),
    );
  }

  Widget _buildOrganizationCard(Map<String, dynamic> org) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: AppTheme.primaryColor.withOpacity(0.2),
          child: Text(
            org['name'].toString().isNotEmpty 
                ? org['name'][0].toUpperCase() 
                : 'O',
            style: TextStyle(
              color: AppTheme.primaryColor,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        title: Text(
          org['name'] ?? 'Unknown Organization',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Domain: ${org['domain'] ?? 'Not set'}'),
            Text(
              'Status: ${org['is_active'] ? 'Active' : 'Inactive'}',
              style: TextStyle(
                color: org['is_active'] ? Colors.green : Colors.red,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        trailing: PopupMenuButton<String>(
          onSelected: (value) {
            switch (value) {
              case 'view':
                _showOrganizationDetails(org);
                break;
              case 'edit':
                _showEditOrganizationDialog(org);
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
          ],
        ),
      ),
    );
  }

  void _showOrganizationDetails(Map<String, dynamic> org) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Organization Details - ${org['name']}'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildDetailRow('Name', org['name']),
              _buildDetailRow('Domain', org['domain']),
              _buildDetailRow('Status', org['is_active'] ? 'Active' : 'Inactive'),
              _buildDetailRow('Created', org['created_at'] ?? 'Unknown'),
              _buildDetailRow('Settings', org['settings'] ?? 'No custom settings'),
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
              _showEditOrganizationDialog(org);
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

  void _showAddOrganizationDialog() {
    _showOrganizationFormDialog();
  }

  void _showEditOrganizationDialog(Map<String, dynamic> org) {
    _showOrganizationFormDialog(organization: org);
  }

  void _showOrganizationFormDialog({Map<String, dynamic>? organization}) {
    final isEditing = organization != null;
    final formKey = GlobalKey<FormState>();
    
    final nameController = TextEditingController(text: organization?['name'] ?? '');
    final domainController = TextEditingController(text: organization?['domain'] ?? '');
    final settingsController = TextEditingController(text: organization?['settings'] ?? '');
    
    bool isActive = organization?['is_active'] ?? true;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: Text(isEditing ? 'Edit Organization' : 'Add New Organization'),
          content: SingleChildScrollView(
            child: Form(
              key: formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextFormField(
                    controller: nameController,
                    decoration: const InputDecoration(
                      labelText: 'Organization Name',
                      prefixIcon: Icon(Icons.business),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Please enter organization name';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: domainController,
                    decoration: const InputDecoration(
                      labelText: 'Domain',
                      prefixIcon: Icon(Icons.language),
                      hintText: 'e.g., company.com',
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Please enter domain';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: settingsController,
                    decoration: const InputDecoration(
                      labelText: 'Settings (JSON)',
                      prefixIcon: Icon(Icons.settings),
                      hintText: 'Optional JSON settings',
                    ),
                    maxLines: 3,
                  ),
                  const SizedBox(height: 16),
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
                    final orgData = {
                      'name': nameController.text,
                      'domain': domainController.text,
                      'is_active': isActive,
                      if (settingsController.text.isNotEmpty) 'settings': settingsController.text,
                    };

                    if (isEditing) {
                      // Note: Update organization endpoint might not exist in backend
                      // This would need to be implemented in the backend
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Organization update not implemented yet'),
                          backgroundColor: Colors.orange,
                        ),
                      );
                    } else {
                      await apiService.createOrganization(orgData);
                    }

                    Navigator.pop(context);
                    _loadData();
                    
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(isEditing ? 'Organization updated successfully' : 'Organization created successfully'),
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
}
