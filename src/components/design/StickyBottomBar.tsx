"use client";

interface StickyBottomBarProps {
  children: React.ReactNode;
}

export function StickyBottomBar({ children }: StickyBottomBarProps) {
  return (
    <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-xl border-t border-warm shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      <div className="px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="max-w-lg mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
