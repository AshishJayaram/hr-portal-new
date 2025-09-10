import "./globals.css";
import ClientLayout from "../components/ClientLayout";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex h-screen overflow-hidden app-bg text-gray-900 dark:text-gray-100">
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
