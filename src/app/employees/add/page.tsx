"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { createUser, toCanonicalRole, getUsers } from "@/lib/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function AddEmployeePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    username: "",
    password: "",
    department: "HR",
    role: "Employee",
    manager_id: "",
  });
  const [managerQuery, setManagerQuery] = useState("");
  const [selectedManagerName, setSelectedManagerName] = useState("");

  const mutation = useMutation({
    mutationFn: (body: any) => createUser({
      username: body.username,
      password: body.password,
      department: body.department,
      role: toCanonicalRole(body.role),
      manager_id: body.manager_id ? Number(body.manager_id) : undefined,
    }),
    onSuccess: () => {
      toast.success("Employee created");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      router.push("/employees");
    },
    onError: (err: any) => toast.error(err.message || "Failed to create employee"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Add Employee</h1>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Input label="Username (name or email)" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
            <Input label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            <Input label="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} options={[
              { value: "Employee", label: "Employee" },
              { value: "Manager", label: "Manager" },
              { value: "HR", label: "HR" },
              { value: "Admin", label: "Admin" },
            ]} />
          </div>
          <div>
            <label className="block text-sm mb-2">Manager (search and select)</label>
            <Input value={managerQuery} onChange={(e) => setManagerQuery(e.target.value)} placeholder="Search by name or ID..." />
            <ManagerSearch 
              query={managerQuery}
              onSelect={(id, name) => { setForm({ ...form, manager_id: String(id) }); setSelectedManagerName(name); setManagerQuery(`${name} (ID: ${id})`); }}
              selectedId={form.manager_id}
            />
          </div>
          <div className="flex gap-3">
            <Button type="submit" loading={mutation.isPending}>Create</Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function ManagerSearch({ query, onSelect, selectedId }: { query: string; onSelect: (id: string, name: string) => void; selectedId?: string }) {
  const { data } = useQuery({
    queryKey: ["users", query],
    queryFn: () => getUsers(query ? { q: query } : {}),
  });
  const users = data?.data || [];
  return (
    <div className="mt-2 max-h-48 overflow-y-auto border border-white/10 rounded">
      {users.map((u: any) => (
        <button
          type="button"
          key={u.id}
          className={`w-full text-left px-3 py-2 hover:bg-white/10 ${selectedId === String(u.id) ? 'bg-white/5' : ''}`}
          onClick={() => onSelect(String(u.id), u.name)}
        >
          {u.name} <span className="text-xs text-gray-400">(ID: {u.id})</span>
        </button>
      ))}
      {users.length === 0 && (
        <div className="px-3 py-2 text-sm text-gray-400">No users</div>
      )}
    </div>
  );
}
