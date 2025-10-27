import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../shared/widgets/app_drawer.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/liquid_glass_theme.dart';
import '../../core/widgets/glass_components.dart';
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
  List<String> _suggestedFilters = ['All'];
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadTeamMembers();
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
          'Team',
          style: LiquidGlassTheme.heading4.copyWith(
            color: Colors.white,
            fontWeight: FontWeight.w600,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadTeamMembers,
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
                // Removed chips row under search
                const SizedBox.shrink(),
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
                return GlassCard(
                  backgroundColor: Colors.white.withOpacity(0.1),
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: Colors.white.withOpacity(0.2),
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
                      style: LiquidGlassTheme.bodyMedium.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    subtitle: Text(
                      member['designation'] ?? member['department'] ?? '',
                      style: LiquidGlassTheme.bodySmall.copyWith(color: Colors.white70),
                    ),
                    trailing: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: (member['status'] == 'Active'
                                ? LiquidGlassTheme.accentGreen
                                : LiquidGlassTheme.secondaryOrange)
                            .withOpacity(0.2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        (member['department'] ?? '').toString().isEmpty
                            ? '—'
                            : (member['department'] as String),
                        style: LiquidGlassTheme.caption.copyWith(color: Colors.white, fontWeight: FontWeight.w600),
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
        ),
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
        final designation = (member['designation'] ?? '').toString().toLowerCase();
        final status = (member['status'] ?? '').toString().toLowerCase();
        
        final matchesSearch = _searchQuery.isEmpty ||
            name.contains(_searchQuery.toLowerCase()) ||
            role.contains(_searchQuery.toLowerCase()) ||
            department.contains(_searchQuery.toLowerCase()) ||
            designation.contains(_searchQuery.toLowerCase());

        // Apply status/department filter
        bool matchesFilter = true;
        if (_selectedFilter != 'All') {
          final dept = (member['department'] ?? '').toString();
          final rl = (member['role'] ?? '').toString();
          final des = (member['designation'] ?? '').toString();
          matchesFilter =
              status == _selectedFilter.toLowerCase() ||
              dept == _selectedFilter ||
              rl == _selectedFilter ||
              des == _selectedFilter;
        }

        return matchesSearch && matchesFilter;
      }).toList();
    });
  }

  void _showFilterOptions() {
    final Set<String> allFilters = {
      'All',
      ..._allTeamMembers.map((m) => (m['status'] ?? '').toString()).where((s) => s.isNotEmpty),
      ..._allTeamMembers.map((m) => (m['department'] ?? '').toString()).where((s) => s.isNotEmpty),
      ..._allTeamMembers.map((m) => (m['role'] ?? '').toString()).where((s) => s.isNotEmpty),
      ..._allTeamMembers.map((m) => (m['designation'] ?? '').toString()).where((s) => s.isNotEmpty),
    };
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Filter Options'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              height: 300,
              width: 400,
              child: ListView(
                children: allFilters.map((label) {
                  return ListTile(
                    title: Text(label),
                    onTap: () {
                      setState(() {
                        _selectedFilter = label;
                        _applyFilters();
                      });
                      Navigator.pop(context);
                    },
                  );
                }).toList(),
              ),
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
      _computeSuggestedFilters();
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

  void _computeSuggestedFilters() {
    final Map<String, int> counts = {};
    for (final m in _allTeamMembers) {
      for (final key in ['status', 'department', 'role', 'designation']) {
        final v = (m[key] ?? '').toString().trim();
        if (v.isNotEmpty) counts[v] = (counts[v] ?? 0) + 1;
      }
    }
    final sorted = counts.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    final top = sorted.take(9).map((e) => e.key).toList();
    setState(() {
      _suggestedFilters = ['All', ...top];
      if (!_suggestedFilters.contains(_selectedFilter)) {
        _selectedFilter = 'All';
      }
    });
  }
}
