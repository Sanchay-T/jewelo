"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <header className="bg-zinc-900 border-b border-zinc-800 px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center gap-6">
        <Link href="/admin" className="text-white font-semibold text-lg">
          Prompt Admin
        </Link>
        <nav className="flex gap-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm transition-colors ${
                pathname === item.href
                  ? "text-blue-400"
                  : "text-zinc-400 hover:text-white"
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
          className="ml-auto text-sm text-zinc-500 hover:text-red-400 transition-colors"
        >
          Lock
        </button>
      </div>
    </header>
  );
}
