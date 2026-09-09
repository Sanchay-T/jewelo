import { pipelineLimits, realModeSpendCeilings } from "@jewelo/config";
import type { RealModeSpendCeilings } from "@jewelo/config";

/**
 * Storyline review 1 M2: the real-mode spend ceiling.
 *
 * `public.runtime_policy` is a single row an operator can edit from the
 * database, and it is what every SQL gate spends against: the day's reserved
 * ceiling and the paid attempts one task may make. P5-1 tightened it; the
 * review found it back at 6000 cents and 100 attempts, which means a
 * `PROVIDER_MODE=real` flip would reserve 400 cents a run against six thousand
 * with a hundred paid attempts per task, and nothing in the worker would
 * notice.
 *
 * The deployment says here what it will tolerate in that row
 * (`REAL_MODE_MAX_RESERVED_SPEND_CENTS`, `REAL_MODE_MAX_ATTEMPT_BUDGET` in
 * `@jewelo/config`), and a real-mode worker refuses pre-spend when the row is
 * looser than that. The flip is then refused by the worker itself until the
 * caps are set, rather than by whoever remembers to run the UPDATE.
 *
 * Mock mode never reaches this file: there is no money to protect and a mock
 * run must keep working with whatever the row happens to say.
 */
export interface RuntimeSpendPolicy {
  /** `runtime_policy.global_max_reserved_spend_cents`. */
  readonly globalMaxReservedSpendCents: number;
  /** `runtime_policy.provider_attempt_budget`. */
  readonly providerAttemptBudget: number;
}

/**
 * The refusal class, or undefined when the row is inside both ceilings.
 *
 * The class is codes-only, as `errorClass` requires, because it is written into
 * the customer-visible `terminal_error_code`: a policy number is a shop fact,
 * never a customer one, so the two cents values are all it carries.
 */
export function spendCeilingRefusal(
  policy: RuntimeSpendPolicy,
  ceilings: RealModeSpendCeilings = realModeSpendCeilings(),
): string | undefined {
  if (
    policy.globalMaxReservedSpendCents >
    ceilings.REAL_MODE_MAX_RESERVED_SPEND_CENTS
  )
    return `spend_ceiling_not_set:cap=${policy.globalMaxReservedSpendCents},max=${ceilings.REAL_MODE_MAX_RESERVED_SPEND_CENTS}`;
  if (policy.providerAttemptBudget > ceilings.REAL_MODE_MAX_ATTEMPT_BUDGET)
    return `spend_ceiling_not_set:attempts=${policy.providerAttemptBudget},max=${ceilings.REAL_MODE_MAX_ATTEMPT_BUDGET}`;
  return undefined;
}

let cached: { readAt: number; policy: RuntimeSpendPolicy } | undefined;

/**
 * One policy read per process per `pipelineLimits.policyCacheMs`.
 *
 * The gate runs before every dispatch, so an uncached read would add a round
 * trip to the pre-spend path of every still. A minute is short enough that
 * tightening the row takes effect while the shop is still watching it.
 *
 * A failed read is not cached and is not swallowed: the caller lets it throw,
 * the dispatch stops before any provider call, and the stale sweeper brings the
 * task back when the database answers again - the same rule
 * `providerAttemptBudget` follows, and for the same reason. Guessing the day's
 * ceiling is how a flip spends money nobody approved.
 */
export async function readSpendPolicy(
  load: () => Promise<RuntimeSpendPolicy>,
  now: number = Date.now(),
): Promise<RuntimeSpendPolicy> {
  if (cached && now - cached.readAt < pipelineLimits.policyCacheMs)
    return cached.policy;
  const policy = await load();
  cached = { readAt: now, policy };
  return policy;
}

/** Drops the cached row. For a harness that changes the policy between runs. */
export function resetSpendPolicyCache(): void {
  cached = undefined;
}
