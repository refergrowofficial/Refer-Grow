export const runtime = "nodejs";

export default async function ServicesPage() {
  const base = process.env.BACKEND_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
  const res = await fetch(`${base.replace(/\/$/, "")}/api/services`, { cache: "no-store" });
  const data = (await res.json()) as { services: Array<{ _id: string; name: string; price: number; businessVolume: number }> };
  const services = data.services ?? [];

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Services</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Each service has its own price and Business Volume (BV). Income is calculated from BV.
      </p>

      <div className="mt-6 overflow-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="text-left text-zinc-600 dark:text-zinc-400">
            <tr className="border-b">
              <th className="p-3">Name</th>
              <th className="p-3">Price</th>
              <th className="p-3">BV</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={String(s._id)} className="border-b last:border-b-0">
                <td className="p-3">{s.name}</td>
                <td className="p-3">{s.price}</td>
                <td className="p-3">{s.businessVolume}</td>
              </tr>
            ))}
            {services.length === 0 ? (
              <tr>
                <td className="p-3 text-zinc-600 dark:text-zinc-400" colSpan={3}>
                  No active services right now.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
