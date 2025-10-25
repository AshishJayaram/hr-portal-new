import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../shared/widgets/app_drawer.dart';
import '../../core/theme/app_theme.dart';
import '../../core/services/api_service.dart';
import '../../core/providers/providers.dart';

class AddHolidayScreen extends ConsumerStatefulWidget {
  @override
  ConsumerState<AddHolidayScreen> createState() => _AddHolidayScreenState();
}

class _AddHolidayScreenState extends ConsumerState<AddHolidayScreen> {
  final PageController _pageController = PageController();
  final _formKey = GlobalKey<FormState>();
  
  int _currentStep = 0;
  bool _isLoading = false;
  
  // Form controllers
  final _nameController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _startDateController = TextEditingController();
  final _endDateController = TextEditingController();
  
  // Form data
  String _selectedType = 'holiday';
  bool _isMultiDay = false;
  bool _isCalendarEvent = true;

  @override
  void dispose() {
    _pageController.dispose();
    _nameController.dispose();
    _descriptionController.dispose();
    _startDateController.dispose();
    _endDateController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final user = authState.user;
    final canCreateHoliday = user?.role == 'HR' || user?.role == 'Admin' || user?.role == 'God';
    
    if (!canCreateHoliday) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Access Denied'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () {
              if (Navigator.canPop(context)) {
                Navigator.pop(context);
              } else {
                context.go('/holidays');
              }
            },
          ),
        ),
        body: const Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.lock, size: 64, color: Colors.red),
              SizedBox(height: 16),
              Text(
                'Access Denied',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 8),
              Text(
                'Only HR, Admin, and God users can create holidays and events.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 16),
              ),
            ],
          ),
        ),
      );
    }
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Add Holiday/Event'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (Navigator.canPop(context)) {
              Navigator.pop(context);
            } else {
              context.go('/holidays');
            }
          },
        ),
        actions: [
          if (_currentStep > 0)
            TextButton(
              onPressed: _previousStep,
              child: const Text('Previous'),
            ),
          TextButton(
            onPressed: _currentStep < 2 ? _nextStep : _submitForm,
            child: Text(_currentStep < 2 ? 'Next' : 'Save'),
          ),
        ],
      ),
      drawer: const AppDrawer(),
      body: Column(
        children: [
          // Progress indicator
          Container(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: LinearProgressIndicator(
                    value: (_currentStep + 1) / 3,
                    backgroundColor: Colors.grey[300],
                    valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryColor),
                  ),
                ),
                const SizedBox(width: 16),
                Text(
                  'Step ${_currentStep + 1} of 3',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: AppTheme.primaryColor,
                  ),
                ),
              ],
            ),
          ),
          
          // Stepper content
          Expanded(
            child: PageView(
              controller: _pageController,
              onPageChanged: (index) {
                setState(() {
                  _currentStep = index;
                });
              },
              children: [
                _buildBasicInfoStep(),
                _buildDateInfoStep(),
                _buildReviewStep(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBasicInfoStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [AppTheme.primaryColor.withOpacity(0.1), AppTheme.accentColor.withOpacity(0.1)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.primaryColor.withOpacity(0.2)),
              ),
              child: Column(
                children: [
                  Icon(
                    Icons.event,
                    size: 48,
                    color: AppTheme.primaryColor,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Basic Information',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.primaryColor,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Enter the basic details of the holiday or event',
                    style: TextStyle(
                      fontSize: 14,
                      color: AppTheme.secondaryColor,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 32),
            
            // Form fields
            TextFormField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Name',
                hintText: 'Enter holiday or event name',
                prefixIcon: Icon(Icons.title),
                border: OutlineInputBorder(),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter a name';
                }
                return null;
              },
            ),
            
            const SizedBox(height: 16),
            
            DropdownButtonFormField<String>(
              value: _selectedType,
              decoration: const InputDecoration(
                labelText: 'Type',
                prefixIcon: Icon(Icons.category),
                border: OutlineInputBorder(),
              ),
              items: [
                DropdownMenuItem(value: 'holiday', child: Text('Holiday')),
                DropdownMenuItem(value: 'event', child: Text('Event')),
                DropdownMenuItem(value: 'notice', child: Text('Notice')),
              ],
              onChanged: (value) {
                setState(() {
                  _selectedType = value!;
                });
              },
            ),
            
            const SizedBox(height: 16),
            
            TextFormField(
              controller: _descriptionController,
              decoration: const InputDecoration(
                labelText: 'Description',
                hintText: 'Enter description (optional)',
                prefixIcon: Icon(Icons.description),
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDateInfoStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [AppTheme.accentColor.withOpacity(0.1), AppTheme.successColor.withOpacity(0.1)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.accentColor.withOpacity(0.2)),
            ),
            child: Column(
              children: [
                Icon(
                  Icons.calendar_today,
                  size: 48,
                  color: AppTheme.accentColor,
                ),
                const SizedBox(height: 16),
                Text(
                  'Date Information',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.accentColor,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Set the date(s) for the holiday or event',
                  style: TextStyle(
                    fontSize: 14,
                    color: AppTheme.secondaryColor,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 32),
          
          // Multi-day toggle
          if (_selectedType != 'notice') ...[
            Row(
              children: [
                Checkbox(
                  value: _isMultiDay,
                  onChanged: (value) {
                    setState(() {
                      _isMultiDay = value!;
                      if (!_isMultiDay) {
                        _endDateController.text = _startDateController.text;
                      }
                    });
                  },
                ),
            const Text('Multi-day Event'),
              ],
            ),
            const SizedBox(height: 16),
          ],
          
          // Date fields
          TextFormField(
            controller: _startDateController,
            decoration: InputDecoration(
              labelText: _selectedType == 'notice' ? 'Date (Optional)' : 'Start Date',
              prefixIcon: const Icon(Icons.calendar_today),
              border: const OutlineInputBorder(),
            ),
            readOnly: true,
            onTap: () async {
              final date = await showDatePicker(
                context: context,
                initialDate: DateTime.now(),
                firstDate: DateTime(2020),
                lastDate: DateTime(2030),
              );
              if (date != null) {
                _startDateController.text = date.toIso8601String().split('T')[0];
                if (!_isMultiDay) {
                  _endDateController.text = _startDateController.text;
                }
              }
            },
            validator: _selectedType == 'notice' ? null : (value) {
              if (value == null || value.isEmpty) {
                return 'Please select a date';
              }
              return null;
            },
          ),
          
          if (_isMultiDay) ...[
            const SizedBox(height: 16),
            TextFormField(
              controller: _endDateController,
              decoration: const InputDecoration(
                labelText: 'End Date',
                prefixIcon: Icon(Icons.calendar_today),
                border: OutlineInputBorder(),
              ),
              readOnly: true,
              onTap: () async {
                final startDate = DateTime.tryParse(_startDateController.text);
                final date = await showDatePicker(
                  context: context,
                  initialDate: startDate ?? DateTime.now(),
                  firstDate: startDate ?? DateTime(2020),
                  lastDate: DateTime(2030),
                );
                if (date != null) {
                  _endDateController.text = date.toIso8601String().split('T')[0];
                }
              },
              validator: _isMultiDay ? (value) {
                if (value == null || value.isEmpty) {
                  return 'Please select an end date';
                }
                return null;
              } : null,
            ),
          ],
          
          const SizedBox(height: 16),
          
          // Calendar event toggle
          Row(
            children: [
              Checkbox(
                value: _isCalendarEvent,
                onChanged: (value) {
                  setState(() {
                    _isCalendarEvent = value!;
                  });
                },
              ),
              const Text('Show on Calendar'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildReviewStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [AppTheme.successColor.withOpacity(0.1), AppTheme.primaryColor.withOpacity(0.1)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.successColor.withOpacity(0.2)),
            ),
            child: Column(
              children: [
                Icon(
                  Icons.check_circle,
                  size: 48,
                  color: AppTheme.successColor,
                ),
                const SizedBox(height: 16),
                Text(
                  'Review Information',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.successColor,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Review all information before creating the holiday/event',
                  style: TextStyle(
                    fontSize: 14,
                    color: AppTheme.secondaryColor,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 32),
          
          // Review cards
          _buildReviewCard('Basic Information', [
            _buildReviewItem('Name', _nameController.text),
            _buildReviewItem('Type', _selectedType.toUpperCase()),
            _buildReviewItem('Description', _descriptionController.text.isEmpty ? 'No description' : _descriptionController.text),
          ]),
          
          const SizedBox(height: 16),
          
          _buildReviewCard('Date Information', [
            _buildReviewItem('Start Date', _startDateController.text.isEmpty ? 'Not set' : _formatDate(_startDateController.text)),
            if (_isMultiDay)
              _buildReviewItem('End Date', _endDateController.text.isEmpty ? 'Not set' : _formatDate(_endDateController.text)),
            _buildReviewItem('Multi-day', _isMultiDay ? 'Yes' : 'No'),
            _buildReviewItem('Show on Calendar', _isCalendarEvent ? 'Yes' : 'No'),
          ]),
        ],
      ),
    );
  }

  Widget _buildReviewCard(String title, List<Widget> items) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppTheme.primaryColor,
              ),
            ),
            const SizedBox(height: 16),
            ...items,
          ],
        ),
      ),
    );
  }

  Widget _buildReviewItem(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              '$label:',
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 14,
              ),
            ),
          ),
          Expanded(
            child: Text(value),
          ),
        ],
      ),
    );
  }

  void _nextStep() {
    if (_currentStep == 0) {
      if (_formKey.currentState!.validate()) {
        _pageController.nextPage(
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeInOut,
        );
      }
    } else {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }
  }

  void _previousStep() {
    _pageController.previousPage(
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    );
  }

  Future<void> _submitForm() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final apiService = ref.read(apiServiceProvider);
      final holidayData = {
        'name': _nameController.text,
        'type': _selectedType,
        'description': _descriptionController.text,
        'is_calendar_event': _isCalendarEvent,
        if (_isMultiDay) 
          'date_range': '${_startDateController.text} to ${_endDateController.text}'
        else if (_startDateController.text.isNotEmpty)
          'date': _startDateController.text,
      };

      final success = await apiService.createHoliday(holidayData);

      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Holiday/Event created successfully'),
            backgroundColor: Colors.green,
          ),
        );
        
        // Navigate back to holidays page
        if (Navigator.canPop(context)) {
          Navigator.pop(context);
        } else {
          context.go('/holidays');
        }
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to create holiday/event'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to create holiday/event: $e'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  String _formatDate(String dateString) {
    try {
      final date = DateTime.parse(dateString);
      return '${date.day}/${date.month}/${date.year}';
    } catch (e) {
      return dateString;
    }
  }
}
