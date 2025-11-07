import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../shared/widgets/app_drawer.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/liquid_glass_theme.dart';
import '../../core/widgets/glass_components.dart';
import '../../core/services/api_service.dart';
import '../../core/providers/providers.dart';

class DocumentsScreen extends ConsumerStatefulWidget {
  @override
  ConsumerState<DocumentsScreen> createState() => _DocumentsScreenState();
}

class _DocumentsScreenState extends ConsumerState<DocumentsScreen> {
  final List<Map<String, dynamic>> _documents = [];
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadDocuments();
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final currentUser = authState.user;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final canManageDocuments = currentUser?.role == 'HR' || currentUser?.role == 'Admin' || currentUser?.role == 'God';
    
    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(kToolbarHeight),
        child: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          leading: Builder(
            builder: (context) => IconButton(
              icon: const Icon(Icons.menu),
              onPressed: () => Scaffold.of(context).openDrawer(),
            ),
          ),
          title: const Text('Documents'),
          centerTitle: false,
        ),
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
              _buildCustomHeader(context, canManageDocuments)
                  .animate()
                  .fadeIn(duration: 600.ms, delay: 100.ms)
                  .slideY(begin: 0.2, end: 0),
              
              // Search and Filter Bar
              _buildSearchFilter(context)
                  .animate()
                  .fadeIn(duration: 600.ms, delay: 200.ms)
                  .slideY(begin: 0.2, end: 0),
              
              // Documents List
              Expanded(
                child: _isLoading
                    ? const Center(
                        child: CircularProgressIndicator(
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      )
                    : _documents.isEmpty
                        ? _buildEmptyState(context)
                        : _buildDocumentsList(context, canManageDocuments),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _getFileTypeColor(String type) {
    switch (type.toUpperCase()) {
      case 'PDF':
        return Colors.red;
      case 'DOCX':
      case 'DOC':
        return Colors.blue;
      case 'PPTX':
      case 'PPT':
        return Colors.orange;
      case 'TXT':
        return Colors.grey;
      default:
        return AppTheme.primaryColor;
    }
  }

  IconData _getFileTypeIcon(String type) {
    switch (type.toUpperCase()) {
      case 'PDF':
        return Icons.picture_as_pdf;
      case 'DOCX':
      case 'DOC':
        return Icons.description;
      case 'PPTX':
      case 'PPT':
        return Icons.slideshow;
      case 'TXT':
        return Icons.text_snippet;
      default:
        return Icons.insert_drive_file;
    }
  }

  Future<void> _loadDocuments() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final apiService = ref.read(apiServiceProvider);
      final authState = ref.read(authProvider);
      final currentUser = authState.user;
      
      List<Map<String, dynamic>> documents = [];
      
      if (currentUser != null) {
        // Get documents that are either public or assigned to the current user
        final allDocuments = await apiService.getDocuments();
        
        // Apply role-based filtering like frontend
        documents = allDocuments.where((doc) {
          if (currentUser.role == 'HR' || currentUser.role == 'Admin' || currentUser.role == 'God') {
            return true; // HR/Admin can see all documents
          }
          // Employees can see: their own documents + public documents
          bool isPublic = doc['is_public'] == true || doc['is_public'] == 1;
          bool isAssignedToUser = doc['user_id'] == currentUser.id;
          
          return isPublic || isAssignedToUser;
        }).toList();
      }

      setState(() {
        _documents.clear();
        _documents.addAll(documents);
        _isLoading = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Documents refreshed')),
      );
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to load documents: $e')),
      );
    }
  }

  void _uploadDocument() {
    showDialog(
      context: context,
      builder: (context) => _UploadDocumentDialog(
        onUpload: (formData) async {
          try {
            final apiService = ref.read(apiServiceProvider);
            final result = await apiService.uploadDocument(formData);
            
            if (result != null) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Document uploaded successfully')),
              );
              _loadDocuments();
            } else {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Failed to upload document')),
              );
            }
          } catch (e) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Upload failed: $e')),
            );
          }
        },
      ),
    );
  }

  Future<void> _viewDocument(Map<String, dynamic> document) async {
    try {
      final apiService = ref.read(apiServiceProvider);
      final fileUrl = await apiService.downloadDocument(document['id']);
      
      if (fileUrl != null) {
        // Open the document in a web view or external viewer
        _showDocumentViewer(document['title'] ?? 'Document', fileUrl);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to load document')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error viewing document: $e')),
      );
    }
  }

  Future<void> _downloadDocument(Map<String, dynamic> document) async {
    try {
      final apiService = ref.read(apiServiceProvider);
      final fileUrl = await apiService.downloadDocument(document['id']);
      
      if (fileUrl != null) {
        // For now, show the URL - in a real app, you'd use url_launcher
        _showDownloadDialog(document['title'] ?? 'Document', fileUrl);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to get download link')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error downloading document: $e')),
      );
    }
  }

  void _showDocumentViewer(String title, String fileUrl) {
    showDialog(
      context: context,
      builder: (context) {
        return Dialog(
          backgroundColor: Colors.transparent,
          child: Container(
            constraints: const BoxConstraints(maxWidth: 800, maxHeight: 600),
            child: GlassCard(
              backgroundColor: Colors.white.withOpacity(0.15),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text(
                      title,
                      style: LiquidGlassTheme.heading3.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  Expanded(
                    child: Container(
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.grey),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Column(
                        children: [
                          // PDF Viewer Placeholder
                          Expanded(
                            child: Container(
                              color: Colors.grey[50],
                              child: Center(
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Icon(Icons.picture_as_pdf, size: 64, color: Colors.red),
                                    const SizedBox(height: 16),
                                    Text(
                                      'PDF Viewer',
                                      style: TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.grey[700],
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      'Document: $title',
                                      style: TextStyle(
                                        fontSize: 14,
                                        color: Colors.grey[600],
                                      ),
                                      textAlign: TextAlign.center,
                                    ),
                                    const SizedBox(height: 16),
                                    Container(
                                      padding: const EdgeInsets.all(12),
                                      decoration: BoxDecoration(
                                        color: Colors.blue[50],
                                        borderRadius: BorderRadius.circular(8),
                                        border: Border.all(color: Colors.blue[200]!),
                                      ),
                                      child: Column(
                                        children: [
                                          const Icon(Icons.info_outline, color: Colors.blue),
                                          const SizedBox(height: 8),
                                          Text(
                                            'PDF viewer integration required',
                                            style: TextStyle(
                                              fontSize: 12,
                                              color: Colors.blue[700],
                                              fontWeight: FontWeight.w500,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            'Use packages like flutter_pdfview or pdfx',
                                            style: TextStyle(
                                              fontSize: 10,
                                              color: Colors.blue[600],
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
                          // Action buttons
                          Container(
                            padding: const EdgeInsets.all(16),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                              children: [
                                ElevatedButton.icon(
                                  onPressed: () {
                                    Navigator.pop(context);
                                    _showDownloadDialog(title, fileUrl);
                                  },
                                  icon: const Icon(Icons.download),
                                  label: const Text('Download'),
                                ),
                                ElevatedButton.icon(
                                  onPressed: () {
                                    // In a real app, you would use url_launcher
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(content: Text('Opening in external viewer...')),
                                    );
                                    Navigator.pop(context);
                                  },
                                  icon: const Icon(Icons.open_in_new),
                                  label: const Text('Open External'),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  void _showDownloadDialog(String title, String fileUrl) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        child: Container(
          constraints: const BoxConstraints(maxWidth: 500, maxHeight: 400),
          child: GlassCard(
            backgroundColor: Colors.white.withOpacity(0.15),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Download $title',
                    style: LiquidGlassTheme.heading3.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Document is ready for download.',
                    style: LiquidGlassTheme.bodyMedium.copyWith(
                      color: Colors.white.withOpacity(0.8),
                    ),
                  ),
                  const SizedBox(height: 20),
                  GlassButton(
                    onPressed: () {
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Opening document in browser...')),
                      );
                    },
                    child: Text(
                      'Open in Browser',
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

  void _shareDocument(String documentId) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Sharing document $documentId')),
    );
  }

  void _showCategoryFilter() {
    // Get unique categories
    final categories = _documents.map((d) => d['category']).toSet().toList();
    
    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        child: Container(
          constraints: const BoxConstraints(maxWidth: 500, maxHeight: 600),
          child: GlassCard(
            backgroundColor: Colors.white.withOpacity(0.15),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Filter by Category',
                    style: LiquidGlassTheme.heading3.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 20),
                  Expanded(
                    child: ListView.builder(
                      shrinkWrap: true,
                      itemCount: categories.length + 1,
                      itemBuilder: (context, index) {
                        if (index == 0) {
                          return ListTile(
                            title: Text(
                              'All Categories',
                              style: LiquidGlassTheme.bodyMedium.copyWith(
                                color: Colors.white,
                              ),
                            ),
                            onTap: () {
                              Navigator.pop(context);
                              // Apply filter for all categories
                            },
                          );
                        }
                        final category = categories[index - 1];
                        return ListTile(
                          title: Text(
                            category ?? 'Unknown',
                            style: LiquidGlassTheme.bodyMedium.copyWith(
                              color: Colors.white,
                            ),
                          ),
                          onTap: () {
                            Navigator.pop(context);
                            // Apply filter for specific category
                          },
                        );
                      },
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

  Future<void> _deleteDocument(String documentId) async {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        child: Container(
          constraints: const BoxConstraints(maxWidth: 400, maxHeight: 300),
          child: GlassCard(
            backgroundColor: Colors.white.withOpacity(0.15),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Delete Document',
                    style: LiquidGlassTheme.heading3.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Are you sure you want to delete this document?',
                    style: LiquidGlassTheme.bodyMedium.copyWith(
                      color: Colors.white.withOpacity(0.8),
                    ),
                  ),
                  const SizedBox(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      GlassButton(
                        onPressed: () => Navigator.pop(context),
                        child: Text(
                          'Cancel',
                          style: LiquidGlassTheme.bodyMedium.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      GlassButton(
                        onPressed: () async {
                          Navigator.pop(context);
                          try {
                            final apiService = ref.read(apiServiceProvider);
                            final success = await apiService.deleteDocument(documentId);

                            if (success) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Document deleted successfully')),
                              );
                              _loadDocuments();
                            } else {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Failed to delete document')),
                              );
                            }
                          } catch (e) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('Failed to delete document: $e')),
                            );
                          }
                        },
                        child: Text(
                          'Delete',
                          style: LiquidGlassTheme.bodyMedium.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                          ),
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

  String _formatDate(String? dateString) {
    if (dateString == null) return '';
    try {
      final date = DateTime.parse(dateString);
      return '${date.day}/${date.month}/${date.year}';
    } catch (e) {
      return '';
    }
  }

  void _showFilterOptions() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Filter Documents'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              title: const Text('All Documents'),
              onTap: () {
                Navigator.pop(context);
                // Apply filter for all documents
              },
            ),
            ListTile(
              title: const Text('Public Documents'),
              onTap: () {
                Navigator.pop(context);
                // Apply filter for public documents only
              },
            ),
            ListTile(
              title: const Text('Private Documents'),
              onTap: () {
                Navigator.pop(context);
                // Apply filter for private documents only
              },
            ),
            ListTile(
              title: const Text('By Category'),
              onTap: () {
                Navigator.pop(context);
                _showCategoryFilter();
              },
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  Widget _buildCustomHeader(BuildContext context, bool canManageDocuments) {
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
                  'Documents',
                  style: LiquidGlassTheme.heading2.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                Text(
                  'Manage and access organizational documents',
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
              if (canManageDocuments)
                GlassButton(
                  onPressed: () => _uploadDocument(),
                  backgroundColor: LiquidGlassTheme.primaryPurple,
                  foregroundColor: Colors.white,
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.upload_rounded, size: 16),
                      SizedBox(width: LiquidGlassTheme.spacingS),
                      Text('Upload Document'),
                    ],
                  ),
                ),
              const SizedBox(width: LiquidGlassTheme.spacingS),
              GlassButton(
                onPressed: _loadDocuments,
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

  Widget _buildSearchFilter(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: LiquidGlassTheme.spacingM),
      child: GlassCard(
        backgroundColor: Colors.white.withOpacity(0.15),
        child: Row(
          children: [
            Expanded(
              child: GlassTextField(
                hintText: 'Search documents by title or category...',
                prefixIcon: const Icon(Icons.search_rounded, color: Colors.white70),
              ),
            ),
            const SizedBox(width: LiquidGlassTheme.spacingS),
            GlassButton(
              onPressed: () => _showFilterOptions(),
              backgroundColor: Colors.white.withOpacity(0.2),
              foregroundColor: Colors.white,
              child: const Icon(Icons.filter_list_rounded, size: 20),
            ),
          ],
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
              Icons.folder_open_rounded,
              size: 64,
              color: Colors.white70,
            ),
            const SizedBox(height: LiquidGlassTheme.spacingM),
            Text(
              'No documents found',
              style: LiquidGlassTheme.heading4.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: LiquidGlassTheme.spacingS),
            Text(
              'Upload your first document to get started',
              style: LiquidGlassTheme.bodyMedium.copyWith(
                color: Colors.white70,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDocumentsList(BuildContext context, bool canManageDocuments) {
    return ListView.builder(
      padding: const EdgeInsets.all(LiquidGlassTheme.spacingM),
      itemCount: _documents.length,
      itemBuilder: (context, index) {
        final document = _documents[index];
        return Container(
          margin: const EdgeInsets.only(bottom: LiquidGlassTheme.spacingM),
          child: GlassCard(
            backgroundColor: Colors.white.withOpacity(0.15),
            child: ListTile(
              leading: Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: _getFileTypeColor(document['mime_type'] ?? ''),
                  borderRadius: BorderRadius.circular(LiquidGlassTheme.radiusMedium),
                ),
                child: Icon(
                  _getFileTypeIcon(document['mime_type'] ?? ''),
                  color: Colors.white,
                  size: 24,
                ),
              ),
              title: Text(
                document['title'] ?? 'Untitled',
                style: LiquidGlassTheme.bodyLarge.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                ),
              ),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    document['category'] ?? '',
                    style: LiquidGlassTheme.bodyMedium.copyWith(
                      color: Colors.white70,
                    ),
                  ),
                  Text(
                    '${document['file_name'] ?? ''} • ${_formatDate(document['created_at'])}',
                    style: LiquidGlassTheme.bodySmall.copyWith(
                      color: Colors.white60,
                    ),
                  ),
                ],
              ),
              trailing: canManageDocuments
                  ? GlassButton(
                      onPressed: () => _deleteDocument(document['id']),
                      backgroundColor: Colors.red.withOpacity(0.3),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.all(LiquidGlassTheme.spacingS),
                      child: const Icon(Icons.delete_rounded, size: 16),
                    )
                  : null,
            ),
          ),
        );
      },
    );
  }
}

class _UploadDocumentDialog extends ConsumerStatefulWidget {
  final Function(FormData) onUpload;

  const _UploadDocumentDialog({required this.onUpload});

  @override
  ConsumerState<_UploadDocumentDialog> createState() => _UploadDocumentDialogState();
}

class _UploadDocumentDialogState extends ConsumerState<_UploadDocumentDialog> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _categoryController = TextEditingController();
  bool _isPublic = false;
  bool _isUploading = false;
  PlatformFile? _selectedFile;

  @override
  void dispose() {
    _titleController.dispose();
    _categoryController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
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
                        Icons.upload_rounded,
                        color: Colors.white,
                        size: 24,
                      ),
                      const SizedBox(width: LiquidGlassTheme.spacingS),
                      Text(
                        'Upload Document',
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
                        controller: _titleController,
                        hintText: 'Document Title',
                        prefixIcon: const Icon(Icons.title_rounded, color: Colors.white70),
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Please enter a title';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: LiquidGlassTheme.spacingM),
                      GlassTextField(
                        controller: _categoryController,
                        hintText: 'Category',
                        prefixIcon: const Icon(Icons.category_rounded, color: Colors.white70),
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Please enter a category';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: LiquidGlassTheme.spacingM),
                      
                      // Public checkbox
                      Row(
                        children: [
                          Checkbox(
                            value: _isPublic,
                            onChanged: (value) {
                              setState(() {
                                _isPublic = value ?? false;
                              });
                            },
                            activeColor: LiquidGlassTheme.primaryPurple,
                          ),
                          Text(
                            'Make this document public',
                            style: LiquidGlassTheme.bodyMedium.copyWith(
                              color: Colors.white70,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: LiquidGlassTheme.spacingM),
                      
                      // File picker
                      GestureDetector(
                        onTap: _pickFile,
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
                                _selectedFile != null ? Icons.check_circle_rounded : Icons.cloud_upload_rounded,
                                size: 48,
                                color: _selectedFile != null ? Colors.green : Colors.white70,
                              ),
                              const SizedBox(height: LiquidGlassTheme.spacingS),
                              Text(
                                _selectedFile != null 
                                    ? 'File selected: ${_selectedFile!.name}'
                                    : 'Tap to select a file',
                                style: LiquidGlassTheme.bodyMedium.copyWith(
                                  color: Colors.white70,
                                ),
                                textAlign: TextAlign.center,
                              ),
                              if (_selectedFile != null)
                                Text(
                                  '${(_selectedFile!.size / 1024 / 1024).toStringAsFixed(2)} MB',
                                  style: LiquidGlassTheme.bodySmall.copyWith(
                                    color: Colors.white60,
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
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
                          onPressed: _isUploading ? null : () => Navigator.pop(context),
                          backgroundColor: Colors.white.withOpacity(0.2),
                          foregroundColor: Colors.white,
                          child: const Text('Cancel'),
                        ),
                      ),
                      const SizedBox(width: LiquidGlassTheme.spacingM),
                      Expanded(
                        child: GlassButton(
                          onPressed: _isUploading ? null : _uploadFile,
                          backgroundColor: _isUploading 
                              ? Colors.white.withOpacity(0.2)
                              : LiquidGlassTheme.primaryPurple,
                          foregroundColor: Colors.white,
                          child: _isUploading 
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                  ),
                                )
                              : const Text('Upload'),
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

  Future<void> _pickFile() async {
    try {
      FilePickerResult? result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png'],
      );

      if (result != null) {
        setState(() {
          _selectedFile = result.files.first;
        });
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to pick file: $e')),
      );
    }
  }

  Future<void> _uploadFile() async {
    if (!_formKey.currentState!.validate()) return;
    
    if (_selectedFile == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a file to upload')),
      );
      return;
    }
    
    setState(() {
      _isUploading = true;
    });

    try {
      final apiService = ref.read(apiServiceProvider);
      final authState = ref.read(authProvider);
      final currentUser = authState.user;
      
      if (currentUser == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('User not found. Please login again.')),
        );
        return;
      }

      // Create FormData with actual file
      final formData = FormData.fromMap({
        'title': _titleController.text,
        'category': _categoryController.text,
        'is_public': _isPublic.toString(),
        'user_id': currentUser.id,
        'organization_id': currentUser.organizationId,
        'file': await MultipartFile.fromFile(
          _selectedFile!.path!,
          filename: _selectedFile!.name,
        ),
      });

      await widget.onUpload(formData);
      Navigator.pop(context);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Upload failed: $e')),
      );
    } finally {
      setState(() {
        _isUploading = false;
      });
    }
  }
}
