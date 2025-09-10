type Props = { title: string; children: React.ReactNode };

export default function Card({ title, children }: Props) {
  return (
    <div className="rounded-2xl p-6 border border-card bg-card shadow-sm dark:bg-white/10 dark:border-white/10">
      <h3 className="text-lg font-semibold mb-4 text-primary dark:text-white">
        {title}
      </h3>
      {children}
    </div>
  );
}
