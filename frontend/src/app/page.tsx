import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-semibold tracking-tight">ReferGrow</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Referral-based membership with BV income distribution.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          className="rounded-md bg-foreground px-4 py-2 text-center text-sm text-background transition-colors hover:bg-black/80 dark:hover:bg-white/80"
          href="/login"
        >
          Login
        </Link>
        <Link className="rounded-md border px-4 py-2 text-center text-sm" href="/register">
          Register
        </Link>
        <Link className="rounded-md border px-4 py-2 text-center text-sm" href="/dashboard">
          Dashboard
        </Link>
      </div>

      <div className="mt-8 rounded-lg border p-4 text-sm">
        <p className="font-medium">Setup checklist</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-zinc-600 dark:text-zinc-400">
          <li>Copy .env.example → .env.local and set MONGODB_URI + JWT_SECRET</li>
          <li>Create the first admin via POST /api/admin/setup (ADMIN_SETUP_SECRET)</li>
          <li>Admin creates services + an active rule</li>
          <li>Users register using a referral code and buy services to generate BV</li>
        </ul>
      </div>
    </div>
  );
}
