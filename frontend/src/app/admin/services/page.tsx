"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";

type Service = {
  _id: string;
  name: string;
  price: number;
  businessVolume: number;
  status: "active" | "inactive";
  createdAt: string;
};

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [businessVolume, setBusinessVolume] = useState<number>(100);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editBusinessVolume, setEditBusinessVolume] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setError(null);
    const res = await apiFetch("/api/admin/services");
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error ?? "Failed to load");
    setServices(json.services ?? []);
  }

  useEffect(() => {
    load().catch((e) => setError(String(e?.message ?? e)));
  }, []);

  async function createService(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const res = await apiFetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, price, businessVolume, status: "active" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Create failed");
      setName("");
      setPrice(0);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(service: Service) {
    setBusy(true);
    setError(null);

    try {
      const res = await apiFetch(`/api/admin/services/${service._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: service.status === "active" ? "inactive" : "active" }),
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

  function startEdit(service: Service) {
    setEditingId(service._id);
    setEditName(service.name);
    setEditPrice(service.price);
    setEditBusinessVolume(service.businessVolume);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit() {
    if (!editingId) return;
    setBusy(true);
    setError(null);

    try {
      const res = await apiFetch(`/api/admin/services/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, price: editPrice, businessVolume: editBusinessVolume }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Update failed");
      setEditingId(null);
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
        <h1 className="text-2xl font-semibold">Admin — Services</h1>
        <div className="flex gap-3">
          <Link className="text-sm underline" href="/admin/rules">
            Rules
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

      <form className="mt-6 rounded-lg border p-4" onSubmit={createService}>
        <h2 className="font-medium">Create service</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <input
            className="rounded-md border px-3 py-2 md:col-span-2"
            placeholder="Service name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="rounded-md border px-3 py-2"
            type="number"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            min={0}
            step="0.01"
            placeholder="Price"
            required
          />
          <input
            className="rounded-md border px-3 py-2"
            type="number"
            value={businessVolume}
            onChange={(e) => setBusinessVolume(Number(e.target.value))}
            min={0}
            placeholder="BV"
            required
          />
        </div>
        <button
          className="mt-3 rounded-md bg-foreground px-3 py-2 text-sm text-background transition-colors hover:bg-black/80 disabled:opacity-60 dark:hover:bg-white/80"
          disabled={busy}
          type="submit"
        >
          {busy ? "Saving…" : "Create"}
        </button>
      </form>

      <div className="mt-6 rounded-lg border p-4">
        <h2 className="font-medium">Services</h2>
        <div className="mt-3 overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-zinc-600 dark:text-zinc-400">
              <tr>
                <th className="py-2">Name</th>
                <th className="py-2">Price</th>
                <th className="py-2">BV</th>
                <th className="py-2">Status</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr className="border-t" key={s._id}>
                  <td className="py-2">
                    {editingId === s._id ? (
                      <input
                        className="w-full rounded-md border px-2 py-1"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    ) : (
                      s.name
                    )}
                  </td>
                  <td className="py-2">
                    {editingId === s._id ? (
                      <input
                        className="w-full rounded-md border px-2 py-1"
                        type="number"
                        step="0.01"
                        min={0}
                        value={editPrice}
                        onChange={(e) => setEditPrice(Number(e.target.value))}
                      />
                    ) : (
                      s.price
                    )}
                  </td>
                  <td className="py-2">
                    {editingId === s._id ? (
                      <input
                        className="w-full rounded-md border px-2 py-1"
                        type="number"
                        min={0}
                        value={editBusinessVolume}
                        onChange={(e) => setEditBusinessVolume(Number(e.target.value))}
                      />
                    ) : (
                      s.businessVolume
                    )}
                  </td>
                  <td className="py-2">{s.status}</td>
                  <td className="py-2 text-right">
                    <div className="flex justify-end gap-2">
                      {editingId === s._id ? (
                        <>
                          <button
                            className="rounded-md border px-3 py-1 text-xs disabled:opacity-60"
                            onClick={saveEdit}
                            disabled={busy}
                          >
                            Save
                          </button>
                          <button
                            className="rounded-md border px-3 py-1 text-xs disabled:opacity-60"
                            onClick={cancelEdit}
                            disabled={busy}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="rounded-md border px-3 py-1 text-xs disabled:opacity-60"
                            onClick={() => startEdit(s)}
                            disabled={busy}
                          >
                            Edit
                          </button>
                          <button
                            className="rounded-md border px-3 py-1 text-xs disabled:opacity-60"
                            onClick={() => toggleActive(s)}
                            disabled={busy}
                          >
                            Toggle
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {services.length === 0 ? (
                <tr>
                  <td className="py-3 text-zinc-600 dark:text-zinc-400" colSpan={5}>
                    No services yet.
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
