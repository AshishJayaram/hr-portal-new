"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Card from "../../../../components/Card";
import Loader from "../../../../components/Loader";

export default function GrowthPage() {
  const { id } = useParams() as { id: string };
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    async function fetchHistory() {
      const res = await fetch(`http://localhost:8000/api/users/${id}/history`, {
        credentials: "include",
      });
      const data = await res.json();
      setHistory(data.data);
      setLoading(false);
    }
    fetchHistory();
  }, [id]);

  if (loading) return <Loader />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Career Growth</h1>
      {history.length === 0 ? (
        <p>No history available.</p>
      ) : (
        <ul className="space-y-3">
          {history.map((h) => (
            <li
              key={h.id}
              className="p-4 rounded-xl bg-white/10 backdrop-blur-md"
            >
              <p className="font-semibold">{h.changeType}</p>
              <p className="text-sm opacity-70">
                {h.oldPosition} → {h.newPosition} ({new Date(h.date).toDateString()})
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
