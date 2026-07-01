"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Link from "next/link";

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setStatus("loading");
    try {
      await api.post("/auth/reset-password", { token, new_password: password });
      setStatus("success");
      setTimeout(() => router.push("/login"), 2000);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Reset failed. The link may have expired.");
      setStatus("error");
    }
  }

  if (status === "success") return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="panel p-8 max-w-sm w-full text-center">
        <div className="text-4xl mb-3">🔐</div>
        <h2 className="text-lg font-semibold text-text-primary mb-1">Password updated!</h2>
        <p className="text-sm text-text-secondary">Redirecting to login…</p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-text-primary text-center mb-6">Set new password</h1>
        <form onSubmit={handleSubmit} className="space-y-3 panel p-6">
          {error && (
            <div className="rounded-md bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger">{error}</div>
          )}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-secondary">New password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="input-field" placeholder="Min 8 chars, at least one digit" required />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-secondary">Confirm password</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
              className="input-field" placeholder="Same as above" required />
          </div>
          <button type="submit" disabled={status === "loading"} className="btn-primary w-full">
            {status === "loading" ? "Updating…" : "Set new password"}
          </button>
          <p className="text-center text-sm text-text-secondary">
            <Link href="/login" className="text-accent hover:text-accent-hover">Back to login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
