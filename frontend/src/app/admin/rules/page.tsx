"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";

type Rule = {
  _id: string;
  basePercentage: number;
  decayEnabled: boolean;
  isActive: boolean;
  createdAt: string;
};

export default function AdminRulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [basePercentage, setBasePercentage] = useState<number>(10);
  const [decayEnabled, setDecayEnabled] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setError(null);
    const res = await apiFetch("/api/admin/rules");
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error ?? "Failed to load");

    const recent = (json.recentRules ?? []) as Rule[];
    setRules(recent);
  }

  useEffect(() => {
    load().catch((e) => setError(String(e?.message ?? e)));
  }, []);

  async function createRule(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const res = await apiFetch("/api/admin/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ basePercentage, decayEnabled, isActive: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Create failed");
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function setActive(rule: Rule) {
    setBusy(true);
    setError(null);

    try {
      const res = await apiFetch(`/api/admin/rules/${rule._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Update failed");
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin — Rules</h1>
        <div className="flex gap-3">
          <Link className="text-sm underline" href="/admin/services">
            Services
          </Link>
          <Link className="text-sm underline" href="/dashboard">
            Dashboard
          </Link>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <form className="mt-6 rounded-lg border p-4" onSubmit={createRule}>
        <h2 className="font-medium">Create rule</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium">Level 1 percentage (of BV)</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              type="number"
              step="0.01"
              value={basePercentage}
              onChange={(e) => setBasePercentage(Number(e.target.value))}
              min={0}
              max={100}
              required
            />
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Example: 10 = 10% at Level 1.
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Decay</label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={decayEnabled}
                onChange={(e) => setDecayEnabled(e.target.checked)}
              />
              <span>Halve each level (L2 = 50% of L1, etc.)</span>
            </label>
          </div>
        </div>
        <button
          className="mt-3 rounded-md bg-foreground px-3 py-2 text-sm text-background transition-colors hover:bg-black/80 disabled:opacity-60 dark:hover:bg-white/80"
          disabled={busy}
          type="submit"
        >
          {busy ? "Saving…" : "Create (and set active)"}
        </button>
      </form>

      <div className="mt-6 rounded-lg border p-4">
        <h2 className="font-medium">Rules</h2>
        <div className="mt-3 overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-zinc-600 dark:text-zinc-400">
              <tr>
                <th className="py-2">Level 1</th>
                <th className="py-2">Decay</th>
                <th className="py-2">Active</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr className="border-t" key={r._id}>
                  <td className="py-2">{(r.basePercentage * 100).toFixed(2)}%</td>
                  <td className="py-2">{r.decayEnabled ? "Halving" : "Level 1 only"}</td>
                  <td className="py-2">{r.isActive ? "Yes" : "No"}</td>
                  <td className="py-2 text-right">
                    <button
                      className="rounded-md border px-3 py-1 text-xs disabled:opacity-60"
                      onClick={() => setActive(r)}
                      disabled={busy || r.isActive}
                    >
                      Set active
                    </button>
                  </td>
                </tr>
              ))}
              {rules.length === 0 ? (
                <tr>
                  <td className="py-3 text-zinc-600 dark:text-zinc-400" colSpan={4}>
                    No rules yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
          Income per level = BV × Level-1% × (1/2)^(level-1) when decay is enabled.
        </p>
      </div>
    </div>
  );
}
