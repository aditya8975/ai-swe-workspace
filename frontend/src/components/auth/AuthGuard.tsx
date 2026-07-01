"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isInitialized, init } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) {
      init().then(() => {
        if (!useAuthStore.getState().user) {
          router.replace("/login");
        }
      });
    } else if (!user) {
      router.replace("/login");
    }
  }, [isInitialized, user]);

  if (!isInitialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-subtle border-t-accent" />
      </div>
    );
  }

  if (!user) return null;
  return <>{children}</>;
}
