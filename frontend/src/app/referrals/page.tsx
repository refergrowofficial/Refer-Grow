"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";

type TreeNode = {
  id: string;
  email: string;
  referralCode: string;
  children: TreeNode[];
};

function NodeView({ node, depth }: { node: TreeNode; depth: number }) {
  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-black/4 px-2 py-1 text-xs dark:bg-white/6">
          L{depth}
        </span>
        <span className="text-sm font-medium">{node.email}</span>
        <span className="text-xs text-zinc-600 dark:text-zinc-400">({node.referralCode})</span>
      </div>
      {node.children.length > 0 ? (
        <div className="ml-4 border-l pl-4">
          {node.children.map((c) => (
            <NodeView key={c.id} node={c} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function ReferralsPage() {
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/referrals?depth=5")
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json?.error ?? "Failed to load");
        setTree(json.tree);
      })
      .catch((e) => setError(String(e?.message ?? e)));
  }, []);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Referral tree</h1>
        <Link className="text-sm underline" href="/dashboard">
          Back
        </Link>
      </div>

      {error ? (
        <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {tree ? (
        <div className="mt-4 rounded-lg border p-4">
          <NodeView node={tree} depth={0} />
          <p className="mt-4 text-xs text-zinc-600 dark:text-zinc-400">
            This view is limited to 5 levels for performance.
          </p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">Loading…</p>
      )}
    </div>
  );
}
