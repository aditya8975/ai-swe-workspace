"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

export default function HomePage() {
  const router = useRouter();
  const { user, isInitialized, init } = useAuthStore();

  useEffect(() => {
    init().then(() => {
      const { user } = useAuthStore.getState();
      router.replace(user ? "/dashboard" : "/login");
    });
  }, []);

  return (
    <div className="flex h-screen items-center justify-center bg-bg">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-subtle border-t-accent" />
    </div>
  );
}
