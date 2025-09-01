"use client";

import { useState, useEffect } from "react";

export default function Filters({ onChange }: { onChange: (query: string) => void }) {
  const [value, setValue] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => onChange(value), 500); // debounce 500ms
    return () => clearTimeout(timer);
  }, [value, onChange]);

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder="Search..."
      className="w-full p-2 rounded bg-white/10 text-white"
    />
  );
}
