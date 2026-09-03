import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260827080000_caleums_final_media_pipeline.sql",
    import.meta.url,
  ),
  "utf8",
);

const imageOnlyMigration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260903000000_image_only_remove_video.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("final media corrective migration", () => {
  it("fans out four independent still siblings without a Studio parent", () => {
    expect(migration).toContain(
      "('studio','image.packshot','1:1'),('on_skin','image.worn','4:5'),('close_up','image.macro_gift','1:1'),('dark','image.dark_editorial','9:16')",
    );
    expect(migration).toContain("provider_profile='still.openai'");
    expect(migration).toContain("'gpt-image-2-2026-04-21'");
    expect(migration).not.toMatch(
      /dependency_task_id[^;]+values[^;]+studio[^;]+on_skin/is,
    );
  });

  it("pins exact missing style anchor source IDs and fails closed", () => {
    for (const id of [
      "ee78f9a4-6ace-428c-9f12-4e6101188190",
      "ddd3862a-05cb-4b95-9b6b-aa8d6453293b",
      "44f3b981-18bd-4dbf-892e-dcf3f4c9c817",
      "ba0b8433-f0f2-4458-82c9-5d3ce88081d6",
      "d0c0bac4-d2e4-481c-8fff-c658acd807ac",
      "f7de6e1b-4278-4866-97ac-865abeb89560",
    ])
      expect(migration).toContain(id);
    expect(migration).toContain(
      "status text not null check (status in ('missing','published','retired'))",
    );
  });

  it("reconciles each attempt reservation exactly once", () => {
    expect(migration).toContain(
      "where task_id=p_task_id and attempt=p_attempt and completed_at is null returning estimated_cost_cents into v_reserved",
    );
    expect(migration).toContain("if not found then return; end if");
    expect(migration).toContain(
      "reservation_cents=greatest(0,reservation_cents-v_reserved)",
    );
  });

  it("makes identity and style control functions service-only", () => {
    expect(migration).toContain(
      "revoke all on function public.mark_task_pre_spend_blocked(uuid,text) from public,anon,authenticated",
    );
    expect(migration).toContain(
      "revoke all on function public.create_style_anchor_release(text,text,text,text,text,text,text) from public,anon,authenticated",
    );
    expect(migration).toContain(
      "if auth.role()<>'service_role' then raise exception 'service role required'",
    );
  });

  it("derives dependent stills from a verified source asset", () => {
    expect(migration).toContain("verification_result->>'passed'='true'");
    expect(migration).toContain("dependency_task_id");
    expect(migration).toContain("input_asset_ids");
  });
});

describe("image-only forward migration", () => {
  it("removes the only function that can create a paid video task", () => {
    expect(imageOnlyMigration).toContain(
      "drop function if exists public.request_video_task(uuid, text, uuid, text)",
    );
  });

  it("closes every retry path into a legacy video task", () => {
    const guards = imageOnlyMigration.match(
      /raise exception 'video generation removed'/g,
    );
    expect(guards).toHaveLength(2);
    for (const fn of [
      "public.retry_generation_task(p_task_id uuid, p_retry_key text)",
      "public.operator_retry_generation_task(",
    ])
      expect(imageOnlyMigration).toContain(fn);
  });

  it("never dispatches stale recovery at a removed video Trigger task", () => {
    expect(imageOnlyMigration).toContain(
      "and coalesce(t.provider_profile, '') <> 'video.fal'",
    );
    expect(imageOnlyMigration).not.toContain("video_submit");
    expect(imageOnlyMigration).not.toContain("video_poll");
  });

  it("keeps historical video lineage readable instead of dropping it", () => {
    expect(imageOnlyMigration).not.toMatch(/drop (table|column|type)/i);
    expect(imageOnlyMigration).not.toMatch(/delete from/i);
  });
});
