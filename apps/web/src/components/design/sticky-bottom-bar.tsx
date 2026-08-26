export function StickyBottomBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky-bottom-bar">
      <div>{children}</div>
    </div>
  );
}
