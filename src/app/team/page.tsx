"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTeam, updateUser, getCurrentUser, isManager } from "../../lib/api";
import Loader from "../../components/Loader";
import Card from "../../components/Card";
import RoleGuard from "../../components/RoleGuard";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";

export default function TeamPage() {
  const user = getCurrentUser();
  
  const { data, isLoading } = useQuery({
    queryKey: ["team"],
    queryFn: () => getTeam(),
  });
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => updateUser(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["team"] }),
  });

  if (isLoading) return <Loader />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        {isManager() ? "My Team" : "Team Members"}
      </h1>
      
      <RoleGuard allowedRoles={["Manager", "HR", "Admin"]}>
        <Card title="Team Members">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.data?.map((member: any) => (
              <div
                key={member.id}
                className="p-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/10"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    {member.name?.charAt(0) || "U"}
                  </div>
                  <div>
                    <p className="font-bold">{member.name}</p>
                    <p className="text-sm text-gray-400">{member.email}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <Input label="Name" defaultValue={member.name} onBlur={(e) => mutation.mutate({ id: String(member.id), body: { name: e.target.value } })} />
                  <Input label="Email" type="email" defaultValue={member.email} onBlur={(e) => mutation.mutate({ id: String(member.id), body: { email: e.target.value } })} />
                  <Select
                    label="Role"
                    defaultValue={member.role}
                    onChange={(e) => mutation.mutate({ id: String(member.id), body: { role: e.target.value } })}
                    options={[{ value: "Employee", label: "Employee" }, { value: "Manager", label: "Manager" }, { value: "HR", label: "HR" }, { value: "Admin", label: "Admin" }]}
                  />
                  <Input label="Department" defaultValue={member.department || ''} onBlur={(e) => mutation.mutate({ id: String(member.id), body: { department: e.target.value } })} />
                </div>
              </div>
            ))}
          </div>
          {(!data?.data || data.data.length === 0) && (
            <p className="text-gray-400 text-center py-8">No team members found</p>
          )}
        </Card>
      </RoleGuard>

      <RoleGuard allowedRoles={["employee"]} fallback={
        <div className="text-center py-8">
          <p className="text-gray-400">You need manager access to view team information.</p>
        </div>
      }>
        <Card title="Access Restricted">
          <p className="text-gray-400 text-center py-4">
            Team information is only available to managers and HR personnel.
          </p>
        </Card>
      </RoleGuard>
    </div>
  );
}
