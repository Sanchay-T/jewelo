"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Sparkles, Image, User } from "lucide-react";

const tabs = [
  { href: "/en", icon: Home, label: "Home" },
  { href: "/en/design/language", icon: Sparkles, label: "Design" },
  { href: "/en/gallery", icon: Image, label: "Gallery" },
  { href: "/en/profile", icon: User, label: "Profile" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-cream/80 backdrop-blur-xl border-t border-warm z-50">
      <div className="flex justify-around py-2 pb-6">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href ||
            (tab.href !== "/en" && pathname.startsWith(tab.href));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center gap-0.5"
            >
              <tab.icon
                className={`w-5 h-5 ${isActive ? "text-brown" : "text-text-tertiary"}`}
                fill={isActive ? "currentColor" : "none"}
              />
              <span
                className={`text-[10px] ${isActive ? "text-brown font-medium" : "text-text-tertiary"}`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
