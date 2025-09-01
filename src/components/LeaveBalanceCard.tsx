"use client";

interface LeaveBalance {
  annualLeave: number;
  usedAnnual: number;
  sickLeave: number;
  usedSick: number;
  personalLeave: number;
  usedPersonal: number;
  casualLeave: number;
  usedCasual: number;
}

export default function LeaveBalanceCard({ balance }: { balance: LeaveBalance }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {[
        { label: "Annual Leave", total: balance.annualLeave, used: balance.usedAnnual },
        { label: "Sick Leave", total: balance.sickLeave, used: balance.usedSick },
        { label: "Personal Leave", total: balance.personalLeave, used: balance.usedPersonal },
        { label: "Casual Leave", total: balance.casualLeave, used: balance.usedCasual },
      ].map(({ label, total, used }) => (
        <div
          key={label}
          className="bg-white/10 p-4 rounded-xl shadow-md text-center"
        >
          <h3 className="font-semibold">{label}</h3>
          <p className="text-2xl font-bold">
            {used || 0} / {total || 0}
          </p>
        </div>
      ))}
    </div>
  );
}
