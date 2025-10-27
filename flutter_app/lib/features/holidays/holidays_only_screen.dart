import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../shared/widgets/app_drawer.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/liquid_glass_theme.dart';
import '../../core/widgets/glass_components.dart';
import '../../core/providers/providers.dart';

class HolidaysOnlyScreen extends ConsumerStatefulWidget {
  @override
  ConsumerState<HolidaysOnlyScreen> createState() => _HolidaysOnlyScreenState();
}

class _HolidaysOnlyScreenState extends ConsumerState<HolidaysOnlyScreen> {
  final List<Map<String, dynamic>> _holidays = [];
  final List<int> _availableYears = [];
  int? _selectedYear;
  bool _isLoading = false;
  String _selectedFilter = 'All';

  @override
  void initState() {
    super.initState();
    _selectedYear = DateTime.now().year;
    _loadAvailableYears();
    _loadHolidays();
  }

  Future<void> _loadAvailableYears() async {
    try {
      final apiService = ref.read(apiServiceProvider);
      final years = await apiService.getAvailableHolidayYears();
      
      setState(() {
        _availableYears.clear();
        _availableYears.addAll(years.cast<int>());
        if (_availableYears.isNotEmpty && !_availableYears.contains(_selectedYear)) {
          _selectedYear = _availableYears.first;
        }
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to load available years: $e')),
      );
    }
  }

  Future<void> _loadHolidays() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final apiService = ref.read(apiServiceProvider);
      final holidays = await apiService.getHolidays();
      
      setState(() {
        _holidays.clear();
        _holidays.addAll(holidays);
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to load holidays: $e')),
      );
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  List<Map<String, dynamic>> get _filteredHolidays {
    if (_selectedFilter == 'All') {
      return _holidays;
    }
    return _holidays.where((holiday) => holiday['type'] == _selectedFilter.toLowerCase()).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: Builder(
          builder: (context) => IconButton(
            icon: const Icon(Icons.menu),
            onPressed: () => Scaffold.of(context).openDrawer(),
          ),
        ),
        title: const Text('Holidays'),
        actions: [
          Consumer(
            builder: (context, ref, child) {
              final authState = ref.watch(authProvider);
              final user = authState.user;
              final canCreateHoliday = user?.role == 'HR' || user?.role == 'Admin' || user?.role == 'God';
              
              if (canCreateHoliday) {
                return IconButton(
                  icon: const Icon(Icons.add),
                  onPressed: () {
                    context.go('/holidays/add');
                  },
                );
              }
              return const SizedBox.shrink();
            },
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadHolidays,
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
          // Year selector and filters
          Container(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                // Year selector
                Row(
                  children: [
                    Text(
                      'Year: ',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Expanded(
                      child: DropdownButton<int>(
                        value: _selectedYear,
                        isExpanded: true,
                        items: _availableYears.map((year) {
                          return DropdownMenuItem<int>(
                            value: year,
                            child: Text(year.toString()),
                          );
                        }).toList(),
                        onChanged: (year) {
                          setState(() {
                            _selectedYear = year;
                          });
                          _loadHolidays();
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                
                // Filter chips
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildFilterChip('All'),
                      _buildFilterChip('Holiday'),
                      _buildFilterChip('Event'),
                      _buildFilterChip('Notice'),
                    ],
                  ),
                ),
              ],
            ),
          ),
          
          // Content
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: Colors.white))
                : _filteredHolidays.isEmpty
                    ? GlassCard(
                        backgroundColor: Colors.white.withOpacity(0.1),
                        child: const Padding(
                          padding: EdgeInsets.all(24),
                          child: Text('No holidays found', style: TextStyle(color: Colors.white70)),
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _filteredHolidays.length,
                        itemBuilder: (context, index) {
                          final holiday = _filteredHolidays[index];
                          return _buildHolidayCard(holiday);
                        },
                      ),
          ),
        ],
      ),
        ),
      ),
    );
  }

  Widget _buildFilterChip(String label) {
    final isSelected = _selectedFilter == label;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: FilterChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (selected) {
          setState(() {
            _selectedFilter = label;
          });
        },
        selectedColor: AppTheme.primaryColor.withOpacity(0.3),
        checkmarkColor: AppTheme.primaryColor,
      ),
    );
  }

  Widget _buildHolidayCard(Map<String, dynamic> holiday) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    holiday['name'] ?? 'Untitled',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                _buildTypeChip(holiday['type'] ?? 'holiday'),
              ],
            ),
            
            const SizedBox(height: 8),
            
            Row(
              children: [
                Icon(Icons.calendar_today, size: 16, color: Colors.grey[600]),
                const SizedBox(width: 4),
                Text(
                  _formatDate(holiday['date']),
                  style: TextStyle(color: Colors.grey[600]),
                ),
              ],
            ),
            
            if (holiday['description'] != null && holiday['description'].isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                holiday['description'],
                style: TextStyle(color: Colors.grey[700]),
              ),
            ],
            
            const SizedBox(height: 12),
            
            Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.edit),
                  onPressed: () {
                    _showEditHolidayDialog(holiday);
                  },
                ),
                IconButton(
                  icon: const Icon(Icons.delete, color: Colors.red),
                  onPressed: () {
                    _showDeleteConfirmation(holiday);
                  },
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTypeChip(String type) {
    Color color;
    String label;
    
    switch (type.toLowerCase()) {
      case 'holiday':
        color = AppTheme.holidayRed;
        label = 'Holiday';
        break;
      case 'event':
        color = AppTheme.eventPink;
        label = 'Event';
        break;
      case 'notice':
        color = AppTheme.noticePurple;
        label = 'Notice';
        break;
      default:
        color = Colors.grey;
        label = 'Unknown';
    }
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  void _showEditHolidayDialog(Map<String, dynamic> holiday) {
    final nameController = TextEditingController(text: holiday['name'] ?? '');
    final descriptionController = TextEditingController(text: holiday['description'] ?? '');
    final dateController = TextEditingController(text: (holiday['date'] ?? '').toString());
    final isRange = (holiday['date_range'] ?? '').toString().contains(' to ');
    final startDateController = TextEditingController(text: isRange ? (holiday['date_range'] as String).split(' to ')[0] : dateController.text);
    final endDateController = TextEditingController(text: isRange ? (holiday['date_range'] as String).split(' to ')[1] : dateController.text);

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Edit Holiday'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: const InputDecoration(labelText: 'Name'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: descriptionController,
                decoration: const InputDecoration(labelText: 'Description'),
                maxLines: 3,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: startDateController,
                      decoration: const InputDecoration(labelText: 'Start Date (YYYY-MM-DD)'),
                      readOnly: true,
                      onTap: () async {
                        final date = await showDatePicker(
                          context: context,
                          initialDate: DateTime.tryParse(startDateController.text) ?? DateTime.now(),
                          firstDate: DateTime(2020),
                          lastDate: DateTime(2030),
                        );
                        if (date != null) {
                          startDateController.text = date.toIso8601String().split('T')[0];
                        }
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: endDateController,
                      decoration: const InputDecoration(labelText: 'End Date (YYYY-MM-DD)'),
                      readOnly: true,
                      onTap: () async {
                        final start = DateTime.tryParse(startDateController.text);
                        final date = await showDatePicker(
                          context: context,
                          initialDate: start ?? DateTime.now(),
                          firstDate: start ?? DateTime(2020),
                          lastDate: DateTime(2030),
                        );
                        if (date != null) {
                          endDateController.text = date.toIso8601String().split('T')[0];
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
            onPressed: () async {
              try {
                final apiService = ref.read(apiServiceProvider);
                final payload = {
                  'name': nameController.text,
                  'description': descriptionController.text,
                  if (startDateController.text.isNotEmpty && endDateController.text.isNotEmpty)
                    'date_range': '${startDateController.text} to ${endDateController.text}'
                  else if (startDateController.text.isNotEmpty)
                    'date': startDateController.text,
                };
                await apiService.updateHoliday(holiday['id'].toString(), payload);
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Holiday updated')),
                );
                _loadHolidays();
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Failed to update holiday: $e')),
                );
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  void _showDeleteConfirmation(Map<String, dynamic> holiday) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Holiday'),
        content: Text('Are you sure you want to delete "${holiday['name']}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              try {
                final apiService = ref.read(apiServiceProvider);
                final success = await apiService.deleteHoliday(holiday['id'].toString());
                
                if (success) {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Holiday deleted successfully')),
                  );
                  _loadHolidays();
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Failed to delete holiday')),
                  );
                }
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Failed to delete holiday: $e')),
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
    if (dateString == null) return 'No date';
    try {
      final date = DateTime.parse(dateString);
      return '${date.day}/${date.month}/${date.year}';
    } catch (e) {
      return dateString;
    }
  }
}
