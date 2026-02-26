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

  // Hide bottom nav during design flow (these pages have their own bottom bars)
  const isDesignFlow = pathname.includes("/design/");
  if (isDesignFlow) return null;

  return (
    <>
      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-cream/80 backdrop-blur-xl border-t border-warm z-50 lg:hidden">
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

      {/* Desktop top nav */}
      <nav className="hidden lg:block fixed top-0 left-0 right-0 bg-cream/80 backdrop-blur-xl border-b border-warm z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-8 py-3">
          <Link href="/en" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-brown flex items-center justify-center">
              <span className="text-cream text-[10px] font-bold">J</span>
            </div>
            <span className="font-display text-base text-brown">Jewelo</span>
          </Link>
          <div className="flex items-center gap-8">
            {tabs.map((tab) => {
              const isActive =
                pathname === tab.href ||
                (tab.href !== "/en" && pathname.startsWith(tab.href));
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex items-center gap-2 text-sm transition-colors ${
                    isActive
                      ? "text-brown font-medium"
                      : "text-text-secondary hover:text-brown"
                  }`}
                >
                  <tab.icon
                    className={`w-4 h-4 ${isActive ? "text-brown" : "text-text-tertiary"}`}
                    fill={isActive ? "currentColor" : "none"}
                  />
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
