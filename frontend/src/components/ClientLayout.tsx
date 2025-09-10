"use client";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import Providers from "./Providers";
import AuthGuard from "./AuthGuard";
import { usePathname } from "next/navigation";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/signin";

  return (
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
  );
}
