import type { Brand } from "@jewelo/domain";

export type IdentityFingerprint = Brand<string, "IdentityFingerprint">;

export interface IdentityArtifactDescriptor {
  readonly fingerprint: IdentityFingerprint;
  readonly mediaType: "image/svg+xml" | "image/png" | "application/json";
}
