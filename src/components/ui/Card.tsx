import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
}

export default function Card({ children, className, title }: CardProps) {
  return (
    <div className={cn(
      "bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-lg shadow-indigo-950/20 hover:shadow-indigo-900/30 transition-shadow",
      className
    )}>
      {title && (
        <h3 className="text-lg font-semibold mb-4 text-white">{title}</h3>
      )}
      {children}
    </div>
  );
}
