"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  // Run only on the client
  useEffect(() => {
    if (typeof window !== "undefined") {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDark(prefersDark);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (dark) {
        document.documentElement.classList.add("dark");
        // Explicit user choice overrides system until next reload
      } else {
        document.documentElement.classList.remove("dark");
        // Explicit user choice overrides system until next reload
      }
    }
  }, [dark]);

  // Follow system changes live
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setDark(e.matches);
    };
    try {
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    } catch {
      mql.addListener(handler);
      return () => mql.removeListener(handler);
    }
  }, []);

  return (
    <button
      onClick={() => setDark(!dark)}
      className="px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:scale-105 transition"
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
