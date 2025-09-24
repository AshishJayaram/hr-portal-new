import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../shared/widgets/app_drawer.dart';
import '../../core/theme/app_theme.dart';

class TeamScreen extends ConsumerStatefulWidget {
  @override
  ConsumerState<TeamScreen> createState() => _TeamScreenState();
}

class _TeamScreenState extends ConsumerState<TeamScreen> {
  final List<Map<String, dynamic>> _allTeamMembers = [];

  List<Map<String, dynamic>> _filteredTeamMembers = [];
  String _searchQuery = '';
  String _selectedFilter = 'All';

  @override
  void initState() {
    super.initState();
    _filteredTeamMembers = _allTeamMembers;
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
                        member['name'][0],
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    title: Text(
                      member['name'],
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(member['role']),
                        Text(
                          member['department'],
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
                        member['status'],
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    onTap: () {
                      // TODO: Navigate to member details
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

  void _loadTeamMembers() {
    // TODO: Implement team members loading
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Team members refreshed')),
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
        final matchesSearch = _searchQuery.isEmpty ||
            member['name'].toLowerCase().contains(_searchQuery.toLowerCase()) ||
            member['role'].toLowerCase().contains(_searchQuery.toLowerCase()) ||
            member['department'].toLowerCase().contains(_searchQuery.toLowerCase());

        // Apply status/department filter
        bool matchesFilter = true;
        if (_selectedFilter != 'All') {
          matchesFilter = member['status'] == _selectedFilter ||
              member['department'] == _selectedFilter;
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
}
