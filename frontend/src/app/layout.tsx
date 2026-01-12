import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ReferGrow",
  description: "BV-based referral income platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <header className="border-b">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 p-4">
            <Link className="text-sm font-semibold" href="/">
              ReferGrow
            </Link>
            <nav className="flex flex-wrap items-center gap-4 text-sm">
              <Link className="hover:underline" href="/services">
                Services
              </Link>
              <Link className="hover:underline" href="/about">
                About Us
              </Link>
              <Link className="hover:underline" href="/join">
                Join Us
              </Link>
              <Link className="hover:underline" href="/business-opportunity">
                Business Opportunity
              </Link>
              <Link className="hover:underline" href="/account">
                Account
              </Link>
            </nav>
          </div>
        </header>

        <main>{children}</main>
      </body>
    </html>
  );
}
