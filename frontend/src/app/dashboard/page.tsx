"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/apiClient";

type MeResponse = {
  user: {
    id: string;
    email: string;
    role: "admin" | "user";
    referralCode: string;
    parent: string | null;
  };
};

type Service = {
  _id: string;
  name: string;
  price: number;
  businessVolume: number;
  status: "active" | "inactive";
};

type Income = {
  _id: string;
  level: number;
  bv: number;
  amount: number;
  fromUser?: { email: string; referralCode: string };
  createdAt: string;
};

export default function DashboardPage() {
  const [me, setMe] = useState<MeResponse["user"] | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalIncome = useMemo(
    () => incomes.reduce((sum, inc) => sum + (inc.amount ?? 0), 0),
    [incomes]
  );

  async function loadAll() {
    setError(null);

    const [meRes, servicesRes, incomeRes] = await Promise.all([
      apiFetch("/api/me"),
      apiFetch("/api/services"),
      apiFetch("/api/income"),
    ]);

    const meJson = await meRes.json();
    if (!meRes.ok) throw new Error(meJson?.error ?? "Not logged in");

    const servicesJson = await servicesRes.json();
    const incomeJson = await incomeRes.json();

    setMe(meJson.user);
    setServices(servicesJson.services ?? []);
    setIncomes(incomeJson.incomes ?? []);

    const firstServiceId = (servicesJson.services?.[0]?._id as string | undefined) ?? "";
    setSelectedServiceId((prev) => prev || firstServiceId);
  }

  useEffect(() => {
    loadAll().catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  async function logout() {
    setBusy(true);
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } finally {
      setBusy(false);
    }
  }

  async function buyService() {
    if (!selectedServiceId) return;
    setBusy(true);
    setError(null);

    try {
      const res = await apiFetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: selectedServiceId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Purchase failed");

      await loadAll();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (error && !me) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="mt-4 rounded-md border p-4 text-sm">
          {error} —{" "}
          <Link className="underline" href="/login">
            Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          {me ? (
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Logged in as {me.email} ({me.role})
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          {me?.role === "admin" ? (
            <Link className="rounded-md border px-3 py-2 text-sm" href="/admin/services">
              Admin
            </Link>
          ) : null}
          <button
            className="rounded-md border px-3 py-2 text-sm disabled:opacity-60"
            onClick={logout}
            disabled={busy}
          >
            Logout
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {me ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <h2 className="font-medium">Your referral code</h2>
            <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-black/4 px-3 py-2 dark:bg-white/6">
              <code className="text-sm">{me.referralCode}</code>
            </div>
            <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
              Share this code if you want new users placed under you.
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <h2 className="font-medium">Total income</h2>
            <p className="mt-2 text-2xl font-semibold">{totalIncome.toFixed(2)}</p>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              Sum of all BV income entries credited to you.
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-6 rounded-lg border p-4">
        <h2 className="font-medium">Buy a service (creates BV + income)</h2>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            className="w-full rounded-md border px-3 py-2"
            value={selectedServiceId}
            onChange={(e) => setSelectedServiceId(e.target.value)}
          >
            {services.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name} — Price {s.price} — BV {s.businessVolume}
              </option>
            ))}
          </select>
          <button
            className="rounded-md bg-foreground px-3 py-2 text-sm text-background transition-colors hover:bg-black/80 disabled:opacity-60 dark:hover:bg-white/80"
            onClick={buyService}
            disabled={busy || !selectedServiceId}
          >
            {busy ? "Processing…" : "Buy"}
          </button>
        </div>
        {services.length === 0 ? (
          <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
            No active services yet (admin must create them).
          </p>
        ) : null}
      </div>

      <div className="mt-6 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Income entries</h2>
          <Link className="text-sm underline" href="/referrals">
            View referral tree
          </Link>
        </div>
        <div className="mt-3 overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-zinc-600 dark:text-zinc-400">
              <tr>
                <th className="py-2">Date</th>
                <th className="py-2">From</th>
                <th className="py-2">Level</th>
                <th className="py-2">BV</th>
                <th className="py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {incomes.map((inc) => (
                <tr key={inc._id} className="border-t">
                  <td className="py-2">{new Date(inc.createdAt).toLocaleString()}</td>
                  <td className="py-2">{inc.fromUser?.email ?? "—"}</td>
                  <td className="py-2">{inc.level}</td>
                  <td className="py-2">{inc.bv}</td>
                  <td className="py-2">{inc.amount.toFixed(2)}</td>
                </tr>
              ))}
              {incomes.length === 0 ? (
                <tr>
                  <td className="py-3 text-zinc-600 dark:text-zinc-400" colSpan={5}>
                    No income entries yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
