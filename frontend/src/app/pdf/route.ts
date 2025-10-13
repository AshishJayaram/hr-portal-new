import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-static';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileUrl = searchParams.get('url');
    const title = searchParams.get('title') || 'PDF Document';
    
    if (!fileUrl) {
      return new NextResponse('Missing file URL parameter', { status: 400 });
    }

    // Validate that the URL is a PDF
    if (!fileUrl.toLowerCase().endsWith('.pdf')) {
      return new NextResponse('File must be a PDF', { status: 400 });
    }

    // Create HTML page that embeds the PDF viewer
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background: #111827;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            overflow: hidden;
        }
        
        .pdf-container {
            width: 100vw;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .pdf-header {
            background: #1f2937;
            border-bottom: 1px solid #374151;
            padding: 1rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            color: white;
        }
        
        .pdf-title {
            font-size: 1.125rem;
            font-weight: 600;
            margin: 0;
            flex: 1;
            margin-right: 1rem;
        }
        
        .pdf-controls {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .pdf-button {
            background: #374151;
            border: 1px solid #4b5563;
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 0.375rem;
            cursor: pointer;
            font-size: 0.875rem;
            transition: all 0.2s;
        }
        
        .pdf-button:hover {
            background: #4b5563;
        }
        
        .pdf-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .pdf-zoom {
            display: flex;
            align-items: center;
            gap: 0.25rem;
            margin-right: 1rem;
        }
        
        .pdf-iframe-container {
            flex: 1;
            position: relative;
            overflow: hidden;
        }
        
        .pdf-iframe {
            width: 100%;
            height: 100%;
            border: none;
        }
        
        .loading {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #111827;
            color: white;
        }
        
        .loading-spinner {
            width: 3rem;
            height: 3rem;
            border: 3px solid #374151;
            border-top: 3px solid #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .error {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #111827;
            color: white;
            text-align: center;
            padding: 2rem;
        }
        
        .error-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
        }
        
        .error-title {
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
        }
        
        .error-message {
            color: #9ca3af;
            margin-bottom: 1rem;
        }
    </style>
</head>
<body>
    <div class="pdf-container">
        <div class="pdf-header">
            <h1 class="pdf-title">${title}</h1>
            <div class="pdf-controls">
                <div class="pdf-zoom">
                    <button class="pdf-button" onclick="zoomOut()" id="zoomOutBtn">-</button>
                    <span id="zoomLevel">100%</span>
                    <button class="pdf-button" onclick="zoomIn()" id="zoomInBtn">+</button>
                    <button class="pdf-button" onclick="resetZoom()">Reset</button>
                </div>
                <button class="pdf-button" onclick="downloadPDF()">📥 Download</button>
                <button class="pdf-button" onclick="printPDF()">🖨️ Print</button>
            </div>
        </div>
        
        <div class="pdf-iframe-container">
            <div class="loading" id="loading">
                <div>
                    <div class="loading-spinner"></div>
                    <p style="margin-top: 1rem;">Loading PDF...</p>
                </div>
            </div>
            
            <div class="error" id="error" style="display: none;">
                <div>
                    <div class="error-icon">📄</div>
                    <div class="error-title">Unable to load PDF</div>
                    <div class="error-message" id="errorMessage">Failed to load PDF. Please check if the file exists and you have permission to view it.</div>
                    <button class="pdf-button" onclick="window.location.reload()">Try Again</button>
                </div>
            </div>
            
            <iframe 
                class="pdf-iframe" 
                src="${fileUrl}" 
                id="pdfFrame"
                onload="handleLoad()"
                onerror="handleError()"
                title="${title}"
            ></iframe>
        </div>
    </div>

    <script>
        let scale = 1;
        const minScale = 0.5;
        const maxScale = 3;
        
        function updateZoom() {
            const iframe = document.getElementById('pdfFrame');
            const zoomLevel = document.getElementById('zoomLevel');
            const zoomOutBtn = document.getElementById('zoomOutBtn');
            const zoomInBtn = document.getElementById('zoomInBtn');
            
            iframe.style.transform = \`scale(\${scale})\`;
            iframe.style.transformOrigin = 'top left';
            iframe.style.width = \`\${100 / scale}%\`;
            iframe.style.height = \`\${100 / scale}%\`;
            
            zoomLevel.textContent = \`\${Math.round(scale * 100)}%\`;
            zoomOutBtn.disabled = scale <= minScale;
            zoomInBtn.disabled = scale >= maxScale;
        }
        
        function zoomIn() {
            if (scale < maxScale) {
                scale = Math.min(scale + 0.25, maxScale);
                updateZoom();
            }
        }
        
        function zoomOut() {
            if (scale > minScale) {
                scale = Math.max(scale - 0.25, minScale);
                updateZoom();
            }
        }
        
        function resetZoom() {
            scale = 1;
            updateZoom();
        }
        
        function downloadPDF() {
            const link = document.createElement('a');
            link.href = '${fileUrl}';
            link.download = '${title}';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        
        function printPDF() {
            const iframe = document.getElementById('pdfFrame');
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.print();
            }
        }
        
        function handleLoad() {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('error').style.display = 'none';
        }
        
        function handleError() {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('error').style.display = 'flex';
        }
        
        // Initialize zoom
        updateZoom();
        
        // Handle keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case '=':
                    case '+':
                        e.preventDefault();
                        zoomIn();
                        break;
                    case '-':
                        e.preventDefault();
                        zoomOut();
                        break;
                    case '0':
                        e.preventDefault();
                        resetZoom();
                        break;
                    case 'p':
                        e.preventDefault();
                        printPDF();
                        break;
                }
            }
        });
    </script>
</body>
</html>
    `;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('PDF viewer error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
