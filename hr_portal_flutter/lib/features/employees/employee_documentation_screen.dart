import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

class EmployeeDocumentationScreen extends ConsumerStatefulWidget {
  final String userId;
  final String userName;

  const EmployeeDocumentationScreen({
    super.key,
    required this.userId,
    required this.userName,
  });

  @override
  ConsumerState<EmployeeDocumentationScreen> createState() => _EmployeeDocumentationScreenState();
}

class _EmployeeDocumentationScreenState extends ConsumerState<EmployeeDocumentationScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  String _selectedType = '';
  DateTime? _selectedDate;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _selectDate() async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );
    if (picked != null && picked != _selectedDate) {
      setState(() {
        _selectedDate = picked;
      });
    }
  }

  void _showAddGrowthForm() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
        ),
        child: Container(
          padding: const EdgeInsets.all(16),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Add Growth Record',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  value: _selectedType.isEmpty ? null : _selectedType,
                  decoration: const InputDecoration(
                    labelText: 'Type *',
                    border: OutlineInputBorder(),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'promotion', child: Text('Promotion')),
                    DropdownMenuItem(value: 'skill_development', child: Text('Skill Development')),
                    DropdownMenuItem(value: 'certification', child: Text('Certification')),
                    DropdownMenuItem(value: 'project_completion', child: Text('Project Completion')),
                    DropdownMenuItem(value: 'achievement', child: Text('Achievement')),
                    DropdownMenuItem(value: 'milestone', child: Text('Milestone')),
                  ],
                  onChanged: (value) {
                    setState(() {
                      _selectedType = value ?? '';
                    });
                  },
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Please select a type';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _titleController,
                        decoration: const InputDecoration(
                          labelText: 'Title *',
                          border: OutlineInputBorder(),
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Please enter a title';
                          }
                          return null;
                        },
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: InkWell(
                        onTap: _selectDate,
                        child: InputDecorator(
                          decoration: const InputDecoration(
                            labelText: 'Date *',
                            border: OutlineInputBorder(),
                          ),
                          child: Text(
                            _selectedDate != null
                                ? DateFormat('yyyy-MM-dd').format(_selectedDate!)
                                : 'Select Date',
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _descriptionController,
                  decoration: const InputDecoration(
                    labelText: 'Description',
                    border: OutlineInputBorder(),
                  ),
                  maxLines: 3,
                ),
                const SizedBox(height: 24),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => Navigator.of(context).pop(),
                        child: const Text('Cancel'),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () {
                          if (_formKey.currentState!.validate() && _selectedDate != null) {
                            // TODO: Add growth record
                            Navigator.of(context).pop();
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Growth record added successfully'),
                              ),
                            );
                          }
                        },
                        child: const Text('Add Record'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('${widget.userName} - Documentation'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(icon: Icon(Icons.trending_up), text: 'Growth Tracker'),
            Tab(icon: Icon(Icons.history), text: 'Activity Log'),
            Tab(icon: Icon(Icons.person), text: 'Employment Summary'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildGrowthTracker(),
          _buildActivityLog(),
          _buildEmploymentSummary(),
        ],
      ),
    );
  }

  Widget _buildGrowthTracker() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Growth History',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              ElevatedButton.icon(
                onPressed: _showAddGrowthForm,
                icon: const Icon(Icons.add),
                label: const Text('Add Record'),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ...List.generate(
            _getMockGrowthRecords().length,
            (index) {
              final record = _getMockGrowthRecords()[index];
              return Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      _getGrowthIcon(record['type']),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              record['title'],
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              record['description'],
                              style: const TextStyle(color: Colors.grey),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              record['date'],
                              style: const TextStyle(
                                fontSize: 12,
                                color: Colors.grey,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildActivityLog() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _getMockActivityLogs().length,
      itemBuilder: (context, index) {
        final log = _getMockActivityLogs()[index];
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                _getActivityIcon(log['entity_type']),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        log['change_summary'],
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        log['date'],
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.grey,
                        ),
                      ),
                    ],
                  ),
                ),
                _getActionChip(log['action']),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildEmploymentSummary() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Employment Summary',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Basic Information',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  _buildInfoRow('Employee ID', 'EMP001'),
                  _buildInfoRow('Department', 'Engineering'),
                  _buildInfoRow('Position', 'Senior Developer'),
                  _buildInfoRow('Manager', 'John Smith'),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Employment Details',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  _buildInfoRow('Start Date', 'January 15, 2022'),
                  _buildInfoRow('Employment Type', 'Full-time'),
                  _buildInfoRow('Status', 'Active'),
                  _buildInfoRow('Tenure', '2 years, 3 months'),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Performance Metrics',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: _buildMetricCard('4.8', 'Performance Rating', Colors.green),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: _buildMetricCard('12', 'Projects Completed', Colors.blue),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: _buildMetricCard('3', 'Certifications', Colors.purple),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            '$label:',
            style: const TextStyle(color: Colors.grey),
          ),
          Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.w500),
          ),
        ],
      ),
    );
  }

  Widget _buildMetricCard(String value, String label, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          Text(
            value,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              color: Colors.grey,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _getGrowthIcon(String type) {
    IconData icon;
    Color color;
    
    switch (type) {
      case 'promotion':
        icon = Icons.emoji_events;
        color = Colors.yellow;
        break;
      case 'skill_development':
        icon = Icons.school;
        color = Colors.blue;
        break;
      case 'certification':
        icon = Icons.verified;
        color = Colors.green;
        break;
      case 'project_completion':
        icon = Icons.check_circle;
        color = Colors.purple;
        break;
      case 'achievement':
        icon = Icons.star;
        color = Colors.orange;
        break;
      case 'milestone':
        icon = Icons.flag;
        color = Colors.indigo;
        break;
      default:
        icon = Icons.trending_up;
        color = Colors.grey;
    }

    return Icon(icon, size: 24, color: color);
  }

  Widget _getActivityIcon(String entityType) {
    IconData icon;
    Color color;
    
    switch (entityType) {
      case 'USER':
        icon = Icons.person;
        color = Colors.blue;
        break;
      case 'DOCUMENT':
        icon = Icons.description;
        color = Colors.green;
        break;
      case 'LEAVE':
        icon = Icons.calendar_today;
        color = Colors.orange;
        break;
      case 'SALARY_SLIP':
        icon = Icons.attach_money;
        color = Colors.purple;
        break;
      default:
        icon = Icons.history;
        color = Colors.grey;
    }

    return Icon(icon, size: 20, color: color);
  }

  Widget _getActionChip(String action) {
    Color color;
    
    switch (action) {
      case 'CREATE':
        color = Colors.green;
        break;
      case 'UPDATE':
        color = Colors.blue;
        break;
      case 'DELETE':
        color = Colors.red;
        break;
      default:
        color = Colors.grey;
    }

    return Chip(
      label: Text(action),
      backgroundColor: color.withOpacity(0.1),
      labelStyle: TextStyle(
        color: color,
        fontSize: 10,
        fontWeight: FontWeight.bold,
      ),
    );
  }

  List<Map<String, dynamic>> _getMockGrowthRecords() {
    return [
      {
        'title': 'Promoted to Senior Developer',
        'description': 'Successfully promoted to Senior Developer role based on outstanding performance and leadership skills.',
        'type': 'promotion',
        'date': 'March 15, 2024',
      },
      {
        'title': 'AWS Solutions Architect Certification',
        'description': 'Completed AWS Solutions Architect certification, demonstrating expertise in cloud architecture.',
        'type': 'certification',
        'date': 'January 20, 2024',
      },
      {
        'title': 'E-commerce Platform Project',
        'description': 'Successfully led the development of a high-traffic e-commerce platform serving 100k+ users.',
        'type': 'project_completion',
        'date': 'December 10, 2023',
      },
    ];
  }

  List<Map<String, dynamic>> _getMockActivityLogs() {
    return [
      {
        'change_summary': 'Updated profile information',
        'entity_type': 'USER',
        'action': 'UPDATE',
        'date': '2024-01-15',
      },
      {
        'change_summary': 'Uploaded new document',
        'entity_type': 'DOCUMENT',
        'action': 'CREATE',
        'date': '2024-01-14',
      },
      {
        'change_summary': 'Applied for leave',
        'entity_type': 'LEAVE',
        'action': 'CREATE',
        'date': '2024-01-13',
      },
    ];
  }
}
