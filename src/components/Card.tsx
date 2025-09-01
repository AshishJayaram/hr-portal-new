type Props = { title: string; children: React.ReactNode };

export default function Card({ title, children }: Props) {
  return (
    <div className="rounded-2xl p-6 bg-white/10 backdrop-blur-md border border-white/10 shadow-lg">
      <h3 className="text-lg font-semibold mb-4 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
        {title}
      </h3>
      {children}
    </div>
  );
}
