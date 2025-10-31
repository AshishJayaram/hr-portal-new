"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";

export default function PageTransitionLoader() {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const prevPathnameRef = useRef(pathname);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only show loader if pathname actually changed
    if (prevPathnameRef.current !== pathname) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      setIsLoading(true);
      prevPathnameRef.current = pathname;

      // Hide loader after navigation completes
      timeoutRef.current = setTimeout(() => {
        setIsLoading(false);
        timeoutRef.current = null;
      }, 200); // Minimal delay for smooth transition
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [pathname]);

  // Also listen for Link clicks to show loader immediately (only if navigating to different page)
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest("a[href]");
      if (link) {
        const href = link.getAttribute("href");
        if (href && href.startsWith("/")) {
          // Normalize paths for comparison (remove trailing slashes)
          const normalizedHref = href.replace(/\/$/, "");
          const normalizedPathname = (pathname || "").replace(/\/$/, "");
          
          // Only show loader if navigating to a different page
          if (normalizedHref !== normalizedPathname) {
            setIsLoading(true);
            
            // Clear loader if navigation doesn't happen (e.g., same page clicked)
            timeoutRef.current = setTimeout(() => {
              // Double-check if pathname changed, if not, clear loader
              const currentPath = (pathname || "").replace(/\/$/, "");
              if (normalizedHref === currentPath) {
                setIsLoading(false);
              }
            }, 100);
          } else {
            // Same page clicked - ensure loader is not shown
            setIsLoading(false);
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
          }
        }
      }
    };

    // Listen for clicks on Link components
    document.addEventListener("click", handleLinkClick, true); // Use capture phase to catch early

    return () => {
      document.removeEventListener("click", handleLinkClick, true);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [pathname]);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-white/10 dark:bg-black/20 backdrop-blur-[1px]" />
      <div className="relative">
        <div className="w-5 h-5 border-2 border-white/30 dark:border-gray-600/30 border-t-indigo-500 dark:border-t-indigo-400 rounded-full animate-spin" />
      </div>
    </div>
  );
}

