// Publish a profile's baseline template as a new prompt release.
//
// This is the same path the operator console takes
// (`apps/web/src/app/api/operator/prompts/route.ts`, the non-mock branch):
// `validatePromptTemplate` and `assertStillTemplateCompatibility` first, then
// the `create_prompt_release` RPC, then the `publish_prompt_release` RPC with
// the publication that was read a moment before as the expected current one.
// No row is ever written directly: both guards in the database - the allowed
// variable set and the compare-and-set on the publication - still run.
//
// The template published is always `BASELINE_PROMPT_TEMPLATES[profile]`, the
// text in the repository, so what production compiles is what `lab-diff`
// proves. A profile whose published release already carries that exact text is
// left alone, so a rerun publishes nothing.
//
// Run it (Node is pinned to 24.18.1), from the repository root:
//   corepack pnpm --filter @jewelo/jobs publish-prompt \
//     --note "why this release exists" image.worn image.macro_gift
//   ... --dry-run   prints what it would publish and touches nothing.
//
// It reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from the repository
// root `.env` (`--env-file`) and prints neither.
import {
  BASELINE_PROMPT_TEMPLATES,
  assertStillTemplateCompatibility,
  isPromptProfile,
  validatePromptTemplate,
  type PromptProfile,
} from "@jewelo/ai";

const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const noteAt = argv.indexOf("--note");
const note = noteAt === -1 ? "" : (argv[noteAt + 1] ?? "");
const profiles = argv.filter(
  (arg, index) =>
    !arg.startsWith("--") && index !== noteAt + 1,
);

if (!profiles.length || !profiles.every(isPromptProfile))
  throw new Error(`usage: publish-prompt --note "<change note>" <profile>...`);
if (!note.trim() || note.length > 500)
  throw new Error("--note must be 1-500 characters");

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key)
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");

async function rest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${url}${path}`, {
    ...init,
    headers: {
      apikey: key!,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      accept: "application/json",
      ...(init?.body ? { prefer: "return=representation" } : {}),
    },
  });
  const text = await response.text();
  if (!response.ok)
    throw new Error(`${init?.method ?? "GET"} ${path} -> ${response.status}: ${text}`);
  return (text ? JSON.parse(text) : null) as T;
}

interface Release {
  id: string;
  profile: PromptProfile;
  version: number;
  template: string;
}

for (const profile of profiles as PromptProfile[]) {
  const template = BASELINE_PROMPT_TEMPLATES[profile];
  const parsed = validatePromptTemplate(profile, template);
  assertStillTemplateCompatibility(profile, template);

  const [publication] = await rest<
    Array<{ release_id: string; published_at: string }>
  >(
    `/rest/v1/prompt_profile_publications?profile=eq.${encodeURIComponent(profile)}&select=release_id,published_at`,
  );
  if (!publication) throw new Error(`${profile}: no publication row`);
  const [current] = await rest<Release[]>(
    `/rest/v1/prompt_releases?id=eq.${publication.release_id}&select=id,profile,version,template`,
  );
  if (!current) throw new Error(`${profile}: published release not found`);
  if (current.template === template) {
    console.log(`${profile}@v${current.version} already publishes the baseline; nothing to do`);
    continue;
  }
  if (dryRun) {
    console.log(
      `${profile}: would publish over @v${current.version} - ${template.length} characters, ${parsed.variables.length} variables`,
    );
    continue;
  }

  const created = await rest<Release>("/rest/v1/rpc/create_prompt_release", {
    method: "POST",
    body: JSON.stringify({
      p_profile: profile,
      p_template: template,
      p_parsed_variables: parsed.variables,
      p_change_note: note.trim(),
      p_created_by: "operator:publish-prompt-release",
    }),
  });
  await rest("/rest/v1/rpc/publish_prompt_release", {
    method: "POST",
    body: JSON.stringify({
      p_release_id: created.id,
      p_expected_current_release_id: current.id,
      p_published_by: "operator:publish-prompt-release",
    }),
  });
  console.log(
    `${profile}@v${created.version} published (was @v${current.version}), release ${created.id}`,
  );
}
