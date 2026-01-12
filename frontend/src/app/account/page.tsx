import Link from "next/link";

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Account</h1>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Link className="rounded-lg border p-4 hover:bg-black/3 dark:hover:bg-white/5" href="/login">
          <div className="font-medium">Sign In</div>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Access your dashboard and earnings.</p>
        </Link>
        <Link className="rounded-lg border p-4 hover:bg-black/3 dark:hover:bg-white/5" href="/register">
          <div className="font-medium">Register / Join Us</div>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Create an account (Terms acceptance required).</p>
        </Link>
      </div>
    </div>
  );
}
