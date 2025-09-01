export default function Team() {
  const team = [
    { id: "u1", name: "Alice", role: "Developer" },
    { id: "u2", name: "Bob", role: "Designer" },
    { id: "u3", name: "Charlie", role: "QA" },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">My Team</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {team.map((member) => (
          <div
            key={member.id}
            className="p-6 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg"
          >
            <h3 className="text-lg font-semibold">{member.name}</h3>
            <p className="opacity-80">{member.role}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
