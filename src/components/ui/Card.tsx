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
      "bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-lg",
      className
    )}>
      {title && (
        <h3 className="text-lg font-semibold mb-4 text-white">{title}</h3>
      )}
      {children}
    </div>
  );
}
