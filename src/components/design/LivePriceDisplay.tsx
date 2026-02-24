"use client";

interface LivePriceDisplayProps {
  priceAED: number;
  priceUSD: number;
}

export function LivePriceDisplay({ priceAED, priceUSD }: LivePriceDisplayProps) {
  return (
    <div className="bg-white rounded-xl p-4 border border-warm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-text-tertiary text-[10px] uppercase tracking-wider">
            Estimated
          </p>
          <p className="font-mono text-2xl font-semibold text-brown">
            AED {priceAED.toLocaleString()}
          </p>
          <p className="text-text-tertiary text-xs font-mono">
            ≈ ${priceUSD.toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500 live-pulse" />
          <span className="text-green-600 text-[10px] font-medium">LIVE</span>
        </div>
      </div>
    </div>
  );
}
