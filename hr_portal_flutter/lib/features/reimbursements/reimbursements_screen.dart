import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:file_picker/file_picker.dart';
import 'package:intl/intl.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers/providers.dart';
import '../../core/services/api_service.dart';
import '../../core/theme/liquid_glass_theme.dart';
import '../../core/widgets/glass_components.dart';
import '../../shared/widgets/app_drawer.dart';

class ReimbursementsScreen extends ConsumerStatefulWidget {
  const ReimbursementsScreen({super.key});

  @override
  ConsumerState<ReimbursementsScreen> createState() => _ReimbursementsScreenState();
}

class _ReimbursementsScreenState extends ConsumerState<ReimbursementsScreen> {
  final _formKey = GlobalKey<FormState>();
  final _reasonController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _amountController = TextEditingController();
  DateTime? _selectedDate;
  List<PlatformFile> _selectedFiles = [];
  String _statusFilter = '';
  String _activeTab = 'my';
  bool _loading = false;
  bool _showDisclaimer = true;
  List<Map<String, dynamic>> _items = [];
  List<Map<String, dynamic>> _users = [];
  String? _applyForUserId;

  @override
  void initState() {
    super.initState();
    _load();
    _loadUsers();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
    });
    try {
      final api = ref.read(apiServiceProvider);
      final view = await _canApprove() ? _activeTab : 'my';
      final list = await api.getReimbursements(
        status: _statusFilter.isEmpty ? null : _statusFilter,
        view: view,
      );
      setState(() {
        _items = list;
      });
    } finally {
      setState(() {
        _loading = false;
      });
    }
  }

  Future<void> _loadUsers() async {
    try {
      final api = ref.read(apiServiceProvider);
      final users = await api.getUsers();
      setState(() {
        _users = users;
      });
    } catch (e) {
      print('Failed to load users: $e');
    }
  }

  Future<bool> _canApprove() async {
    final user = ref.read(authProvider).user;
    final role = (user?.role ?? '').toLowerCase();
    return role == 'hr' || role == 'admin' || role == 'god';
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

  Future<void> _pickFiles() async {
    FilePickerResult? result = await FilePicker.platform.pickFiles(
      allowMultiple: true,
      type: FileType.custom,
      allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png'],
    );

    if (result != null) {
      setState(() {
        _selectedFiles = result.files;
      });
    }
  }

  void _removeFile(int index) {
    setState(() {
      _selectedFiles.removeAt(index);
    });
  }

  void _showCreateForm() async {
    final canApplyForOthers = await _canApprove();
    showDialog(
      context: context,
      builder: (context) => _CreateReimbursementDialog(
        onSubmitted: () async {
          await _load();
        },
        users: _users,
        canApplyForOthers: canApplyForOthers,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final currentUser = authState.user;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final canApprove = currentUser?.role == 'HR' || currentUser?.role == 'Admin' || currentUser?.role == 'God';
    
    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(0), // Hide the default app bar
        child: Container(),
      ),
      drawer: const AppDrawer(),
      body: Container(
        decoration: BoxDecoration(
          gradient: isDark 
              ? LiquidGlassTheme.darkPrimaryGradient 
              : LiquidGlassTheme.primaryGradient,
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Custom Header
              _buildCustomHeader(context, canApprove)
                  .animate()
                  .fadeIn(duration: 600.ms, delay: 100.ms)
                  .slideY(begin: 0.2, end: 0),
              
              // Disclaimer Banner
              if (_showDisclaimer)
                _buildDisclaimerBanner(context)
                    .animate()
                    .fadeIn(duration: 600.ms, delay: 200.ms)
                    .slideY(begin: 0.2, end: 0),
              
              // Tabs (for HR/Admin)
              if (canApprove)
                _buildTabs(context)
                    .animate()
                    .fadeIn(duration: 600.ms, delay: 300.ms)
                    .slideY(begin: 0.2, end: 0),
              
              // Filter
              _buildFilter(context)
                  .animate()
                  .fadeIn(duration: 600.ms, delay: 400.ms)
                  .slideY(begin: 0.2, end: 0),
              
              // Reimbursements List
              Expanded(
                child: _loading
                    ? const Center(
                        child: CircularProgressIndicator(
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      )
                    : _items.isEmpty
                        ? _buildEmptyState(context)
                        : _buildReimbursementsList(context),
              ),
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showCreateForm,
        backgroundColor: LiquidGlassTheme.primaryPurple,
        foregroundColor: Colors.white,
        child: const Icon(Icons.add_rounded),
      ),
    );
  }

  Widget _buildCustomHeader(BuildContext context, bool canApprove) {
    return Container(
      padding: const EdgeInsets.all(LiquidGlassTheme.spacingM),
      child: Row(
        children: [
          // Title
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Reimbursements',
                  style: LiquidGlassTheme.heading2.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                Text(
                  'Manage expense reimbursements and approvals',
                  style: LiquidGlassTheme.bodyMedium.copyWith(
                    color: Colors.white70,
                  ),
                ),
              ],
            ),
          ),
          // Action Buttons
          Row(
            children: [
              GlassButton(
                onPressed: _showCreateForm,
                backgroundColor: LiquidGlassTheme.primaryPurple,
                foregroundColor: Colors.white,
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.add_rounded, size: 16),
                    SizedBox(width: LiquidGlassTheme.spacingS),
                    Text('New Request'),
                  ],
                ),
              ),
              const SizedBox(width: LiquidGlassTheme.spacingS),
              GlassButton(
                onPressed: _load,
                backgroundColor: Colors.white.withOpacity(0.2),
                foregroundColor: Colors.white,
                child: const Icon(Icons.refresh_rounded, size: 20),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDisclaimerBanner(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: LiquidGlassTheme.spacingM),
      child: GlassCard(
        backgroundColor: Colors.orange.withOpacity(0.2),
        child: Padding(
          padding: const EdgeInsets.all(LiquidGlassTheme.spacingM),
          child: Row(
            children: [
              Icon(
                Icons.warning_rounded,
                color: Colors.orange[300],
                size: 24,
              ),
              const SizedBox(width: LiquidGlassTheme.spacingS),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Important Notice',
                      style: LiquidGlassTheme.bodyLarge.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      'Alcohol bills are not allowed for reimbursement',
                      style: LiquidGlassTheme.bodySmall.copyWith(
                        color: Colors.white70,
                      ),
                    ),
                  ],
                ),
              ),
              GlassButton(
                onPressed: () {
                  setState(() {
                    _showDisclaimer = false;
                  });
                },
                backgroundColor: Colors.white.withOpacity(0.2),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.all(LiquidGlassTheme.spacingS),
                child: const Icon(Icons.close_rounded, size: 16),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTabs(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: LiquidGlassTheme.spacingM),
      child: GlassCard(
        backgroundColor: Colors.white.withOpacity(0.15),
        child: Row(
          children: [
            Expanded(
              child: GlassButton(
                onPressed: () {
                  setState(() {
                    _activeTab = 'my';
                  });
                  _load();
                },
                backgroundColor: _activeTab == 'my' 
                    ? LiquidGlassTheme.primaryPurple 
                    : Colors.white.withOpacity(0.2),
                foregroundColor: Colors.white,
                child: const Text('My Requests'),
              ),
            ),
            const SizedBox(width: LiquidGlassTheme.spacingS),
            Expanded(
              child: GlassButton(
                onPressed: () {
                  setState(() {
                    _activeTab = 'team';
                  });
                  _load();
                },
                backgroundColor: _activeTab == 'team' 
                    ? LiquidGlassTheme.primaryPurple 
                    : Colors.white.withOpacity(0.2),
                foregroundColor: Colors.white,
                child: const Text('Team Requests'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilter(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: LiquidGlassTheme.spacingM),
      child: GlassCard(
        backgroundColor: Colors.white.withOpacity(0.15),
        child: DropdownButtonFormField<String>(
          value: _statusFilter.isEmpty ? null : _statusFilter,
          decoration: InputDecoration(
            hintText: 'Filter by Status',
            hintStyle: LiquidGlassTheme.bodyMedium.copyWith(
              color: Colors.white70,
            ),
            prefixIcon: const Icon(Icons.filter_list_rounded, color: Colors.white70),
            border: InputBorder.none,
          ),
          dropdownColor: Colors.grey[900],
          style: LiquidGlassTheme.bodyMedium.copyWith(
            color: Colors.white,
          ),
          items: const [
            DropdownMenuItem(value: '', child: Text('All Status')),
            DropdownMenuItem(value: 'pending', child: Text('Pending')),
            DropdownMenuItem(value: 'approved', child: Text('Approved')),
            DropdownMenuItem(value: 'rejected', child: Text('Rejected')),
            DropdownMenuItem(value: 'returned', child: Text('Returned')),
          ],
          onChanged: (value) async {
            setState(() {
              _statusFilter = value ?? '';
            });
            await _load();
          },
        ),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: GlassCard(
        backgroundColor: Colors.white.withOpacity(0.15),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.receipt_long_rounded,
              size: 64,
              color: Colors.white70,
            ),
            const SizedBox(height: LiquidGlassTheme.spacingM),
            Text(
              'No reimbursement requests found',
              style: LiquidGlassTheme.heading4.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: LiquidGlassTheme.spacingS),
            Text(
              'Create your first reimbursement request',
              style: LiquidGlassTheme.bodyMedium.copyWith(
                color: Colors.white70,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildReimbursementsList(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.all(LiquidGlassTheme.spacingM),
      itemCount: _items.length,
      itemBuilder: (context, index) {
        final reimbursement = _items[index];
        return Container(
          margin: const EdgeInsets.only(bottom: LiquidGlassTheme.spacingM),
          child: GlassCard(
            backgroundColor: Colors.white.withOpacity(0.15),
            child: Padding(
              padding: const EdgeInsets.all(LiquidGlassTheme.spacingM),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          reimbursement['reason'] ?? '',
                          style: LiquidGlassTheme.bodyLarge.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      _buildStatusChip(reimbursement['status'] ?? 'pending'),
                    ],
                  ),
                  const SizedBox(height: LiquidGlassTheme.spacingS),
                  Row(
                    children: [
                      Icon(Icons.attach_money_rounded, size: 16, color: Colors.white70),
                      const SizedBox(width: 4),
                      Text(
                        '₹${reimbursement['amount']}',
                        style: LiquidGlassTheme.bodyMedium.copyWith(
                          color: Colors.white70,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Icon(Icons.calendar_today_rounded, size: 16, color: Colors.white70),
                      const SizedBox(width: 4),
                      Text(
                        reimbursement['date'] ?? '',
                        style: LiquidGlassTheme.bodyMedium.copyWith(
                          color: Colors.white70,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Icon(Icons.attach_file_rounded, size: 16, color: Colors.white70),
                      const SizedBox(width: 4),
                      Text(
                        '${(reimbursement['bills'] as List? ?? []).length} bill(s)',
                        style: LiquidGlassTheme.bodyMedium.copyWith(
                          color: Colors.white70,
                        ),
                      ),
                    ],
                  ),
                  if (reimbursement['description'] != null && reimbursement['description'].isNotEmpty) ...[
                    const SizedBox(height: LiquidGlassTheme.spacingS),
                    Text(
                      reimbursement['description'],
                      style: LiquidGlassTheme.bodySmall.copyWith(
                        color: Colors.white60,
                      ),
                    ),
                  ],
                  const SizedBox(height: LiquidGlassTheme.spacingM),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      GlassButton(
                        onPressed: () {
                          _showReimbursementDetails(reimbursement);
                        },
                        backgroundColor: Colors.white.withOpacity(0.2),
                        foregroundColor: Colors.white,
                        child: const Text('View'),
                      ),
                      if ((reimbursement['status'] ?? 'pending') == 'pending') ...[
                        const SizedBox(width: LiquidGlassTheme.spacingS),
                        GlassButton(
                          onPressed: () {
                            _showEditForm(reimbursement);
                          },
                          backgroundColor: Colors.white.withOpacity(0.2),
                          foregroundColor: Colors.white,
                          child: const Text('Edit'),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildStatusChip(String status) {
    Color color;
    IconData icon;

    switch (status) {
      case 'approved':
        color = Colors.green;
        icon = Icons.check_circle_rounded;
        break;
      case 'rejected':
        color = Colors.red;
        icon = Icons.cancel_rounded;
        break;
      case 'returned':
        color = Colors.orange;
        icon = Icons.warning_rounded;
        break;
      default:
        color = Colors.blue;
        icon = Icons.schedule_rounded;
    }

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: LiquidGlassTheme.spacingS,
        vertical: LiquidGlassTheme.spacingXS,
      ),
      decoration: BoxDecoration(
        color: color.withOpacity(0.2),
        borderRadius: BorderRadius.circular(LiquidGlassTheme.radiusSmall),
        border: Border.all(color: color.withOpacity(0.5)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 4),
          Text(
            status.toUpperCase(),
            style: LiquidGlassTheme.bodySmall.copyWith(
              color: color,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  void _showReimbursementDetails(Map<String, dynamic> reimbursement) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        child: Container(
          constraints: const BoxConstraints(maxWidth: 600, maxHeight: 500),
          child: GlassCard(
            backgroundColor: Colors.white.withOpacity(0.15),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    reimbursement['reason'] ?? '',
                    style: LiquidGlassTheme.heading3.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 20),
                  Expanded(
                    child: SingleChildScrollView(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Amount: ₹${reimbursement['amount']}',
                            style: LiquidGlassTheme.bodyLarge.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Date: ${reimbursement['date']}',
                            style: LiquidGlassTheme.bodyMedium.copyWith(
                              color: Colors.white.withOpacity(0.8),
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Status: ${reimbursement['status']}',
                            style: LiquidGlassTheme.bodyMedium.copyWith(
                              color: Colors.white.withOpacity(0.8),
                            ),
                          ),
                          if (reimbursement['description'] != null) ...[
                            const SizedBox(height: 8),
                            Text(
                              'Description: ${reimbursement['description']}',
                              style: LiquidGlassTheme.bodyMedium.copyWith(
                                color: Colors.white.withOpacity(0.8),
                              ),
                            ),
                          ],
                          const SizedBox(height: 8),
                          Text(
                            'Bills: ${(reimbursement['bills'] as List? ?? []).length} files',
                            style: LiquidGlassTheme.bodyMedium.copyWith(
                              color: Colors.white.withOpacity(0.8),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  GlassButton(
                    onPressed: () => Navigator.pop(context),
                    child: Text(
                      'Close',
                      style: LiquidGlassTheme.bodyMedium.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  void _showEditForm(Map<String, dynamic> reimbursement) {
    // TODO: Implement edit form
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Edit functionality coming soon')),
    );
  }

  @override
  void dispose() {
    _reasonController.dispose();
    _descriptionController.dispose();
    _amountController.dispose();
    super.dispose();
  }
}

class _CreateReimbursementDialog extends ConsumerStatefulWidget {
  final Function() onSubmitted;
  final List<Map<String, dynamic>> users;
  final bool canApplyForOthers;

  const _CreateReimbursementDialog({
    required this.onSubmitted,
    required this.users,
    required this.canApplyForOthers,
  });

  @override
  ConsumerState<_CreateReimbursementDialog> createState() => _CreateReimbursementDialogState();
}

class _CreateReimbursementDialogState extends ConsumerState<_CreateReimbursementDialog> {
  final _formKey = GlobalKey<FormState>();
  final _reasonController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _amountController = TextEditingController();
  DateTime? _selectedDate;
  List<PlatformFile> _selectedFiles = [];
  bool _isSubmitting = false;
  String? _applyForUserId;

  @override
  void dispose() {
    _reasonController.dispose();
    _descriptionController.dispose();
    _amountController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      child: GlassCard(
        backgroundColor: Colors.white.withOpacity(0.15),
        child: Container(
          width: MediaQuery.of(context).size.width * 0.9,
          constraints: const BoxConstraints(maxWidth: 600, maxHeight: 700),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Header
                Container(
                  padding: const EdgeInsets.all(LiquidGlassTheme.spacingM),
                  child: Row(
                    children: [
                      Icon(
                        Icons.receipt_long_rounded,
                        color: Colors.white,
                        size: 24,
                      ),
                      const SizedBox(width: LiquidGlassTheme.spacingS),
                      Text(
                        'Create Reimbursement Request',
                        style: LiquidGlassTheme.heading4.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const Spacer(),
                      GlassButton(
                        onPressed: () => Navigator.pop(context),
                        backgroundColor: Colors.white.withOpacity(0.2),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.all(LiquidGlassTheme.spacingS),
                        child: const Icon(Icons.close_rounded, size: 16),
                      ),
                    ],
                  ),
                ),
                
                // Form Content
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: LiquidGlassTheme.spacingM),
                  child: Column(
                    children: [
                      GlassTextField(
                        controller: _reasonController,
                        hintText: 'Reason for Payment *',
                        prefixIcon: const Icon(Icons.receipt_rounded, color: Colors.white70),
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Please enter a reason';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: LiquidGlassTheme.spacingM),
                      GlassTextField(
                        controller: _descriptionController,
                        hintText: 'Description (Optional)',
                        prefixIcon: const Icon(Icons.description_rounded, color: Colors.white70),
                        maxLines: 3,
                      ),
                      const SizedBox(height: LiquidGlassTheme.spacingM),
                      Row(
                        children: [
                          Expanded(
                            child: GlassTextField(
                              controller: _amountController,
                              hintText: 'Amount *',
                              prefixIcon: const Icon(Icons.attach_money_rounded, color: Colors.white70),
                              keyboardType: TextInputType.number,
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return 'Please enter amount';
                                }
                                if (double.tryParse(value) == null) {
                                  return 'Please enter valid amount';
                                }
                                return null;
                              },
                            ),
                          ),
                          const SizedBox(width: LiquidGlassTheme.spacingM),
                          Expanded(
                            child: GestureDetector(
                              onTap: _selectDate,
                              child: GlassTextField(
                                hintText: 'Date *',
                                prefixIcon: const Icon(Icons.calendar_today_rounded, color: Colors.white70),
                                readOnly: true,
                                controller: TextEditingController(
                                  text: _selectedDate != null
                                      ? DateFormat('yyyy-MM-dd').format(_selectedDate!)
                                      : '',
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: LiquidGlassTheme.spacingM),
                      
                      // Apply for others (HR/Admin only)
                      if (widget.canApplyForOthers) ...[
                        DropdownButtonFormField<String>(
                          value: _applyForUserId,
                          decoration: InputDecoration(
                            hintText: 'Apply for (Optional)',
                            hintStyle: LiquidGlassTheme.bodyMedium.copyWith(
                              color: Colors.white70,
                            ),
                            prefixIcon: const Icon(Icons.person_rounded, color: Colors.white70),
                            border: InputBorder.none,
                          ),
                          dropdownColor: Colors.grey[900],
                          style: LiquidGlassTheme.bodyMedium.copyWith(
                            color: Colors.white,
                          ),
                          items: [
                            const DropdownMenuItem(
                              value: null,
                              child: Text('Myself'),
                            ),
                            ...widget.users.map((user) => DropdownMenuItem(
                              value: user['id'].toString(),
                              child: Text(user['name'] ?? 'Unknown'),
                            )),
                          ],
                          onChanged: (value) {
                            setState(() {
                              _applyForUserId = value;
                            });
                          },
                        ),
                        const SizedBox(height: LiquidGlassTheme.spacingM),
                      ],
                      
                      // File picker
                      GestureDetector(
                        onTap: _pickFiles,
                        child: Container(
                          width: double.infinity,
                          height: 120,
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(LiquidGlassTheme.radiusMedium),
                            border: Border.all(
                              color: Colors.white.withOpacity(0.3),
                              width: 2,
                              style: BorderStyle.solid,
                            ),
                          ),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                _selectedFiles.isNotEmpty ? Icons.check_circle_rounded : Icons.upload_file_rounded,
                                size: 48,
                                color: _selectedFiles.isNotEmpty ? Colors.green : Colors.white70,
                              ),
                              const SizedBox(height: LiquidGlassTheme.spacingS),
                              Text(
                                _selectedFiles.isNotEmpty 
                                    ? '${_selectedFiles.length} file(s) selected'
                                    : 'Tap to upload bills',
                                style: LiquidGlassTheme.bodyMedium.copyWith(
                                  color: Colors.white70,
                                ),
                                textAlign: TextAlign.center,
                              ),
                              Text(
                                'Supported: PDF, JPG, PNG',
                                style: LiquidGlassTheme.bodySmall.copyWith(
                                  color: Colors.white60,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      
                      // Selected files list
                      if (_selectedFiles.isNotEmpty) ...[
                        const SizedBox(height: LiquidGlassTheme.spacingM),
                        Container(
                          constraints: const BoxConstraints(maxHeight: 150),
                          child: ListView.builder(
                            shrinkWrap: true,
                            itemCount: _selectedFiles.length,
                            itemBuilder: (context, index) {
                              final file = _selectedFiles[index];
                              return ListTile(
                                leading: const Icon(Icons.attach_file_rounded, color: Colors.white70),
                                title: Text(
                                  file.name,
                                  style: LiquidGlassTheme.bodySmall.copyWith(
                                    color: Colors.white70,
                                  ),
                                ),
                                trailing: IconButton(
                                  icon: const Icon(Icons.delete_rounded, color: Colors.red),
                                  onPressed: () {
                                    setState(() {
                                      _selectedFiles.removeAt(index);
                                    });
                                  },
                                ),
                              );
                            },
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                
                // Action Buttons
                Container(
                  padding: const EdgeInsets.all(LiquidGlassTheme.spacingM),
                  child: Row(
                    children: [
                      Expanded(
                        child: GlassButton(
                          onPressed: _isSubmitting ? null : () => Navigator.pop(context),
                          backgroundColor: Colors.white.withOpacity(0.2),
                          foregroundColor: Colors.white,
                          child: const Text('Cancel'),
                        ),
                      ),
                      const SizedBox(width: LiquidGlassTheme.spacingM),
                      Expanded(
                        child: GlassButton(
                          onPressed: _isSubmitting ? null : _submitForm,
                          backgroundColor: _isSubmitting 
                              ? Colors.white.withOpacity(0.2)
                              : LiquidGlassTheme.primaryPurple,
                          foregroundColor: Colors.white,
                          child: _isSubmitting 
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                  ),
                                )
                              : const Text('Submit'),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
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

  Future<void> _pickFiles() async {
    FilePickerResult? result = await FilePicker.platform.pickFiles(
      allowMultiple: true,
      type: FileType.custom,
      allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png'],
    );

    if (result != null) {
      setState(() {
        _selectedFiles = result.files;
      });
    }
  }

  Future<void> _submitForm() async {
    if (!_formKey.currentState!.validate()) return;
    
    if (_selectedDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a date')),
      );
      return;
    }
    
    if (_selectedFiles.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please upload at least one bill')),
      );
      return;
    }
    
    setState(() {
      _isSubmitting = true;
    });

    try {
      final api = ref.read(apiServiceProvider);
      await api.createReimbursement(
        reason: _reasonController.text.trim(),
        description: _descriptionController.text.trim(),
        amount: double.parse(_amountController.text.trim()),
        date: DateFormat('yyyy-MM-dd').format(_selectedDate!),
        bills: _selectedFiles,
        applyForUserId: _applyForUserId,
      );
      
      Navigator.pop(context);
      widget.onSubmitted();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Reimbursement request submitted successfully')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to submit request: $e')),
      );
    } finally {
      setState(() {
        _isSubmitting = false;
      });
    }
  }
}
