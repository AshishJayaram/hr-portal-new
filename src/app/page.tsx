"use client";

import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "../lib/api";
import Loader from "../components/Loader";

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: getDashboardStats,
  });

  if (isLoading) return <Loader />;

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
