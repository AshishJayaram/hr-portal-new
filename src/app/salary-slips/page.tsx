"use client";

import { useQuery } from "@tanstack/react-query";
import { getSalarySlips } from "../../lib/api";
import Loader from "../../components/Loader";
import Card from "../../components/Card";

export default function SalarySlipsPage() {
  const userId = "u1"; // later replace with session.user.id

  const { data, isLoading } = useQuery({
    queryKey: ["salary-slips", userId],
    queryFn: () => getSalarySlips(userId),
  });

  if (isLoading) return <Loader />;

  return (
    <div>
      <h1 className="text-2xl font-bold">Salary Slips</h1>
      <Card title="My Slips">
        <ul className="divide-y divide-white/10">
          {data?.data?.map((s: any) => (
            <li key={s.id} className="py-2 flex justify-between">
              {s.month}/{s.year}
              <span className="font-semibold">${s.netSalary}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
