import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../shared/widgets/app_drawer.dart';
import '../../core/theme/app_theme.dart';

class DocumentsScreen extends ConsumerStatefulWidget {
  @override
  ConsumerState<DocumentsScreen> createState() => _DocumentsScreenState();
}

class _DocumentsScreenState extends ConsumerState<DocumentsScreen> {
  final List<Map<String, dynamic>> _documents = [];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Documents'),
        actions: [
          IconButton(
            icon: const Icon(Icons.upload),
            onPressed: () {
              _uploadDocument();
            },
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadDocuments,
          ),
        ],
      ),
      drawer: const AppDrawer(),
      body: Column(
        children: [
          // Search and Filter Bar
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    decoration: InputDecoration(
                      hintText: 'Search documents...',
                      prefixIcon: const Icon(Icons.search),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  onPressed: () {
                    _showFilterOptions();
                  },
                  icon: const Icon(Icons.filter_list),
                ),
              ],
            ),
          ),
          
          // Documents List
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _documents.length,
              itemBuilder: (context, index) {
                final document = _documents[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    leading: Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: _getFileTypeColor(document['type']),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(
                        _getFileTypeIcon(document['type']),
                        color: Colors.white,
                      ),
                    ),
                    title: Text(
                      document['name'],
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(document['category']),
                        Text(
                          '${document['size']} • ${document['uploadDate']}',
                          style: TextStyle(
                            color: AppTheme.secondaryColor,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                    trailing: PopupMenuButton<String>(
                      onSelected: (value) {
                        switch (value) {
                          case 'download':
                            _downloadDocument(document['id']);
                            break;
                          case 'share':
                            _shareDocument(document['id']);
                            break;
                          case 'delete':
                            _deleteDocument(document['id']);
                            break;
                        }
                      },
                      itemBuilder: (context) => [
                        const PopupMenuItem(
                          value: 'download',
                          child: Text('Download'),
                        ),
                        const PopupMenuItem(
                          value: 'share',
                          child: Text('Share'),
                        ),
                        const PopupMenuItem(
                          value: 'delete',
                          child: Text('Delete'),
                        ),
                      ],
                    ),
                    onTap: () {
                      _viewDocument(document['id']);
                    },
                  ),
                );
              },
            ),
          ),
        ],
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

  void _loadDocuments() {
    // TODO: Implement documents loading
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Documents refreshed')),
    );
  }

  void _uploadDocument() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Upload Document'),
        content: const Text('Document upload functionality - Coming Soon'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  void _viewDocument(String documentId) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Viewing document $documentId')),
    );
  }

  void _downloadDocument(String documentId) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Downloading document $documentId')),
    );
  }

  void _shareDocument(String documentId) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Sharing document $documentId')),
    );
  }

  void _deleteDocument(String documentId) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Document'),
        content: const Text('Are you sure you want to delete this document?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Document $documentId deleted')),
              );
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  void _showFilterOptions() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Filter Documents'),
        content: const Text('Filter options - Coming Soon'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }
}
