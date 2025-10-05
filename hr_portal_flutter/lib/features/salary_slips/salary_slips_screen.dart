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

  @override
  void initState() {
    super.initState();
    _loadSalarySlips();
    _loadPrivateDocuments();
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
    return Scaffold(
      appBar: AppBar(
        title: const Text('Salary Slips'),
        actions: [
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
    );
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
      // TODO: Implement download functionality
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Download functionality not implemented')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Download failed: $e')),
      );
    }
  }

  Future<void> _deleteSlip(String slipId) async {
    try {
      // TODO: Implement delete functionality
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Delete functionality not implemented')),
      );
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