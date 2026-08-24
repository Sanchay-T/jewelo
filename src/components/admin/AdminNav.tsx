"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/playground", label: "Playground" },
  { href: "/admin/pipelines", label: "Pipelines" },
  { href: "/admin/releases", label: "Releases" },
  { href: "/admin/validation", label: "Validation" },
  { href: "/admin/environments", label: "Environments" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/95 px-4 py-4 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4">
        <Link href="/admin" className="text-white font-semibold text-lg tracking-tight">
          Prompt Admin
        </Link>
        <nav className="flex flex-wrap gap-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                pathname === item.href || pathname.startsWith(`${item.href}/`)
                  ? "border-amber-400/50 bg-amber-500/10 text-amber-200"
                  : "border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <button
          onClick={() => {
            sessionStorage.removeItem("admin_password");
            window.location.reload();
          }}
          className="ml-auto rounded-full border border-zinc-800 px-3 py-1.5 text-sm text-zinc-500 transition-colors hover:border-red-500/40 hover:text-red-300"
        >
          Lock
        </button>
      </div>
    </header>
  );
}
