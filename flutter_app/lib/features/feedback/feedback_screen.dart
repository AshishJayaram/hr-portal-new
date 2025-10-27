import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../shared/widgets/app_drawer.dart';
import '../../core/theme/liquid_glass_theme.dart';
import '../../core/widgets/glass_components.dart';

class FeedbackScreen extends ConsumerStatefulWidget {
  const FeedbackScreen({super.key});

  @override
  ConsumerState<FeedbackScreen> createState() => _FeedbackScreenState();
}

class _FeedbackScreenState extends ConsumerState<FeedbackScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  String _selectedType = '';
  String _selectedPriority = 'medium';
  String _statusFilter = '';
  String _typeFilter = '';

  void _showCreateForm() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
        ),
        child: GlassCard(
          backgroundColor: Colors.white.withOpacity(0.12),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Submit Feedback',
                    style: LiquidGlassTheme.heading4.copyWith(color: Colors.white, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _titleController,
                    decoration: const InputDecoration(
                      labelText: 'Title *',
                      border: OutlineInputBorder(),
                      hintText: 'Brief description of the issue or suggestion',
                    ),
                    validator: (value) => value == null || value.isEmpty ? 'Please enter a title' : null,
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    value: _selectedType.isEmpty ? null : _selectedType,
                    decoration: const InputDecoration(labelText: 'Type *', border: OutlineInputBorder()),
                    items: const [
                      DropdownMenuItem(value: 'bug', child: Text('Bug Report')),
                      DropdownMenuItem(value: 'feature', child: Text('Feature Request')),
                      DropdownMenuItem(value: 'improvement', child: Text('Improvement')),
                      DropdownMenuItem(value: 'other', child: Text('Other')),
                    ],
                    onChanged: (value) => setState(() => _selectedType = value ?? ''),
                    validator: (value) => value == null || value.isEmpty ? 'Please select a type' : null,
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    value: _selectedPriority,
                    decoration: const InputDecoration(labelText: 'Priority', border: OutlineInputBorder()),
                    items: const [
                      DropdownMenuItem(value: 'low', child: Text('Low')),
                      DropdownMenuItem(value: 'medium', child: Text('Medium')),
                      DropdownMenuItem(value: 'high', child: Text('High')),
                      DropdownMenuItem(value: 'critical', child: Text('Critical')),
                    ],
                    onChanged: (value) => setState(() => _selectedPriority = value ?? 'medium'),
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _descriptionController,
                    decoration: const InputDecoration(
                      labelText: 'Description *',
                      border: OutlineInputBorder(),
                      hintText: 'Please provide detailed information...',
                    ),
                    maxLines: 4,
                    validator: (value) => value == null || value.isEmpty ? 'Please enter a description' : null,
                  ),
                  const SizedBox(height: 24),
                  Row(
                    children: [
                      Expanded(
                        child: GlassButton(
                          onPressed: () => Navigator.of(context).pop(),
                          child: Text('Cancel', style: LiquidGlassTheme.bodyMedium.copyWith(color: Colors.white)),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: GlassButton(
                          onPressed: () {
                            if (_formKey.currentState!.validate()) {
                              Navigator.of(context).pop();
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Feedback submitted successfully')),
                              );
                            }
                          },
                          child: Text('Submit', style: LiquidGlassTheme.bodyMedium.copyWith(color: Colors.white, fontWeight: FontWeight.w600)),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
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
          'Feedback & Bug Reports',
          style: LiquidGlassTheme.heading4.copyWith(color: Colors.white, fontWeight: FontWeight.w600),
        ),
        actions: [
          IconButton(icon: const Icon(Icons.add), onPressed: _showCreateForm),
        ],
      ),
      drawer: const AppDrawer(),
      body: Container(
        decoration: BoxDecoration(gradient: LiquidGlassTheme.darkPrimaryGradient),
        child: SafeArea(
          child: Column(
            children: [
              // Filters
              GlassCard(
                backgroundColor: Colors.white.withOpacity(0.1),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          value: _statusFilter.isEmpty ? null : _statusFilter,
                          decoration: const InputDecoration(labelText: 'Status', border: OutlineInputBorder()),
                          items: const [
                            DropdownMenuItem(value: '', child: Text('All Status')),
                            DropdownMenuItem(value: 'open', child: Text('Open')),
                            DropdownMenuItem(value: 'in_progress', child: Text('In Progress')),
                            DropdownMenuItem(value: 'resolved', child: Text('Resolved')),
                            DropdownMenuItem(value: 'closed', child: Text('Closed')),
                          ],
                          onChanged: (value) => setState(() => _statusFilter = value ?? ''),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          value: _typeFilter.isEmpty ? null : _typeFilter,
                          decoration: const InputDecoration(labelText: 'Type', border: OutlineInputBorder()),
                          items: const [
                            DropdownMenuItem(value: '', child: Text('All Types')),
                            DropdownMenuItem(value: 'bug', child: Text('Bug Report')),
                            DropdownMenuItem(value: 'feature', child: Text('Feature Request')),
                            DropdownMenuItem(value: 'improvement', child: Text('Improvement')),
                            DropdownMenuItem(value: 'other', child: Text('Other')),
                          ],
                          onChanged: (value) => setState(() => _typeFilter = value ?? ''),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              // Feedback List
              Expanded(
                child: ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _getMockFeedback().length,
                  itemBuilder: (context, index) {
                    final feedback = _getMockFeedback()[index];
                    return GlassCard(
                      backgroundColor: Colors.white.withOpacity(0.1),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                _getTypeIcon(feedback['type']),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    feedback['title'],
                                    style: LiquidGlassTheme.bodyLarge.copyWith(color: Colors.white, fontWeight: FontWeight.w700),
                                  ),
                                ),
                                _buildPriorityChip(feedback['priority']),
                                const SizedBox(width: 8),
                                _buildStatusChip(feedback['status']),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              feedback['description'],
                              style: const TextStyle(color: Colors.white70),
                            ),
                            const SizedBox(height: 12),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text('By: ${feedback['user']}', style: const TextStyle(fontSize: 12, color: Colors.white60)),
                                Text(feedback['date'], style: const TextStyle(fontSize: 12, color: Colors.white60)),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                TextButton(onPressed: () {}, child: const Text('View')),
                                TextButton(onPressed: () {}, child: const Text('Edit')),
                                TextButton(onPressed: () {}, child: const Text('Delete')),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showCreateForm,
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _getTypeIcon(String type) {
    IconData icon;
    Color color;
    
    switch (type) {
      case 'bug':
        icon = Icons.bug_report;
        color = Colors.redAccent;
        break;
      case 'feature':
        icon = Icons.lightbulb;
        color = Colors.lightBlueAccent;
        break;
      case 'improvement':
        icon = Icons.message;
        color = Colors.greenAccent;
        break;
      default:
        icon = Icons.info;
        color = Colors.white70;
    }

    return Icon(icon, size: 20, color: color);
  }

  Widget _buildPriorityChip(String priority) {
    Color color;
    
    switch (priority) {
      case 'critical':
        color = Colors.redAccent;
        break;
      case 'high':
        color = Colors.orangeAccent;
        break;
      case 'medium':
        color = Colors.yellowAccent.shade700;
        break;
      case 'low':
        color = Colors.greenAccent;
        break;
      default:
        color = Colors.white70;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: color.withOpacity(0.2), borderRadius: BorderRadius.circular(12)),
      child: Text(
        priority.toUpperCase(),
        style: LiquidGlassTheme.caption.copyWith(color: Colors.white, fontWeight: FontWeight.w600),
      ),
    );
  }

  Widget _buildStatusChip(String status) {
    Color color;
    IconData icon;
    
    switch (status) {
      case 'open':
        color = Colors.lightBlueAccent;
        icon = Icons.schedule;
        break;
      case 'in_progress':
        color = Colors.orangeAccent;
        icon = Icons.warning;
        break;
      case 'resolved':
        color = Colors.greenAccent;
        icon = Icons.check_circle;
        break;
      case 'closed':
        color = Colors.white70;
        icon = Icons.cancel;
        break;
      default:
        color = Colors.white70;
        icon = Icons.schedule;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: color.withOpacity(0.2), borderRadius: BorderRadius.circular(12)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: Colors.white70),
          const SizedBox(width: 6),
          Text(status.replaceAll('_', ' ').toUpperCase(), style: LiquidGlassTheme.caption.copyWith(color: Colors.white, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  List<Map<String, dynamic>> _getMockFeedback() {
    return [
      {
        'title': 'Login page not loading on mobile',
        'description': 'The login page fails to load properly on mobile devices, showing a blank screen.',
        'type': 'bug',
        'priority': 'high',
        'status': 'open',
        'user': 'John Doe',
        'date': '2024-01-15',
      },
      {
        'title': 'Add dark mode toggle',
        'description': 'It would be great to have a dark mode toggle for better user experience.',
        'type': 'feature',
        'priority': 'medium',
        'status': 'in_progress',
        'user': 'Jane Smith',
        'date': '2024-01-10',
      },
      {
        'title': 'Improve dashboard loading speed',
        'description': 'The dashboard takes too long to load. Can we optimize the queries?',
        'type': 'improvement',
        'priority': 'medium',
        'status': 'resolved',
        'user': 'Mike Johnson',
        'date': '2024-01-05',
      },
    ];
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }
}
