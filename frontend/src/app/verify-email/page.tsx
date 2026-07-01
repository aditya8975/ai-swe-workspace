"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Link from "next/link";

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    const token = params.get("token");
    if (!token) { setStatus("error"); setError("Missing verification token."); return; }

    api.post("/auth/verify-email", { token })
      .then(() => { setStatus("success"); setTimeout(() => router.push("/dashboard"), 2000); })
      .catch((err) => { setStatus("error"); setError(err?.response?.data?.detail || "Verification failed."); });
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="panel p-8 max-w-sm w-full text-center">
        {status === "loading" && (
          <>
            <div className="h-6 w-6 mx-auto animate-spin rounded-full border-2 border-border-subtle border-t-accent mb-4" />
            <p className="text-text-secondary text-sm">Verifying your email…</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="text-4xl mb-3">✅</div>
            <h2 className="text-lg font-semibold text-text-primary mb-1">Email verified!</h2>
            <p className="text-sm text-text-secondary">Redirecting to your workspace…</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="text-4xl mb-3">❌</div>
            <h2 className="text-lg font-semibold text-text-primary mb-1">Verification failed</h2>
            <p className="text-sm text-danger mb-4">{error}</p>
            <Link href="/login" className="btn-primary inline-block">Back to login</Link>
          </>
        )}
      </div>
    </div>
  );
}
