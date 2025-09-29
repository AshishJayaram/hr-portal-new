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
  int _selectedYear = 2023;
  List<Map<String, dynamic>> _filteredSalarySlips = [];
  bool _isLoading = false;
  
  final List<Map<String, dynamic>> _allSalarySlips = [];

  @override
  void initState() {
    super.initState();
    _loadSalarySlips();
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
          // Year Filter
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                const Text('Year: '),
                DropdownButton<int>(
                  value: _selectedYear,
                  items: [2023, 2022, 2021].map((year) {
                    return DropdownMenuItem(
                      value: year,
                      child: Text(year.toString()),
                    );
                  }).toList(),
                  onChanged: (value) {
                    if (value != null) {
                      setState(() {
                        _selectedYear = value;
                      });
                      _filterSalarySlips();
                    }
                  },
                ),
                const Spacer(),
                ElevatedButton.icon(
                  onPressed: _generateSalarySlip,
                  icon: const Icon(Icons.add),
                  label: const Text('Generate'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryColor,
                    foregroundColor: Colors.white,
                  ),
                ),
              ],
            ),
          ),
          
          // Salary Slips List
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _filteredSalarySlips.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.receipt_long,
                              size: 64,
                              color: AppTheme.secondaryColor.withOpacity(0.5),
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
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              slip['month'],
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppTheme.successColor,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                slip['status'],
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        
                        // Salary Breakdown
                        Row(
                          children: [
                            Expanded(
                              child: _buildSalaryItem(
                                'Basic Salary',
                                '₹${slip['basicSalary']}',
                                AppTheme.primaryColor,
                              ),
                            ),
                            Expanded(
                              child: _buildSalaryItem(
                                'Allowances',
                                '₹${slip['allowances']}',
                                AppTheme.successColor,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Expanded(
                              child: _buildSalaryItem(
                                'Deductions',
                                '₹${slip['deductions']}',
                                AppTheme.errorColor,
                              ),
                            ),
                            Expanded(
                              child: _buildSalaryItem(
                                'Net Salary',
                                '₹${slip['netSalary']}',
                                AppTheme.accentColor,
                                isTotal: true,
                              ),
                            ),
                          ],
                        ),
                        
                        const SizedBox(height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            TextButton.icon(
                              onPressed: () => _viewSalarySlip(slip['id']),
                              icon: const Icon(Icons.visibility),
                              label: const Text('View'),
                            ),
                            const SizedBox(width: 8),
                            ElevatedButton.icon(
                              onPressed: () => _downloadSalarySlip(slip['id']),
                              icon: const Icon(Icons.download),
                              label: const Text('Download'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppTheme.primaryColor,
                                foregroundColor: Colors.white,
                              ),
                            ),
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

  void _generateSalarySlip() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Generate Salary Slip'),
        content: const Text('Salary slip generation - Coming Soon'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  void _viewSalarySlip(String slipId) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Salary Slip Details'),
        content: const Text('Salary slip details view - Coming Soon'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  void _downloadSalarySlip(String slipId) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Downloading salary slip $slipId')),
    );
  }
}
