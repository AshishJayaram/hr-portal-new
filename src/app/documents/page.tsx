"use client";

import { useQuery } from "@tanstack/react-query";
import { getDocuments } from "../../lib/api";
import Loader from "../../components/Loader";
import Card from "../../components/Card";

export default function DocumentsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["documents"],
    queryFn: () => getDocuments(),
  });

  if (isLoading) return <Loader />;
  if (error) return <p className="text-red-400">Error loading documents</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Documents</h1>
      <Card title="All Documents">
        <ul className="divide-y divide-white/10">
          {data?.data?.map((doc: any) => (
            <li key={doc.id} className="py-2">
              {doc.title} <span className="opacity-60">({doc.category})</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
