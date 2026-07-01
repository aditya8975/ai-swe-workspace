"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setTokens } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

export default function OAuthCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const access = params.get("access_token");
    const refresh = params.get("refresh_token");

    if (access && refresh) {
      setTokens(access, refresh);
      useAuthStore.getState().init().then(() => {
        router.replace("/dashboard");
      });
    } else {
      router.replace("/login?error=oauth_failed");
    }
  }, []);

  return (
    <div className="flex h-screen items-center justify-center bg-bg">
      <div className="text-center space-y-3">
        <div className="h-6 w-6 mx-auto animate-spin rounded-full border-2 border-border-subtle border-t-accent" />
        <p className="text-sm text-text-secondary">Completing sign in…</p>
      </div>
    </div>
  );
}
