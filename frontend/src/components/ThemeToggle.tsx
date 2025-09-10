"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Run only on the client
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Check localStorage first, then system preference
      const savedTheme = localStorage.getItem('theme');
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldUseDark = savedTheme === 'dark' || (savedTheme === null && systemPrefersDark);
      
      setDark(shouldUseDark);
      setMounted(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && mounted) {
      if (dark) {
        document.documentElement.classList.add("dark");
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem('theme', 'light');
      }
    }
  }, [dark, mounted]);

  // Follow system changes live (only if no explicit user choice)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia || !mounted) return;
    
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      // Only follow system changes if user hasn't made an explicit choice
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === null) {
        setDark(e.matches);
      }
    };
    
    try {
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    } catch {
      mql.addListener(handler);
      return () => mql.removeListener(handler);
    }
  }, [mounted]);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <button className="px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:scale-105 transition">
        🌙
      </button>
    );
  }

  return (
    <button
      onClick={() => setDark(!dark)}
      className="px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:scale-105 transition"
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
