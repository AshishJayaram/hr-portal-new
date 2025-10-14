"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getCurrentUser } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated()) {
      const user = getCurrentUser();
      if (user?.role === "God") {
        router.push("/god");
      } else {
        router.push("/dashboard");
      }
    } else {
      router.push("/signin");
    }
  }, [router]);

  return null;
}
