"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createUser, toCanonicalRole } from "@/lib/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function AddEmployeePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    email: "",
    department: "",
    role: "Employee",
  });

  const mutation = useMutation({
    mutationFn: (body: any) => createUser({
      name: body.name,
      email: body.email,
      department: body.department,
      role: toCanonicalRole(body.role),
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
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <Input label="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} options={[
              { value: "Employee", label: "Employee" },
              { value: "Manager", label: "Manager" },
              { value: "HR", label: "HR" },
              { value: "Admin", label: "Admin" },
            ]} />
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
