/**
 * Utility functions for handling PDF viewing
 */

/**
 * Opens a PDF file in the PDF viewer
 * @param fileUrl - The URL of the PDF file
 * @param title - The title to display for the PDF
 */
export function openPDFViewer(fileUrl: string, title?: string) {
  // Check if the file is a PDF
  if (!fileUrl.toLowerCase().endsWith('.pdf')) {
    // For non-PDF files, open in new tab as before
    window.open(fileUrl, '_blank');
    return;
  }

  // For PDF files, open in our PDF viewer
  const pdfViewerUrl = `/pdf?url=${encodeURIComponent(fileUrl)}&title=${encodeURIComponent(title || 'PDF Document')}`;
  window.open(pdfViewerUrl, '_blank');
}

/**
 * Checks if a file URL is a PDF
 * @param fileUrl - The URL of the file
 * @returns true if the file is a PDF
 */
export function isPDFFile(fileUrl: string): boolean {
  return fileUrl.toLowerCase().endsWith('.pdf');
}

/**
 * Gets the appropriate icon for a file type
 * @param fileUrl - The URL of the file
 * @returns The icon component or emoji
 */
export function getFileIcon(fileUrl: string): string {
  const extension = fileUrl.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'pdf':
      return '📄';
    case 'doc':
    case 'docx':
      return '📝';
    case 'xls':
    case 'xlsx':
      return '📊';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return '🖼️';
    case 'zip':
    case 'rar':
      return '📦';
    default:
      return '📁';
  }
}

/**
 * Gets the display text for a file type
 * @param fileUrl - The URL of the file
 * @returns The display text for the file type
 */
export function getFileTypeText(fileUrl: string): string {
  const extension = fileUrl.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'pdf':
      return 'PDF Document';
    case 'doc':
    case 'docx':
      return 'Word Document';
    case 'xls':
    case 'xlsx':
      return 'Excel Spreadsheet';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return 'Image';
    case 'zip':
    case 'rar':
      return 'Archive';
    default:
      return 'File';
  }
}
