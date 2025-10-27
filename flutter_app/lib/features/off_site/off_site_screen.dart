import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../shared/widgets/app_drawer.dart';
import '../../core/theme/app_theme.dart';
import '../../core/services/api_service.dart';
import '../../core/providers/providers.dart';
import '../../core/theme/liquid_glass_theme.dart';
import '../../core/widgets/glass_components.dart';

class OffSiteScreen extends ConsumerStatefulWidget {
  @override
  ConsumerState<OffSiteScreen> createState() => _OffSiteScreenState();
}

class _OffSiteScreenState extends ConsumerState<OffSiteScreen> {
  final List<Map<String, dynamic>> _offSites = [];
  bool _isLoading = false;
  String _selectedFilter = 'All';

  @override
  void initState() {
    super.initState();
    _loadOffSites();
  }

  Future<void> _loadOffSites() async {
    setState(() { _isLoading = true; });
    try {
      final apiService = ref.read(apiServiceProvider);
      final offSites = await apiService.getOffSites();
      setState(() {
        _offSites..clear()..addAll(offSites);
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to load off-site entries: $e')));
    } finally {
      setState(() { _isLoading = false; });
    }
  }

  List<Map<String, dynamic>> get _filteredOffSites {
    if (_selectedFilter == 'All') return _offSites;
    return _offSites.where((offSite) => offSite['status'] == _selectedFilter.toLowerCase()).toList();
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
        title: Text('Off-site Tracker', style: LiquidGlassTheme.heading4.copyWith(color: Colors.white, fontWeight: FontWeight.w600)),
        actions: [
          IconButton(icon: const Icon(Icons.add), onPressed: _showAddOffSiteDialog),
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadOffSites),
        ],
      ),
      drawer: const AppDrawer(),
      body: Container(
        decoration: BoxDecoration(gradient: LiquidGlassTheme.darkPrimaryGradient),
        child: SafeArea(
          child: Column(
            children: [
              // Filter Tabs
              SizedBox(
                height: 50,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: [
                    _buildFilterChip('All', true),
                    _buildFilterChip('Planned', false),
                    _buildFilterChip('In Progress', false),
                    _buildFilterChip('Completed', false),
                    _buildFilterChip('Cancelled', false),
                  ],
                ),
              ),
              // Content
              Expanded(
                child: _isLoading
                    ? const Center(child: CircularProgressIndicator(color: Colors.white))
                    : _filteredOffSites.isEmpty
                        ? GlassCard(
                            backgroundColor: Colors.white.withOpacity(0.1),
                            child: const Padding(
                              padding: EdgeInsets.all(24),
                              child: Text('No off-site entries found', style: TextStyle(color: Colors.white70)),
                            ),
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.all(16),
                            itemCount: _filteredOffSites.length,
                            itemBuilder: (context, index) {
                              final offSite = _filteredOffSites[index];
                              return _buildOffSiteCard(offSite);
                            },
                          ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFilterChip(String label, bool isSelected) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: FilterChip(
        label: Text(label, style: const TextStyle(color: Colors.white)),
        selected: isSelected,
        onSelected: (selected) { setState(() { _selectedFilter = label; }); },
        selectedColor: Colors.white.withOpacity(0.2),
        checkmarkColor: Colors.white,
        backgroundColor: Colors.white.withOpacity(0.1),
      ),
    );
  }

  Widget _buildOffSiteCard(Map<String, dynamic> offSite) {
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
                    offSite['title'] ?? 'Untitled',
                    style: LiquidGlassTheme.bodyLarge.copyWith(color: Colors.white, fontWeight: FontWeight.w700),
                  ),
                ),
                _buildStatusChip(offSite['status'] ?? 'planned'),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.calendar_today, size: 16, color: Colors.white70),
                const SizedBox(width: 4),
                Text(
                  '${_formatDate(offSite['start_date'])} - ${_formatDate(offSite['end_date'])}',
                  style: LiquidGlassTheme.bodySmall.copyWith(color: Colors.white70),
                ),
              ],
            ),
            if (offSite['location'] != null && offSite['location'].isNotEmpty) ...[
              const SizedBox(height: 4),
              Row(
                children: [
                  const Icon(Icons.location_on, size: 16, color: Colors.white70),
                  const SizedBox(width: 4),
                  Text(offSite['location'], style: LiquidGlassTheme.bodySmall.copyWith(color: Colors.white70)),
                ],
              ),
            ],
            if (offSite['description'] != null && offSite['description'].isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(offSite['description'], style: LiquidGlassTheme.bodySmall.copyWith(color: Colors.white70)),
            ],
            const SizedBox(height: 12),
            Row(
              children: [
                _buildTypeChip(offSite['type'] ?? 'other'),
                const Spacer(),
                IconButton(icon: const Icon(Icons.edit, color: Colors.white70), onPressed: () => _showEditOffSiteDialog(offSite)),
                IconButton(icon: const Icon(Icons.delete, color: Colors.redAccent), onPressed: () => _showDeleteConfirmation(offSite)),
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
      case 'planned':
        color = LiquidGlassTheme.accentBlue;
        label = 'Planned';
        break;
      case 'in_progress':
        color = LiquidGlassTheme.secondaryOrange;
        label = 'In Progress';
        break;
      case 'completed':
        color = LiquidGlassTheme.accentGreen;
        label = 'Completed';
        break;
      case 'cancelled':
        color = LiquidGlassTheme.accentRed;
        label = 'Cancelled';
        break;
      default:
        color = Colors.white70;
        label = 'Unknown';
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: color.withOpacity(0.2), borderRadius: BorderRadius.circular(12), border: Border.all(color: color.withOpacity(0.3))),
      child: Text(label, style: LiquidGlassTheme.caption.copyWith(color: Colors.white, fontWeight: FontWeight.w600)),
    );
  }

  Widget _buildTypeChip(String type) {
    String label; IconData icon;
    switch (type.toLowerCase()) {
      case 'training': label = 'Training'; icon = Icons.school; break;
      case 'meeting': label = 'Meeting'; icon = Icons.meeting_room; break;
      case 'conference': label = 'Conference'; icon = Icons.business; break;
      case 'client_visit': label = 'Client Visit'; icon = Icons.handshake; break;
      default: label = 'Other'; icon = Icons.work; 
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: Colors.white.withOpacity(0.12), borderRadius: BorderRadius.circular(12)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 14, color: Colors.white70),
        const SizedBox(width: 4),
        Text(label, style: LiquidGlassTheme.caption.copyWith(color: Colors.white, fontWeight: FontWeight.w600)),
      ]),
    );
  }

  void _showAddOffSiteDialog() {
    final titleController = TextEditingController();
    final descriptionController = TextEditingController();
    final locationController = TextEditingController();
    String selectedType = 'training';
    String selectedStatus = 'planned';
    DateTime? startDate;
    DateTime? endDate;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Add Off-site Entry'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: titleController,
                  decoration: const InputDecoration(
                    labelText: 'Title',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: descriptionController,
                  decoration: const InputDecoration(
                    labelText: 'Description',
                    border: OutlineInputBorder(),
                  ),
                  maxLines: 3,
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: locationController,
                  decoration: const InputDecoration(
                    labelText: 'Location',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  value: selectedType,
                  decoration: const InputDecoration(
                    labelText: 'Type',
                    border: OutlineInputBorder(),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'training', child: Text('Training')),
                    DropdownMenuItem(value: 'meeting', child: Text('Meeting')),
                    DropdownMenuItem(value: 'conference', child: Text('Conference')),
                    DropdownMenuItem(value: 'client_visit', child: Text('Client Visit')),
                    DropdownMenuItem(value: 'other', child: Text('Other')),
                  ],
                  onChanged: (value) {
                    setState(() {
                      selectedType = value!;
                    });
                  },
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  value: selectedStatus,
                  decoration: const InputDecoration(
                    labelText: 'Status',
                    border: OutlineInputBorder(),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'planned', child: Text('Planned')),
                    DropdownMenuItem(value: 'in_progress', child: Text('In Progress')),
                    DropdownMenuItem(value: 'completed', child: Text('Completed')),
                    DropdownMenuItem(value: 'cancelled', child: Text('Cancelled')),
                  ],
                  onChanged: (value) {
                    setState(() {
                      selectedStatus = value!;
                    });
                  },
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: ListTile(
                        title: Text(startDate != null 
                            ? 'Start: ${_formatDate(startDate.toString())}' 
                            : 'Select Start Date'),
                        trailing: const Icon(Icons.calendar_today),
                        onTap: () async {
                          final date = await showDatePicker(
                            context: context,
                            initialDate: DateTime.now(),
                            firstDate: DateTime.now().subtract(const Duration(days: 365)),
                            lastDate: DateTime.now().add(const Duration(days: 365)),
                          );
                          if (date != null) {
                            setState(() {
                              startDate = date;
                            });
                          }
                        },
                      ),
                    ),
                  ],
                ),
                Row(
                  children: [
                    Expanded(
                      child: ListTile(
                        title: Text(endDate != null 
                            ? 'End: ${_formatDate(endDate.toString())}' 
                            : 'Select End Date'),
                        trailing: const Icon(Icons.calendar_today),
                        onTap: () async {
                          final date = await showDatePicker(
                            context: context,
                            initialDate: startDate ?? DateTime.now(),
                            firstDate: startDate ?? DateTime.now().subtract(const Duration(days: 365)),
                            lastDate: DateTime.now().add(const Duration(days: 365)),
                          );
                          if (date != null) {
                            setState(() {
                              endDate = date;
                            });
                          }
                        },
                      ),
                    ),
                  ],
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
              onPressed: startDate != null && endDate != null
                  ? () async {
                      try {
                        final apiService = ref.read(apiServiceProvider);
                        final currentUser = await apiService.getCurrentUser();
                        
                        if (currentUser != null) {
                          final offSiteData = {
                            'title': titleController.text.trim(),
                            'description': descriptionController.text.trim(),
                            'location': locationController.text.trim(),
                            'type': selectedType,
                            'status': selectedStatus,
                            'start_date': startDate!.toIso8601String(),
                            'end_date': endDate!.toIso8601String(),
                            'user_id': currentUser['id'].toString(),
                          };
                          
                          final result = await apiService.createOffSite(offSiteData);
                          
                          if (result != null) {
                            Navigator.pop(context);
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Off-site entry created successfully')),
                            );
                            _loadOffSites();
                          } else {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Failed to create off-site entry')),
                            );
                          }
                        }
                      } catch (e) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Failed to create off-site entry: $e')),
                        );
                      }
                    }
                  : null,
              child: const Text('Create'),
            ),
          ],
        ),
      ),
    );
  }

  void _showEditOffSiteDialog(Map<String, dynamic> offSite) {
    // Pre-fill form with existing data
    final titleController = TextEditingController(text: offSite['title'] ?? '');
    final descriptionController = TextEditingController(text: offSite['description'] ?? '');
    final locationController = TextEditingController(text: offSite['location'] ?? '');
    final startDateController = TextEditingController(text: offSite['start_date'] ?? '');
    final endDateController = TextEditingController(text: offSite['end_date'] ?? '');
    
    String selectedType = offSite['type'] ?? 'training';
    String selectedStatus = offSite['status'] ?? 'planned';

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Edit Off-site Entry'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: titleController,
                  decoration: const InputDecoration(
                    labelText: 'Title',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: descriptionController,
                  decoration: const InputDecoration(
                    labelText: 'Description',
                    border: OutlineInputBorder(),
                  ),
                  maxLines: 3,
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: locationController,
                  decoration: const InputDecoration(
                    labelText: 'Location',
                    border: OutlineInputBorder(),
                  ),
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
                      firstDate: DateTime.now().subtract(const Duration(days: 365)),
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
                      initialDate: DateTime.now(),
                      firstDate: DateTime.now().subtract(const Duration(days: 365)),
                      lastDate: DateTime.now().add(const Duration(days: 365)),
                    );
                    if (date != null) {
                      endDateController.text = '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
                    }
                  },
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  value: selectedType,
                  decoration: const InputDecoration(
                    labelText: 'Type',
                    border: OutlineInputBorder(),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'training', child: Text('Training')),
                    DropdownMenuItem(value: 'meeting', child: Text('Meeting')),
                    DropdownMenuItem(value: 'conference', child: Text('Conference')),
                    DropdownMenuItem(value: 'client_visit', child: Text('Client Visit')),
                    DropdownMenuItem(value: 'other', child: Text('Other')),
                  ],
                  onChanged: (value) {
                    setState(() {
                      selectedType = value!;
                    });
                  },
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  value: selectedStatus,
                  decoration: const InputDecoration(
                    labelText: 'Status',
                    border: OutlineInputBorder(),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'planned', child: Text('Planned')),
                    DropdownMenuItem(value: 'in_progress', child: Text('In Progress')),
                    DropdownMenuItem(value: 'completed', child: Text('Completed')),
                    DropdownMenuItem(value: 'cancelled', child: Text('Cancelled')),
                  ],
                  onChanged: (value) {
                    setState(() {
                      selectedStatus = value!;
                    });
                  },
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
              onPressed: titleController.text.isNotEmpty && 
                         startDateController.text.isNotEmpty && 
                         endDateController.text.isNotEmpty
                  ? () async {
                      try {
                        final apiService = ref.read(apiServiceProvider);
                        await apiService.updateOffSite(offSite['id'].toString(), {
                          'title': titleController.text,
                          'description': descriptionController.text,
                          'location': locationController.text,
                          'start_date': startDateController.text,
                          'end_date': endDateController.text,
                          'type': selectedType,
                          'status': selectedStatus,
                        });
                        
                        Navigator.pop(context);
                        _loadOffSites();
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Off-site entry updated successfully!')),
                        );
                      } catch (e) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Failed to update off-site entry: $e')),
                        );
                      }
                    }
                  : null,
              child: const Text('Update'),
            ),
          ],
        ),
      ),
    );
  }

  void _showDeleteConfirmation(Map<String, dynamic> offSite) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Off-site Entry'),
        content: Text('Are you sure you want to delete "${offSite['title']}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              try {
                final apiService = ref.read(apiServiceProvider);
                final success = await apiService.deleteOffSite(offSite['id'].toString());
                
                if (success) {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Off-site entry deleted successfully')),
                  );
                  _loadOffSites();
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Failed to delete off-site entry')),
                  );
                }
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Failed to delete off-site entry: $e')),
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
    if (dateString == null) return '';
    try {
      final date = DateTime.parse(dateString);
      return '${date.day}/${date.month}/${date.year}';
    } catch (e) {
      return dateString;
    }
  }
}
