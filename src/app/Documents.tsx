export default function Documents() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Documents</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {["Employee Handbook", "Offer Letter", "Form 16"].map((doc, i) => (
          <div key={i} className="p-4 rounded-xl bg-white dark:bg-gray-800 shadow">
            <p className="font-semibold">{doc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
