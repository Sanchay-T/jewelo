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
});
