"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Run only on the client
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Check localStorage only - ignore system preference
      const savedTheme = localStorage.getItem('theme');
      const shouldUseDark = savedTheme === 'dark';

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

  // No longer follow system preference changes - theme is controlled entirely by app

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
