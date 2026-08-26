import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260827000000_caleums_one_view_backend.sql",
    import.meta.url,
  ),
  "utf8",
);
const correctiveMigration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260827010000_caleums_security_accounting_identity_fix.sql",
    import.meta.url,
  ),
  "utf8",
);
const startRunMigration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260827040000_caleums_start_run_rpc.sql",
    import.meta.url,
  ),
  "utf8",
);
const completionMigration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260827050000_caleums_completion_operator_retry.sql",
    import.meta.url,
  ),
  "utf8",
);
const promptMigration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260827060000_caleums_prompt_registry.sql",
    import.meta.url,
  ),
  "utf8",
);

function expectedFingerprint(
  language: "en" | "ar",
  approvedText: string,
  layout: string,
  connector: string,
) {
  return createHash("sha256")
    .update([language, approvedText, layout, connector].join("|"))
    .digest("hex");
}

describe("Caleums migration security contract", () => {
  it("rejects cross-owner draft/design injection at both constraint and RPC boundaries", () => {
    expect(migration).toContain(
      "foreign key (design_id, owner_principal_id) references public.designs(id, owner_principal_id)",
    );
    expect(migration).toContain("draft design ownership mismatch");
    expect(migration).toContain(
      "d.owner_principal_id = v_owner and d.customer_id = v_owner",
    );
  });

  it("does not grant browser users direct design lifecycle mutation", () => {
    expect(migration).toContain(
      "create policy designs_owner_read on public.designs for select",
    );
    expect(migration).not.toContain("designs_owner_all");
    expect(migration).not.toMatch(/create policy designs_.* for update/i);
    expect(migration).not.toMatch(/create policy designs_.* for delete/i);
  });

  it("revokes SECURITY DEFINER functions from PUBLIC and anon", () => {
    expect(migration).toContain(
      "revoke all on function public.approve_and_start_studio(uuid,jsonb,text,text) from public, anon",
    );
    expect(migration).toContain(
      "revoke all on function public.reserve_provider_attempt(uuid,text,text,text) from public, anon, authenticated",
    );
    expect(migration).toContain(
      "grant execute on function public.reserve_provider_attempt(uuid,text,text,text) to service_role",
    );
  });

  it("allows one initial call plus two automatic retries, then operator review", () => {
    expect(migration).toContain("attempt between 0 and 3");
    expect(migration).toContain("attempt between 1 and 3");
    expect(migration).toContain("if v_attempt > 3 then");
    expect(migration).toContain("if v_task.attempt >= 3 then");
  });

  it("reserves retry spend and reconciles reserved against actual cost", () => {
    expect(migration).toContain("if v_attempt > 1 then");
    expect(migration).toContain("daily spend guard exceeded");
    expect(migration).toContain(
      "actual_spend_cents = actual_spend_cents + p_actual_cost_cents",
    );
    expect(migration).toContain(
      "reserved_spend_cents = greatest(0, reserved_spend_cents - v_run.reserved_spend_cents)",
    );
  });

  it("derives the identity anchor from the approved specification", () => {
    expect(migration).not.toContain("p_identity_anchor");
    expect(migration).toContain(
      "jsonb_array_elements(p_specification->'names') with ordinality",
    );
    expect(migration).toContain(
      "coalesce(p_specification->>'arabicStyle', 'none') <> 'none'",
    );
    expect(migration).toContain(
      "concat_ws('|', v_language, v_approved_text, v_layout, v_connector)",
    );
    expect(migration).toContain(
      "values (v_design_id, v_owner, p_draft_id, v_revision_number, p_specification, v_identity_anchor",
    );
  });

  it("defines exact English single-name and Arabic two-name identities", () => {
    expect(expectedFingerprint("en", "Layla", "single-name", "none")).toBe(
      "dd378336a18da4b91904eab4e5afc80812acc728207c63cd2808977337860448",
    );
    expect(
      expectedFingerprint("ar", "ليلى & نور", "side-by-side", "heart"),
    ).toBe("893ba84e18cb16afd8609aee835a1758bdfd7effe368584a5f0a89f49239ed94");
    expect(correctiveMigration).toContain("case when v_language = 'ar'");
    expect(correctiveMigration).toContain("' & ' order by ordinal");
  });

  it("accounts a duplicate provider callback only once", () => {
    expect(correctiveMigration).toContain(
      "attempt = p_attempt and completed_at is null",
    );
    expect(correctiveMigration).toContain("if not found then return; end if");
  });

  it("deduplicates Shopify webhook delivery and checkout creation", () => {
    expect(migration).toContain("primary key (provider, delivery_id)");
    expect(migration).toContain(
      "unique (owner_principal_id, checkout_idempotency_key)",
    );
    expect(migration).toContain("quotes_shopify_draft_order_unique");
  });

  it("starts later studio runs with the same quota, active-run, and privilege guards", () => {
    expect(startRunMigration).toContain(
      "create or replace function public.start_studio_run",
    );
    expect(startRunMigration).toContain("one active generation run allowed");
    expect(startRunMigration).toContain("daily generation quota exceeded");
    expect(startRunMigration).toContain("daily spend guard exceeded");
    expect(startRunMigration).toContain(
      "revoke all on function public.start_studio_run(uuid,text) from public, anon",
    );
  });

  it("materializes a paid Shopify order once and audits only its creation", () => {
    expect(completionMigration).toContain(
      "create or replace function public.complete_shopify_order",
    );
    expect(completionMigration).toContain(
      "where id = p_quote_id and status = 'accepted'",
    );
    expect(completionMigration).toContain("on conflict (quote_id) do nothing");
    expect(completionMigration).toContain("if v_created then");
    expect(completionMigration).toContain("'shopify.order_completed'");
    expect(completionMigration).toContain(
      "revoke all on function public.complete_shopify_order(uuid,text,text) from public, anon, authenticated",
    );
  });

  it("turns an operator retry into one budget-respecting outbox event", () => {
    expect(completionMigration).toContain(
      "create or replace function public.operator_retry_generation_task",
    );
    expect(completionMigration).toContain(
      "v_outbox_key := 'operator-retry:' || p_task_id || ':' || p_retry_key",
    );
    expect(completionMigration).toContain("'studio.operator_retry_requested'");
    expect(completionMigration).toContain("if v_task.attempt >= 3 then");
    expect(completionMigration).toContain("'budgetOverride', false");
    expect(completionMigration).toContain(
      "grant execute on function public.operator_retry_generation_task(uuid,text,text) to service_role",
    );
  });

  it("keeps prompt history and task snapshots immutable and server-only", () => {
    expect(promptMigration).toContain("create table public.prompt_releases");
    expect(promptMigration).toContain(
      "create table public.generation_prompt_snapshots",
    );
    expect(promptMigration).toContain(
      "prompt_releases_immutable before update or delete",
    );
    expect(promptMigration).toContain(
      "generation_prompt_snapshots_immutable before update or delete",
    );
    expect(promptMigration).toContain(
      "revoke all on table public.prompt_releases, public.prompt_profile_publications",
    );
    expect(promptMigration).not.toMatch(
      /create policy .*prompt_(releases|profile_publications|publication_events)/i,
    );
  });

  it("backfills the only known legacy key and aborts on any unmapped lineage", () => {
    expect(promptMigration).toContain(
      "where prompt_release = 'studio-placeholder-v1'",
    );
    expect(promptMigration).toContain(
      "raise exception 'unmapped legacy prompt lineage remains'",
    );
    expect(promptMigration).toContain(
      "legacy task % has incomplete prompt variables",
    );
    expect(promptMigration).toContain("'caleums-prompt-compiler-v1'");
    expect(promptMigration).toContain(
      "alter table public.generation_tasks alter column prompt_release_id set not null",
    );
    expect(promptMigration).toContain("on delete restrict");
  });

  it("serializes version creation/publication and records rollback-capable events", () => {
    expect(promptMigration).toContain(
      "pg_advisory_xact_lock(hashtextextended('prompt-release:' || p_profile, 0))",
    );
    expect(promptMigration).toContain(
      "pg_advisory_xact_lock(hashtextextended('prompt-publication:' || v_release.profile, 0))",
    );
    expect(promptMigration).toContain(
      "p_expected_current_release_id is distinct from v_current.release_id",
    );
    expect(promptMigration).toContain(
      "on conflict on constraint prompt_profile_publications_pkey",
    );
    expect(promptMigration).toContain(
      "values (v_release.profile, v_current.release_id, v_release.id",
    );
  });

  it("pins both run creation paths before dispatch and includes the release in idempotency", () => {
    expect(
      promptMigration.match(
        /where p\.profile = 'image\.studio' for share of p/g,
      ),
    ).toHaveLength(2);
    expect(promptMigration).toContain(
      "'task:' || v_run_id || ':studio:release:' || v_prompt.id",
    );
    expect(promptMigration).toContain(
      "jsonb_build_object('runId', v_run_id, 'taskId', v_task_id, 'promptReleaseId', v_prompt.id)",
    );
    expect(promptMigration).not.toContain("studio-placeholder-v1', 'still.fal");
  });

  it("materializes once and returns the authoritative stored snapshot", () => {
    expect(promptMigration).toContain("on conflict (task_id) do nothing");
    expect(promptMigration).toContain(
      "if v_pinned <> p_prompt_release_id then raise exception",
    );
    expect(promptMigration).toContain("compiled prompt checksum mismatch");
    expect(promptMigration).toContain(
      "select * into v_snapshot from public.generation_prompt_snapshots where task_id = p_task_id",
    );
  });

  it("seeds usable publications for image and both future video profiles", () => {
    for (const profile of ["image.studio", "video.preview", "video.final"])
      expect(promptMigration).toContain(`'${profile}', 1`);
    expect(promptMigration).not.toContain(
      "PLACEHOLDER — coordinator-approved production prompt pending",
    );
  });
});
