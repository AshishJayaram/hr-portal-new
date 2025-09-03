"use client";

import { i } from "framer-motion/client";
import Card from "../../components/Card";
import Calendar from "../../components/Calendar";
export default function Mocks() {
  // --- Mock Data ---
  const mockStats = {
    totalEmployees: 42,
    pendingLeaves: 3,
    activeEmployees: 39,
    totalDocuments: 128,
    avgLeaveDays: 2.1,
  };

  const mockLeaves = [
    { title: "Alice PTO", start: "2025-09-02", end: "2025-09-04" },
    { title: "Bob Sick", start: "2025-09-07" },
    { title: "Charlie Training", start: "2025-09-12" },
  ];

  const mockDocs = [
    { id: "d1", title: "Employee Handbook", category: "POLICY" },
    { id: "d2", title: "Offer Letter", category: "Professional" },
    { id: "d3", title: "Form 16", category: "Professional" },
    { id: "d4", title: "Leave Policy", category: "POLICY" },
  ];

  const mockSlips = [
    { id: "s1", month: "July", year: 2025, net: 6200 },
    { id: "s2", month: "August", year: 2025, net: 6300 },
  ];

  const mockTeam = [
    { id: "u1", name: "Alice", role: "Developer" },
    { id: "u2", name: "Bob", role: "QA Engineer" },
    { id: "u3", name: "Charlie", role: "Manager" },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Mock HR Portal</h1>

      {/* --- Dashboard Stats --- */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {Object.entries(mockStats).map(([k, v]) => (
          <Card key={k} title={k}>
            <p className="text-2xl font-extrabold text-cyan-300">{v as any}</p>
          </Card>
        ))}
      </div>

      {/* --- Leaves --- */}
      <Card title="Planned Leaves">
        <Calendar events={mockLeaves} />
      </Card>

      {/* --- Documents --- */}
      <Card title="Documents">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {mockDocs.map((doc) => (
            <div
              key={doc.id}
              className="p-4 rounded-xl bg-white/10 backdrop-blur-md cursor-pointer hover:bg-white/20 transition"
            >
              <p className="font-semibold">{doc.title}</p>
              <p className="text-sm opacity-70">{doc.category}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* --- Salary Slips --- */}
      <Card title="Salary Slips">
        <ul className="divide-y divide-white/10">
          {mockSlips.map((s) => (
            <li key={s.id} className="flex justify-between py-2">
              <span>{s.month} {s.year}</span>
              <span className="font-semibold">${s.net}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* --- Team --- */}
      <Card title="Team">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockTeam.map((member) => (
            <div
              key={member.id}
              className="p-4 rounded-xl bg-white/10 backdrop-blur-md"
            >
              <p className="font-bold">{member.name}</p>
              <p className="text-sm opacity-70">{member.role}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
