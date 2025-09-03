"use client";

import { useQuery } from "@tanstack/react-query";
import { getUsers, canManageUsers } from "@/lib/api";
import Loader from "@/components/Loader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Link from "next/link";

export default function EmployeesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: () => getUsers(),
  });

  if (!canManageUsers()) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">You do not have permission to view employees.</p>
      </div>
    );
  }

  if (isLoading) return <Loader />;
  if (error) return <div className="text-red-400">Failed to load employees</div>;

  const users = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Employees</h1>
        <Link href="/employees/add">
          <Button>New Employee</Button>
        </Link>
      </div>

      <Card>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((u: any) => (
            <div key={u.id} className="p-4 rounded-xl bg-white/10 border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                  {u.name?.charAt(0) || "U"}
                </div>
                <div>
                  <p className="font-bold">{u.name}</p>
                  <p className="text-sm text-gray-400">{u.email}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-400">
                <span>{u.role}</span>
                <Link href={`/employees/edit?id=${u.id}`} className="text-indigo-400 hover:underline">Edit</Link>
              </div>
            </div>
          ))}
        </div>
        {users.length === 0 && (
          <p className="text-center text-gray-400 py-8">No employees found.</p>
        )}
      </Card>
    </div>
  );
}


