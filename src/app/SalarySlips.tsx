export default function SalarySlips() {
  const slips = [
    { id: "1", month: "July 2025", amount: "₹80,000", file: "/slips/july.pdf" },
    { id: "2", month: "August 2025", amount: "₹82,000", file: "/slips/aug.pdf" },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Salary Slips</h1>
      <div className="bg-white dark:bg-gray-800 shadow rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-2">Month</th>
              <th className="px-4 py-2">Net Salary</th>
              <th className="px-4 py-2">Download</th>
            </tr>
          </thead>
          <tbody>
            {slips.map((slip) => (
              <tr key={slip.id} className="border-t dark:border-gray-600">
                <td className="px-4 py-2">{slip.month}</td>
                <td className="px-4 py-2">{slip.amount}</td>
                <td className="px-4 py-2">
                  <a
                    href={slip.file}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Download PDF
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
