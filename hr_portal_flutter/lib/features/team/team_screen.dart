import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../shared/widgets/app_drawer.dart';
import '../../core/theme/app_theme.dart';
import '../../core/services/api_service.dart';
import '../../core/providers/providers.dart';

class TeamScreen extends ConsumerStatefulWidget {
  @override
  ConsumerState<TeamScreen> createState() => _TeamScreenState();
}

class _TeamScreenState extends ConsumerState<TeamScreen> {
  final List<Map<String, dynamic>> _allTeamMembers = [];
  List<Map<String, dynamic>> _filteredTeamMembers = [];
  String _searchQuery = '';
  String _selectedFilter = 'All';
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadTeamMembers();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Team'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadTeamMembers,
          ),
        ],
      ),
      drawer: const AppDrawer(),
      body: Column(
        children: [
          // Search and Filter Bar
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        decoration: InputDecoration(
                          hintText: 'Search team members...',
                          prefixIcon: const Icon(Icons.search),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        onChanged: (value) {
                          setState(() {
                            _searchQuery = value;
                            _applyFilters();
                          });
                        },
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton(
                      onPressed: () {
                        _showFilterOptions();
                      },
                      icon: const Icon(Icons.filter_list),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                // Filter Chips
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildFilterChip('All', 'All'),
                      _buildFilterChip('Active', 'Active'),
                      _buildFilterChip('On Leave', 'On Leave'),
                      _buildFilterChip('Engineering', 'Engineering'),
                      _buildFilterChip('Design', 'Design'),
                    ],
                  ),
                ),
              ],
            ),
          ),
          
          // Team Members List
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _filteredTeamMembers.length,
              itemBuilder: (context, index) {
                final member = _filteredTeamMembers[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: AppTheme.primaryColor,
                      child: Text(
                        (member['name'] ?? 'U')[0],
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    title: Text(
                      member['name'] ?? 'Unknown',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(member['role'] ?? 'Unknown Role'),
                        Text(
                          member['department'] ?? 'Unknown Department',
                          style: TextStyle(
                            color: AppTheme.secondaryColor,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                    trailing: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: member['status'] == 'Active' 
                            ? AppTheme.successColor 
                            : AppTheme.warningColor,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        member['status'] ?? 'Unknown',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    onTap: () {
                      _showMemberDetails(member);
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


  Widget _buildFilterChip(String label, String value) {
    final isSelected = _selectedFilter == value;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (selected) {
          setState(() {
            _selectedFilter = value;
            _applyFilters();
          });
        },
        selectedColor: AppTheme.primaryColor.withOpacity(0.2),
        checkmarkColor: AppTheme.primaryColor,
      ),
    );
  }

  void _applyFilters() {
    setState(() {
      _filteredTeamMembers = _allTeamMembers.where((member) {
        // Apply search filter
        final name = (member['name'] ?? '').toString().toLowerCase();
        final role = (member['role'] ?? '').toString().toLowerCase();
        final department = (member['department'] ?? '').toString().toLowerCase();
        
        final matchesSearch = _searchQuery.isEmpty ||
            name.contains(_searchQuery.toLowerCase()) ||
            role.contains(_searchQuery.toLowerCase()) ||
            department.contains(_searchQuery.toLowerCase());

        // Apply status/department filter
        bool matchesFilter = true;
        if (_selectedFilter != 'All') {
          final status = member['status'] ?? '';
          final dept = member['department'] ?? '';
          matchesFilter = status == _selectedFilter || dept == _selectedFilter;
        }

        return matchesSearch && matchesFilter;
      }).toList();
    });
  }

  void _showFilterOptions() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Filter Options'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              title: const Text('All'),
              onTap: () {
                setState(() {
                  _selectedFilter = 'All';
                  _applyFilters();
                });
                Navigator.pop(context);
              },
            ),
            ListTile(
              title: const Text('Active Only'),
              onTap: () {
                setState(() {
                  _selectedFilter = 'Active';
                  _applyFilters();
                });
                Navigator.pop(context);
              },
            ),
            ListTile(
              title: const Text('On Leave Only'),
              onTap: () {
                setState(() {
                  _selectedFilter = 'On Leave';
                  _applyFilters();
                });
                Navigator.pop(context);
              },
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  void _showMemberDetails(Map<String, dynamic> member) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(member['name'] ?? 'Team Member Details'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildDetailRow('Name', member['name'] ?? 'N/A'),
              _buildDetailRow('Email', member['email'] ?? 'N/A'),
              _buildDetailRow('Designation', member['designation'] ?? 'N/A'),
              _buildDetailRow('Department', member['department'] ?? 'N/A'),
              _buildDetailRow('Role', member['role'] ?? 'N/A'),
              _buildDetailRow('Status', member['status'] ?? 'N/A'),
              if (member['manager'] != null)
                _buildDetailRow('Manager', member['manager']['name'] ?? 'N/A'),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
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
            width: 80,
            child: Text(
              '$label:',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
          Expanded(
            child: Text(value),
          ),
        ],
      ),
    );
  }

  Future<void> _loadTeamMembers() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final apiService = ref.read(apiServiceProvider);
      final teamMembers = await apiService.getTeam();
      
      setState(() {
        _allTeamMembers.clear();
        _allTeamMembers.addAll(teamMembers);
        _applyFilters();
        _isLoading = false;
      });
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Team members refreshed')),
      );
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to load team members: $e')),
      );
    }
  }
}
