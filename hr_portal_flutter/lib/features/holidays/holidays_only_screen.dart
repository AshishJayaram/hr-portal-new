import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../shared/widgets/app_drawer.dart';
import '../../core/theme/app_theme.dart';
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
      appBar: AppBar(
        title: const Text('Holidays'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () {
              context.go('/holidays/add');
            },
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadHolidays,
          ),
        ],
      ),
      drawer: const AppDrawer(),
      body: Column(
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
                ? const Center(child: CircularProgressIndicator())
                : _filteredHolidays.isEmpty
                    ? const Center(
                        child: Text(
                          'No holidays found',
                          style: TextStyle(fontSize: 16, color: Colors.grey),
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
    // TODO: Implement edit holiday dialog
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Edit holiday functionality coming soon')),
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
