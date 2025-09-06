"use client";

import "./globals.css";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import Providers from "../components/Providers";
import AuthGuard from "../components/AuthGuard";
import { usePathname } from "next/navigation";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Defer pathname usage to client only to avoid hydration mismatch
  let isAuthPage = false;
  try {
    // usePathname() is client-side. Guard to avoid SSR mismatch.
    const p = usePathname();
    isAuthPage = p === "/signin";
  } catch {}

  return (
    <html lang="en">
      <body className="flex h-screen overflow-hidden app-bg text-gray-900 dark:text-gray-100">
        {/* Ensure dark mode is applied ASAP based on saved preference or system */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => { try { const mql = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)'); if (!mql) return; const apply = () => { if (mql.matches) { document.documentElement.classList.add('dark'); } else { document.documentElement.classList.remove('dark'); } }; apply(); try { mql.addEventListener('change', apply); } catch { mql.addListener(apply); } } catch (e) {} })();`,
          }}
        />
        <Providers>
          {isAuthPage ? (
            // Auth pages → no sidebar/topbar
            <main className="flex-1 flex items-center justify-center w-full h-full">{children}</main>
          ) : (
            // App pages → with sidebar/topbar and auth guard
            <AuthGuard>
              <>
                <Sidebar />
                <div className="flex-1 flex flex-col">
                  <Topbar />
                  <main className="flex-1 overflow-y-auto p-6">
                    <div className="mx-auto w-full max-w-7xl">{children}</div>
                  </main>
                </div>
              </>
            </AuthGuard>
          )}
        </Providers>
      </body>
    </html>
  );
}
