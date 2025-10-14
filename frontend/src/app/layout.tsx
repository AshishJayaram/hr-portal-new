import "./globals.css";
import ClientLayout from "../components/ClientLayout";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* AI-Friendly Meta Tags */}
        <meta name="description" content="Comprehensive HR Portal for employee management, leave tracking, document management, and organizational administration" />
        <meta name="keywords" content="HR, human resources, employee management, leave management, document management, payroll, attendance, holidays, off-site tracking" />
        <meta name="author" content="HR Portal Team" />
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
        <meta name="googlebot" content="index, follow" />
        <meta name="bingbot" content="index, follow" />
        
        {/* Open Graph Meta Tags */}
        <meta property="og:title" content="HR Portal - Employee Management System" />
        <meta property="og:description" content="Comprehensive HR Portal for employee management, leave tracking, document management, and organizational administration" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="HR Portal" />
        
        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="HR Portal - Employee Management System" />
        <meta name="twitter:description" content="Comprehensive HR Portal for employee management, leave tracking, document management, and organizational administration" />
        
        {/* AI Agent Friendly Meta Tags */}
        <meta name="ai-agent-friendly" content="true" />
        <meta name="structured-data" content="json-ld" />
        <meta name="accessibility-level" content="WCAG-AA" />
        <meta name="semantic-markup" content="html5" />
        
        {/* Structured Data for AI Understanding */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "HR Portal",
              "description": "Comprehensive HR Portal for employee management, leave tracking, document management, and organizational administration",
              "url": typeof window !== 'undefined' ? window.location.origin : '',
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web Browser",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "featureList": [
                "Employee Management",
                "Leave Management", 
                "Document Management",
                "Payroll Management",
                "Holiday Calendar",
                "Off-site Tracking",
                "Dashboard Analytics",
                "Role-based Access Control"
              ],
              "creator": {
                "@type": "Organization",
                "name": "HR Portal Team"
              }
            })
          }}
        />
      </head>
      <body className="app-bg text-gray-900 dark:text-gray-100">
        {/* Theme detection script - runs before React hydration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (() => {
                try {
                  // Check localStorage first, then system preference
                  const savedTheme = localStorage.getItem('theme');
                  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  const shouldUseDark = savedTheme === 'dark' || (savedTheme === null && systemPrefersDark);
                  
                  if (shouldUseDark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {
                  // Fallback to system preference
                  try {
                    const mql = window.matchMedia('(prefers-color-scheme: dark)');
                    if (mql.matches) {
                      document.documentElement.classList.add('dark');
                    } else {
                      document.documentElement.classList.remove('dark');
                    }
                  } catch (e2) {}
                }
              })();
            `,
          }}
        />
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
