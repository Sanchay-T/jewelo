export function deriveCommerceReadiness({
  hasAsset,
  hasEstimate,
  confirmed,
  quoteAccepted,
  ordered,
}: {
  hasAsset: boolean;
  hasEstimate: boolean;
  confirmed: boolean;
  quoteAccepted: boolean;
  ordered: boolean;
}) {
  const spellingLocked = quoteAccepted || ordered;
  const spellingConfirmed = confirmed || spellingLocked;
  return {
    spellingLocked,
    spellingConfirmed,
    quoteReady: hasAsset && hasEstimate && spellingConfirmed,
    needsStudioRecovery: !hasAsset || !hasEstimate,
  };
}
