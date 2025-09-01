"use client";

import "./globals.css";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import Providers from "../components/Providers";
import { usePathname } from "next/navigation";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/"; // 👈 only sign-in right now

  return (
    <html lang="en" className="dark">
      <body className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 text-gray-100">
        <Providers>
          {isAuthPage ? (
            // Auth pages → no sidebar/topbar
            <main className="flex-1 flex items-center justify-center">{children}</main>
          ) : (
            // App pages → with sidebar/topbar
            <>
              <Sidebar />
              <div className="flex-1 flex flex-col">
                <Topbar />
                <main className="flex-1 overflow-y-auto p-6">{children}</main>
              </div>
            </>
          )}
        </Providers>
      </body>
    </html>
  );
}
