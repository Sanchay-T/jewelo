"use client";

interface LivePriceDisplayProps {
  priceAED: number;
  priceUSD: number;
  isLive?: boolean;
  compact?: boolean;
}

export function LivePriceDisplay({ priceAED, priceUSD, isLive = true, compact = false }: LivePriceDisplayProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <span className="font-mono text-lg font-semibold text-brown">
          AED {priceAED.toLocaleString()}
        </span>
        <span className="text-text-tertiary text-xs font-mono">
          ≈ ${priceUSD.toLocaleString()}
        </span>
        <div className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${isLive ? "bg-green-500 live-pulse" : "bg-yellow-500"}`} />
          <span className={`text-[10px] font-medium ${isLive ? "text-green-600" : "text-yellow-600"}`}>
            {isLive ? "LIVE" : "EST"}
          </span>
        </div>
      </div>
    );
  }

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
          <div className={`w-2 h-2 rounded-full ${isLive ? "bg-green-500 live-pulse" : "bg-yellow-500"}`} />
          <span className={`text-[10px] font-medium ${isLive ? "text-green-600" : "text-yellow-600"}`}>
            {isLive ? "LIVE" : "EST"}
          </span>
        </div>
      </div>
    </div>
  );
}
