import { useEffect, useState } from "react";
import Calendar from "../components/Calender";

type Leave = {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
};

export default function Leaves() {
  const [leaves, setLeaves] = useState<Leave[]>([]);

  useEffect(() => {
    fetch("http://localhost:4000/api/leaves")
      .then((res) => res.json())
      .then((data) => setLeaves(data.data));
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">My Leaves</h2>
      <Calendar
        events={leaves.map((l) => ({
          title: l.type,
          start: new Date(l.startDate),
          end: new Date(l.endDate),
        }))}
      />
    </div>
  );
}
