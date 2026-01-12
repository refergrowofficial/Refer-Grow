"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/apiClient";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiFetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, referralCode, acceptedTerms }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Registration failed");

      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold">Register</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Already have an account?{" "}
        <Link className="underline" href="/login">
          Login
        </Link>
      </p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div className="space-y-1">
          <label className="text-sm font-medium">Name</label>
          <input
            className="w-full rounded-md border px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Email</label>
          <input
            className="w-full rounded-md border px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Password</label>
          <input
            className="w-full rounded-md border px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Referral Code</label>
          <input
            className="w-full rounded-md border px-3 py-2"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value)}
          />
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Optional. If provided, you will be placed into the referrer&apos;s binary tree.
          </p>
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input
            className="mt-1"
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            required
          />
          <span>
            I accept the Terms &amp; Conditions.
          </span>
        </label>

        {error ? (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <button
          className="w-full rounded-md bg-foreground px-3 py-2 text-background transition-colors hover:bg-black/80 disabled:opacity-60 dark:hover:bg-white/80"
          disabled={loading}
          type="submit"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
    </div>
  );
}
