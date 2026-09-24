import type { Brand } from "@jewelo/domain";

export * from "./caleums-arabic-v3";
export * from "./errors";
export * from "./geometry";
export * from "./shaping";
export * from "./still-route";

export type IdentityFingerprint = Brand<string, "IdentityFingerprint">;

export interface IdentityArtifactDescriptor {
  readonly fingerprint: IdentityFingerprint;
  readonly mediaType: "image/svg+xml" | "image/png" | "application/json";
}
