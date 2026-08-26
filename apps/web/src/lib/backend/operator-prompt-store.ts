import "server-only";

import {
  BASELINE_PROMPT_TEMPLATES,
  PROMPT_PROFILE_REGISTRY,
  PROMPT_VARIABLES,
  type PromptProfile,
  validatePromptTemplate,
} from "@jewelo/ai";

export interface StoredPromptRelease {
  id: string;
  profile: PromptProfile;
  version: number;
  template: string;
  parsed_variables: string[];
  change_note: string;
  created_by: string;
  created_at: string;
}

const baselineReleases: StoredPromptRelease[] = Object.entries(
  BASELINE_PROMPT_TEMPLATES,
).map(([profile, template], index) => {
  const parsed = validatePromptTemplate(profile as PromptProfile, template);
  return {
    id: `00000000-0000-0000-0000-${String(401 + index).padStart(12, "0")}`,
    profile: profile as PromptProfile,
    version: 1,
    template,
    parsed_variables: parsed.variables,
    change_note: "Safe initial profile",
    created_by: "system:mock",
    created_at: "2026-08-27T00:00:00.000Z",
  };
});

interface MockPromptStore {
  releases: StoredPromptRelease[];
  active: Map<PromptProfile, { id: string; publishedAt: string }>;
}
const stores = new Map<string, MockPromptStore>();

function getStore(scope: string): MockPromptStore {
  const existing = stores.get(scope);
  if (existing) return existing;
  const created = {
    releases: baselineReleases.map((release) => ({ ...release })),
    active: new Map<PromptProfile, { id: string; publishedAt: string }>(
      baselineReleases.map((release) => [
        release.profile,
        { id: release.id, publishedAt: release.created_at },
      ]),
    ),
  };
  stores.set(scope, created);
  return created;
}

export function promptVariableMetadata(profile: PromptProfile) {
  return PROMPT_PROFILE_REGISTRY[profile].allowedVariables.map((name) => ({
    name,
    description: PROMPT_VARIABLES[name],
  }));
}

export function listMockPromptReleases(scope: string, profile: PromptProfile) {
  const store = getStore(scope);
  return {
    releases: store.releases
      .filter((release) => release.profile === profile)
      .sort((left, right) => right.version - left.version)
      .slice(0, 20),
    publication: store.active.get(profile),
  };
}

export function createMockPromptRelease(input: {
  scope: string;
  profile: PromptProfile;
  template: string;
  changeNote: string;
}) {
  const store = getStore(input.scope);
  const parsed = validatePromptTemplate(input.profile, input.template);
  const version =
    Math.max(
      0,
      ...store.releases
        .filter((release) => release.profile === input.profile)
        .map((release) => release.version),
    ) + 1;
  const release: StoredPromptRelease = {
    id: crypto.randomUUID(),
    profile: input.profile,
    version,
    template: input.template,
    parsed_variables: parsed.variables,
    change_note: input.changeNote,
    created_by: "operator:mock",
    created_at: new Date().toISOString(),
  };
  store.releases.push(release);
  return release;
}

export function publishMockPromptRelease(input: {
  scope: string;
  releaseId: string;
  expectedCurrentReleaseId: string;
}) {
  const store = getStore(input.scope);
  const release = store.releases.find((item) => item.id === input.releaseId);
  if (!release) throw new Error("Prompt release not found");
  const current = store.active.get(release.profile);
  if (current?.id !== input.expectedCurrentReleaseId)
    throw new Error("Prompt publication changed; refresh required");
  store.active.set(release.profile, {
    id: release.id,
    publishedAt: new Date().toISOString(),
  });
  return release;
}
