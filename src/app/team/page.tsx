"use client";

import { useQuery } from "@tanstack/react-query";
import { getUsers } from "../../lib/api"; // or make a getTeam() for /api/team
import Loader from "../../components/Loader";
import Card from "../../components/Card";

export default function TeamPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["team"],
    queryFn: () => getUsers(),
  });

  if (isLoading) return <Loader />;

  return (
    <div>
      <h1 className="text-2xl font-bold">Team</h1>
      <Card title="Team Members">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.data?.map((member: any) => (
            <div
              key={member.id}
              className="p-4 rounded-xl bg-white/10 backdrop-blur-md"
            >
              <p className="font-bold">{member.name || member.username}</p>
              <p className="text-sm opacity-70">{member.role}</p>
              <p className="text-sm opacity-70">{member.department}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
