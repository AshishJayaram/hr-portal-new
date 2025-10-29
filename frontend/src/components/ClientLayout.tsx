"use client";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import Providers from "./Providers";
import AuthGuard from "./AuthGuard";
import { GlassContainer } from "./ui/glass";
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
          <GlassContainer className="flex h-screen overflow-x-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-x-hidden backdrop-blur-sm bg-liquid-glass-white dark:bg-liquid-glass-black">
              <Topbar />
              <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 sm:p-4">
                <div className="mx-auto w-full max-w-7xl space-y-6">{children}</div>
              </main>
            </div>
          </GlassContainer>
        </AuthGuard>
      )}
    </Providers>
  );
}
