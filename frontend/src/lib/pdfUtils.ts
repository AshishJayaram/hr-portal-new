/**
 * Utility functions for handling PDF viewing
 */

/**
 * Opens a PDF file in the PDF viewer
 * @param fileUrl - The URL of the PDF file
 * @param title - The title to display for the PDF
 */
export function openPDFViewer(fileUrl: string, title?: string) {
  const isPDF = fileUrl.toLowerCase().endsWith('.pdf');
  const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

  // Build destination URL
  const destination = isPDF
    ? `/pdf?url=${encodeURIComponent(fileUrl)}&title=${encodeURIComponent(title || 'PDF Document')}`
    : fileUrl;

  // On mobile browsers, opening new tabs can be blocked; navigate in the same tab
  if (isMobile) {
    window.location.assign(destination);
    return;
  }

  // Desktop: open in new tab with safe rel
  const a = document.createElement('a');
  a.href = destination;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  if (!isPDF) {
    // Hint download for non-PDF files
    a.download = title || '';
  }
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
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
