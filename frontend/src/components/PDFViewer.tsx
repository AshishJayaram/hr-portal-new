"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";

interface PDFViewerProps {
  url: string;
  title?: string;
  className?: string;
}

export default function PDFViewer({ url, title = "PDF Document", className = "" }: PDFViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    
    // Reset scale and page when URL changes
    setScale(1);
    setPageNumber(1);
    setTotalPages(0);
  }, [url]);

  const handleLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  const handleError = () => {
    setIsLoading(false);
    setError("Failed to load PDF. Please check if the file exists and you have permission to view it.");
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  const resetZoom = () => {
    setScale(1);
  };

  const downloadPDF = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = title.endsWith('.pdf') ? title : `${title}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printPDF = () => {
    if (iframeRef.current) {
      iframeRef.current.contentWindow?.print();
    }
  };

  return (
    <div className={`flex flex-col h-full bg-gray-900 ${className}`}>
      {/* Header with controls */}
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-white truncate max-w-md">
            {title}
          </h2>
          {totalPages > 0 && (
            <span className="text-sm text-gray-400">
              Page {pageNumber} of {totalPages}
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Zoom controls */}
          <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={zoomOut}
              disabled={scale <= 0.5}
              className="px-2 py-1 text-xs"
            >
              -
            </Button>
            <span className="text-sm text-gray-300 min-w-[3rem] text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={zoomIn}
              disabled={scale >= 3}
              className="px-2 py-1 text-xs"
            >
              +
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={resetZoom}
              className="px-2 py-1 text-xs"
            >
              Reset
            </Button>
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center space-x-1 ml-4">
            <Button
              variant="outline"
              size="sm"
              onClick={downloadPDF}
              className="px-3 py-1 text-xs"
            >
              📥 Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={printPDF}
              className="px-3 py-1 text-xs"
            >
              🖨️ Print
            </Button>
          </div>
        </div>
      </div>

      {/* PDF Content */}
      <div className="flex-1 relative overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading PDF...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
            <div className="text-center max-w-md">
              <div className="text-red-500 text-6xl mb-4">📄</div>
              <h3 className="text-xl font-semibold text-white mb-2">Unable to load PDF</h3>
              <p className="text-gray-400 mb-4">{error}</p>
              <Button onClick={() => window.location.reload()} variant="outline">
                Try Again
              </Button>
            </div>
          </div>
        )}

        <iframe
          ref={iframeRef}
          src={url}
          className="w-full h-full border-0"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            width: `${100 / scale}%`,
            height: `${100 / scale}%`,
          }}
          onLoad={handleLoad}
          onError={handleError}
          title={title}
        />
      </div>
    </div>
  );
}
