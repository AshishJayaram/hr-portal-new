"use client";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import Providers from "./Providers";
import AuthGuard from "./AuthGuard";
import { usePathname } from "next/navigation";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const normalized = (pathname || "").replace(/\/$/, "");
  const isAuthPage = normalized === "/signin" || normalized === "/login";

  // Debug logging removed for production stability

  return (
    <Providers>
      {isAuthPage ? (
        // Auth pages → no sidebar/topbar - let the page layout handle it
        <>{children}</>
      ) : (
        // App pages → with sidebar/topbar and auth guard
        <AuthGuard>
          <div className="flex h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col">
              <Topbar />
              <main className="flex-1 overflow-y-auto p-6">
                <div className="mx-auto w-full max-w-7xl">{children}</div>
              </main>
            </div>
          </div>
        </AuthGuard>
      )}
    </Providers>
  );
}
