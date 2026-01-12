import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">About Us</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Learn about our mission, vision, and community success.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Link className="rounded-lg border p-4 hover:bg-black/3 dark:hover:bg-white/5" href="/about/story">
          <div className="font-medium">Our Story</div>
        </Link>
        <Link className="rounded-lg border p-4 hover:bg-black/3 dark:hover:bg-white/5" href="/about/vision">
          <div className="font-medium">Vision</div>
        </Link>
        <Link
          className="rounded-lg border p-4 hover:bg-black/3 dark:hover:bg-white/5"
          href="/about/success-stories"
        >
          <div className="font-medium">Success Stories</div>
        </Link>
      </div>
    </div>
  );
}
