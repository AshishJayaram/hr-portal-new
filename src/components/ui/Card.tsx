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
      "rounded-xl p-6 transition-shadow border border-card bg-card shadow-sm dark:bg-white/5 dark:border-white/10",
      className
    )}>
      {title && (
        <h3 className="text-lg font-semibold mb-4 text-primary dark:text-white">{title}</h3>
      )}
      {children}
    </div>
  );
}
