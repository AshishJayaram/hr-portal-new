import "../app/globals.css";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import Providers from "../components/Providers";  // 👈 wrap client providers here

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 text-gray-100">
        <Providers>
          {/* Sidebar */}
          <Sidebar />

          {/* Main Section */}
          <div className="flex-1 flex flex-col">
            <Topbar />
            <main className="flex-1 overflow-y-auto p-6">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
