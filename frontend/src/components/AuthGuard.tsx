"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/api";
import { useState } from "react";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Run only on client after mount to avoid SSR/client mismatch
    if (!isAuthenticated()) {
      router.push("/signin");
    }
    setChecked(true);
  }, [router]);

  // While checking auth on client, render nothing to keep SSR and client initial render identical
  if (!checked) return null;

  return <>{children}</>;
}
