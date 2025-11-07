import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../shared/widgets/app_drawer.dart';
import '../../core/theme/app_theme.dart';
import '../../core/services/api_service.dart';
import '../../core/providers/providers.dart';

class SalarySlipsScreen extends ConsumerStatefulWidget {
  @override
  ConsumerState<SalarySlipsScreen> createState() => _SalarySlipsScreenState();
}

class _SalarySlipsScreenState extends ConsumerState<SalarySlipsScreen> {
  int? _selectedYear;
  List<Map<String, dynamic>> _filteredSalarySlips = [];
  List<Map<String, dynamic>> _privateDocuments = [];
  List<int> _availableYears = [];
  bool _isLoading = false;

  final List<Map<String, dynamic>> _allSalarySlips = [];

  // Payslip generation state
  bool _showGenerateDialog = false;
  Map<String, dynamic>? _selectedUser;
  int _generateMonth = DateTime.now().month;
  int _generateYear = DateTime.now().year;
  List<Map<String, dynamic>> _availableUsers = [];

  @override
  void initState() {
    super.initState();
    _loadSalarySlips();
    _loadPrivateDocuments();
    _loadAvailableUsers();
  }

  void _filterSalarySlips() {
    setState(() {
      _filteredSalarySlips = _allSalarySlips
          .where((slip) => slip['year'] == _selectedYear)
          .toList();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Scaffold(
          appBar: AppBar(
            leading: Builder(
              builder: (context) => IconButton(
                icon: const Icon(Icons.menu),
                onPressed: () => Scaffold.of(context).openDrawer(),
              ),
            ),
            title: const Text('Salary Slips'),
            actions: [
              IconButton(
                icon: const Icon(Icons.add),
                tooltip: 'Generate Payslip PDF',
                onPressed: _showGeneratePayslipDialog,
              ),
              IconButton(
                icon: const Icon(Icons.refresh),
                onPressed: _loadSalarySlips,
              ),
            ],
          ),
      drawer: const AppDrawer(),
      body: Column(
        children: [
          // Year Selector
          Container(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                const Text('Select Year: '),
                DropdownButton<int>(
                  value: _selectedYear,
                  hint: const Text('Select Year'),
                  items: _availableYears.map((year) {
                    return DropdownMenuItem(
                      value: year,
                      child: Text(year.toString()),
                    );
                  }).toList(),
                  onChanged: (value) {
                    if (value != null) {
                      setState(() {
                        _selectedYear = value;
                        _filterSalarySlips();
                      });
                    }
                  },
                ),
              ],
            ),
          ),
          // Salary Breakdown
          Container(
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.grey[800],
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey[600]!),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Salary Breakdown',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.primaryColor,
                  ),
                ),
                const SizedBox(height: 16),
                GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  childAspectRatio: 2.5,
                  crossAxisSpacing: 8,
                  mainAxisSpacing: 8,
                  children: [
                    _buildSalaryItem('Basic Salary', '₹50,000', Colors.blue),
                    _buildSalaryItem('HRA', '₹20,000', Colors.green),
                    _buildSalaryItem('Allowances', '₹10,000', Colors.orange),
                    _buildSalaryItem('Deductions', '₹5,000', Colors.red),
                    _buildSalaryItem('Net Salary', '₹75,000', Colors.purple, isTotal: true),
                  ],
                ),
              ],
            ),
          ),
          // Salary Slips List
          Expanded(
            child: _isLoading
                ? const Center(
                    child: CircularProgressIndicator(),
                  )
                : _availableYears.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.description_outlined,
                              size: 64,
                              color: AppTheme.secondaryColor,
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'No salary slips found',
                              style: TextStyle(
                                fontSize: 16,
                                color: AppTheme.secondaryColor,
                              ),
                            ),
                          ],
                        ),
                      )
                    : _filteredSalarySlips.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.description_outlined,
                              size: 64,
                              color: AppTheme.secondaryColor,
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'No salary slips found for $_selectedYear',
                              style: TextStyle(
                                fontSize: 16,
                                color: AppTheme.secondaryColor,
                              ),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: _filteredSalarySlips.length,
                        itemBuilder: (context, index) {
                          final slip = _filteredSalarySlips[index];
                          return _buildSlipCard(slip);
                        },
                      ),
          ),
          // Private Documents Section
          if (_privateDocuments.isNotEmpty) ...[
            const Divider(),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                'Private Documents',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.primaryColor,
                ),
              ),
            ),
            Expanded(
              flex: 0,
              child: SizedBox(
                height: 200, // Fixed height for private documents
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: _privateDocuments.length,
                  itemBuilder: (context, index) {
                    final doc = _privateDocuments[index];
                    return _buildDocumentCard(doc);
                  },
                ),
              ),
            ),
          ],
        ],
      ),
        ),
        
        // Generate Payslip PDF Dialog
        if (_showGenerateDialog) _buildGeneratePayslipDialog(),
      ],
    );
  }

  Widget _buildGeneratePayslipDialog() {
    return Dialog(
      child: Container(
        width: double.maxFinite,
        constraints: const BoxConstraints(maxWidth: 600, maxHeight: 800),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.primaryColor,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(4),
                  topRight: Radius.circular(4),
                ),
              ),
              child: Row(
                children: [
                  Text(
                    'Generate Payslip PDF',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white),
                    onPressed: _hideGeneratePayslipDialog,
                  ),
                ],
              ),
            ),

            // Content
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Employee Selection
                    const Text(
                      'Select Employee',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<Map<String, dynamic>>(
                      value: _selectedUser,
                      decoration: const InputDecoration(
                        border: OutlineInputBorder(),
                        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      ),
                      hint: const Text('Select an employee'),
                      items: _availableUsers.map((user) {
                        return DropdownMenuItem(
                          value: user,
                          child: Text(user['name'] ?? user['email'] ?? 'Unknown'),
                        );
                      }).toList(),
                      onChanged: (value) {
                        setState(() {
                          _selectedUser = value;
                        });
                      },
                    ),

                    const SizedBox(height: 16),

                    // Month and Year Selection
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Month',
                                style: TextStyle(fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 8),
                              DropdownButtonFormField<int>(
                                value: _generateMonth,
                                decoration: const InputDecoration(
                                  border: OutlineInputBorder(),
                                  contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                ),
                                items: List.generate(12, (index) {
                                  final month = index + 1;
                                  return DropdownMenuItem(
                                    value: month,
                                    child: Text(_getMonthName(month)),
                                  );
                                }),
                                onChanged: (value) {
                                  if (value != null) {
                                    setState(() {
                                      _generateMonth = value;
                                    });
                                  }
                                },
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Year',
                                style: TextStyle(fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 8),
                              DropdownButtonFormField<int>(
                                value: _generateYear,
                                decoration: const InputDecoration(
                                  border: OutlineInputBorder(),
                                  contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                ),
                                items: List.generate(5, (index) {
                                  final year = DateTime.now().year - 2 + index;
                                  return DropdownMenuItem(
                                    value: year,
                                    child: Text(year.toString()),
                                  );
                                }),
                                onChanged: (value) {
                                  if (value != null) {
                                    setState(() {
                                      _generateYear = value;
                                    });
                                  }
                                },
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 24),

                    // Action Buttons
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        TextButton(
                          onPressed: _hideGeneratePayslipDialog,
                          child: const Text('Cancel'),
                        ),
                        const SizedBox(width: 8),
                        ElevatedButton(
                          onPressed: _selectedUser != null ? _generatePayslip : null,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.primaryColor,
                            foregroundColor: Colors.white,
                          ),
                          child: const Text('Generate PDF'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _generatePayslip() async {
    if (_selectedUser == null) return;

    try {
      final apiService = ref.read(apiServiceProvider);

      // For now, create a simple payslip data structure
      // In a real implementation, you would have a more comprehensive form
      final payslipData = {
        'userId': _selectedUser!['id'].toString(),
        'month': _generateMonth,
        'year': _generateYear,
        'earnings': {
          'basic': 30000.0,
          'hra': 12000.0,
          'specialAllowance': 5000.0,
          'other': 3000.0,
          'custom': {},
        },
        'deductions': {
          'pf': 3600.0,
          'esi': 285.0,
          'professionalTax': 200.0,
          'tds': 1500.0,
          'other': 0.0,
          'custom': {},
        },
        'lopDays': 0,
        'lopAmount': 0.0,
        'grossEarnings': 50000.0,
        'totalDeductions': 5585.0,
        'netPay': 44415.0,
      };

      final result = await apiService.generatePayslipPDF(payslipData);

      if (result) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Payslip PDF generated successfully!')),
        );
        _hideGeneratePayslipDialog();
        _loadSalarySlips(); // Refresh the list
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to generate payslip PDF')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    }
  }

  Widget _buildSalaryItem(String label, String amount, Color color, {bool isTotal = false}) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: color,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            amount,
            style: TextStyle(
              fontSize: isTotal ? 16 : 14,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _loadSalarySlips() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final apiService = ref.read(apiServiceProvider);
      final salarySlips = await apiService.getSalarySlips();
      
      setState(() {
        _allSalarySlips.clear();
        _allSalarySlips.addAll(salarySlips);
        
        // Extract unique years from salary slips
        final years = salarySlips.map((slip) => slip['year'] as int).toSet().toList();
        years.sort((a, b) => b.compareTo(a)); // Sort descending
        _availableYears = years;
        
        // Set default year if none selected
        if (_selectedYear == null && years.isNotEmpty) {
          _selectedYear = years.first;
        }
        
        _filterSalarySlips();
        _isLoading = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Salary slips refreshed')),
      );
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to load salary slips: $e')),
      );
    }
  }

  Future<void> _loadPrivateDocuments() async {
    try {
      final apiService = ref.read(apiServiceProvider);
      final currentUser = await apiService.getCurrentUser();

      if (currentUser != null) {
        // Get private documents for the current user
        final allDocuments = await apiService.getDocuments();

        setState(() {
          _privateDocuments = allDocuments.where((doc) {
            bool isPrivate = doc['is_public'] == false || doc['is_public'] == 0;
            bool isAssignedToUser = doc['user_id'] == currentUser['id'].toString();

            return isPrivate && isAssignedToUser;
          }).toList();
        });
      }
    } catch (e) {
      print('Failed to load private documents: $e');
    }
  }

  Future<void> _loadAvailableUsers() async {
    try {
      final apiService = ref.read(apiServiceProvider);
      final users = await apiService.getUsers();

      setState(() {
        _availableUsers = users;
      });
    } catch (e) {
      print('Failed to load users: $e');
    }
  }

  void _showGeneratePayslipDialog() {
    setState(() {
      _showGenerateDialog = true;
    });
  }

  void _hideGeneratePayslipDialog() {
    setState(() {
      _showGenerateDialog = false;
      _selectedUser = null;
      _generateMonth = DateTime.now().month;
      _generateYear = DateTime.now().year;
    });
  }

  Widget _buildSlipCard(Map<String, dynamic> slip) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: const Icon(Icons.description),
        title: Text('${_getMonthName(slip['month'])} ${slip['year']}'),
        subtitle: Text('Salary Slip'),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              icon: const Icon(Icons.download),
              onPressed: () => _downloadSlip(slip['id']),
            ),
            IconButton(
              icon: const Icon(Icons.delete),
              onPressed: () => _deleteSlip(slip['id']),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDocumentCard(Map<String, dynamic> doc) {
    return Container(
      width: 150,
      margin: const EdgeInsets.only(right: 8),
      child: Card(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.description,
              size: 48,
              color: AppTheme.primaryColor,
            ),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.all(8),
              child: Text(
                doc['title'] ?? 'Document',
                style: const TextStyle(fontSize: 12),
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                IconButton(
                  icon: const Icon(Icons.download, size: 16),
                  onPressed: () => _downloadDocument(doc['id']),
                ),
                IconButton(
                  icon: const Icon(Icons.delete, size: 16),
                  onPressed: () => _deleteDocument(doc['id']),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _getMonthName(int month) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
  }

  Future<void> _downloadSlip(String slipId) async {
    try {
      final apiService = ref.read(apiServiceProvider);
      // Get the salary slip download URL
      final slip = _allSalarySlips.firstWhere((s) => s['id'].toString() == slipId);
      
      if (slip['file_url'] != null) {
        // Open the salary slip in browser or download
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Opening salary slip: ${slip['file_name']}')),
        );
        // In a real implementation, you would use url_launcher to open the URL
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Salary slip file not available')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Download failed: $e')),
      );
    }
  }

  Future<void> _deleteSlip(String slipId) async {
    try {
      // Show confirmation dialog
      final confirm = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Delete Salary Slip'),
          content: const Text('Are you sure you want to delete this salary slip? This action cannot be undone.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context, true),
              style: TextButton.styleFrom(foregroundColor: Colors.red),
              child: const Text('Delete'),
            ),
          ],
        ),
      );

      if (confirm == true) {
        final apiService = ref.read(apiServiceProvider);
        await apiService.deleteSalarySlip(slipId);
        
        // Remove from local list
        setState(() {
          _allSalarySlips.removeWhere((slip) => slip['id'].toString() == slipId);
          _filterSalarySlips();
        });
        
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Salary slip deleted successfully')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Delete failed: $e')),
      );
    }
  }

  Future<void> _downloadDocument(String docId) async {
    try {
      final apiService = ref.read(apiServiceProvider);
      await apiService.downloadDocument(docId);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Download started')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Download failed: $e')),
      );
    }
  }

  Future<void> _deleteDocument(String docId) async {
    try {
      final apiService = ref.read(apiServiceProvider);
      await apiService.deleteDocument(docId);
      _loadPrivateDocuments();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Document deleted')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Delete failed: $e')),
      );
    }
  }
}