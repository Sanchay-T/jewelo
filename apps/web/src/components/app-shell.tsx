export function CaleumsWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="clm-wordmark" data-compact={compact || undefined}>
      CALEUMS
    </span>
  );
}
