"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  // Run only on the client
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      setDark(saved === "dark");
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (dark) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
      }
    }
  }, [dark]);

  return (
    <button
      onClick={() => setDark(!dark)}
      className="px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:scale-105 transition"
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
