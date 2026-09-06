# Jewelry prompt qualification report

**Screening complete; package not qualified.** 48/48 screening images submitted, 48 terminal outputs, 48 visually reviewed. No development, regression or final qualification generations have run.

The [exported prompt package](prompt-package.json) defines every variable, enum, construction and view. The reusable compiler, four construction sections, four shot sections, deterministic reference preflight, ledger, blind review, comparison gallery and file-backed qualification checks are implemented in the isolated R&D branch. The current paid runner executes the screening manifest. Later execution requires prepared geometry packages and sealed full-view manifests. No production code or customer verification behavior changed.

## Measured screening results

| Input method | Overall passes | Definite rejects | Uncertain / review missing | Pending generation |
| --- | ---: | ---: | ---: | ---: |
| assembly | 14/16 | 2 | 0 | 0 |
| body | 10/16 | 5 | 1 | 0 |
| text | 6/16 | 7 | 3 | 0 |

Overall: **30/48 passes**, 14 definite rejects, 4 uncertain/unreviewed, 0 pending. Semantic-only passes: 33/48. An overall pass also requires reference fidelity when a reference was supplied. Uncertainty does not pass. All first attempts remain in the denominator; no failed output was replaced by a retry.

| Construction / input | Overall passes | Definite rejects | Uncertain / review missing |
| --- | ---: | ---: | ---: |
| classical/assembly | 3/4 | 1 | 0 |
| classical/body | 1/4 | 2 | 1 |
| classical/text | 2/4 | 1 | 1 |
| framed/assembly | 4/4 | 0 | 0 |
| framed/body | 4/4 | 0 | 0 |
| framed/text | 3/4 | 0 | 1 |
| origami/assembly | 3/4 | 1 | 0 |
| origami/body | 1/4 | 3 | 0 |
| origami/text | 1/4 | 2 | 1 |
| rails/assembly | 4/4 | 0 | 0 |
| rails/body | 4/4 | 0 | 0 |
| rails/text | 0/4 | 4 | 0 |

These are screening-image observations, not complete four-view request success rates. Four repetitions per construction/method are too few to establish 99% reliability or a statistically decisive ranking. Reviews used blinded labels and common semantic construction requirements, followed by reference comparison; independent agent adjudication is recorded where performed. The B018 support-count and B044 fold judgments were revised with their history preserved. This is AI-assisted R&D review, not a substitute for competent human Arabic spelling approval during formal qualification.

## Decision from this screening

Carry the **complete assembly reference** into the next development candidate: it produced 14/16 overall passes, compared with 10/16 for body-only references and 6/16 for text-only. This is a descriptive screening result, not proof that the method will remain superior on other names or views. Both reference methods passed all eight frame/rail cases; remaining complete-assembly failures were in Classical and Origami.

The next bounded revision should target exactly those observed errors: preserve the existing left body eyelet rather than turning it into an uninspectable tip/loop; use both canonical eyelets rather than adding substitute side attachments; preserve the direct eyelet-to-letter neck contour. A candidate wording comparison can explicitly require that both existing eyelet apertures are occupied by their connecting rings and that no body eyelet is unused. This wording is **untested**, and must not replace the frozen current prompts or be called a fix before an interleaved comparison. Reference clarity and actual ring threading remain part of the same experiment.

## What was actually tested

One name: **محمد (Muhammad)**, Arabic Classic lettering, White gold, No stones, nominal **32 mm**, Cable chain, one name, Studio, 1:1, Runway MCP **gpt-image-2**, count 1. Four distinct construction candidates were used: Classical; Framed minimal with two lower supports; Diamond rails with four supports; Origami ribbon interpreted narrowly as shallow folded lettering. Body and complete assembly references were derived from the same underlying deterministic geometry. Text-only had no supplied contour.

The complete-assembly render shows local interlocking hardware and chains continuing beyond frame. It is not a full necklace/clasp manufacturing design. References have one connected rigid body, with per-support overlap checks; those checks do not certify strength or millimetre dimensions. Existing reference defects were corrected before submissions. Submitted reference and prompt bytes stayed frozen.

## Failures and uncertainties retained

- **[classical-body-3](review.html#classical-body-3) (B048):** Semantically correct Muhammad, connected body, closed attachments and cable links, stone-free white metal. A round solid neck below the right eyelet differs from the other specimens; assess this contour difference separately after unblinding. Reference fidelity is also rejected.
- **[classical-body-1](review.html#classical-body-1) (B033):** Muhammad is readable and connected, with plausible polished white metal and cable chain. Full-size junction crops show an apparent opening/seam where each body eyelet meets the lettering, especially the right lower-left arc. Closed integral eyelet continuity is uncertain; do not count as a pass.
- **[rails-text-3](review.html#rails-text-3) (B018):** Adjudication after checking the common semantic brief: the submitted construction explicitly requires four supports. This image has six (three upper, three lower), so it fails the stated construction regardless of input method. Earlier semantic pass is retained in audit history.
- **[classical-text-4](review.html#classical-text-4) (B009):** Readable Muhammad and plausible cable chain, but the left body-eyelet neck pinches to an ambiguous point with a visible seam. Continuity is not established in the native detail crop; attachment gate held for adjudication.
- **[origami-text-1](review.html#origami-text-1) (B019):** Readable folded Muhammad body with continuous broad planes. The right integral eyelet has ragged discontinuities at its lower-left rim/body junction in native crop; closed integral construction is uncertain.
- **[rails-text-4](review.html#rails-text-4) (B030):** Muhammad is readable and the hardware is plausible, but the rail body has three upper and three lower lettering supports plus an extra left vertical bar. The prompt requires four supports. Construction rejected.
- **[origami-assembly-1](review.html#origami-assembly-1) (B029):** The lettering ends taper directly into the hanging rings; the two required integral body eyelets with visible apertures are absent. Ring-to-solid-tip contact does not show the specified interlocking assembly. Attachment rejected despite otherwise plausible metal and readable lettering. Reference fidelity is also rejected.
- **[classical-text-3](review.html#classical-text-3) (B004):** The left chain terminates in a ring floating beside the letter terminal with visible background between them. The intended body eyelet and connecting assembly are missing/disconnected. This is a definite attachment failure despite realistic metal.
- **[origami-body-4](review.html#origami-body-4) (B023):** Continuous shallow folded lettering and closed eyelets with separate connecting rings are visible in native detail. A prominent solid leaf-shaped neck sits below the right eyelet; reference fidelity must check whether this geometry was requested. Semantic structure is plausible and lettering readable. Reference fidelity is also rejected.
- **[classical-assembly-2](review.html#classical-assembly-2) (B025):** Readable continuous lettering, but the left body eyelet is replaced or turned edge-on into a tiny neck below the connecting ring. Its closed aperture and integral connection cannot be verified in the native detail. Attachment held as uncertain; supplied geometry also requires fidelity review. Reference fidelity is also rejected.
- **[classical-body-4](review.html#classical-body-4) (B045):** The right body eyelet is visible, but the left terminates at a tiny pointed/edge-on neck meeting the ring. A closed left body-eyelet aperture cannot be inspected. Attachment held uncertain; the reference contour must also be compared. Reference fidelity is also rejected.
- **[rails-text-2](review.html#rails-text-2) (B022):** The rail body has four lower support posts plus upper contacts/posts, exceeding the required four supports in total. Readable lettering and plausible white metal cannot compensate for the incorrect construction topology.
- **[origami-text-4](review.html#origami-text-4) (B031):** The left chain/eyelet assembly floats beside the upright lettering with a clear background gap. It is not attached to the pendant body. Definite attachment failure despite coherent folded-metal surfaces.
- **[rails-text-1](review.html#rails-text-1) (B020):** Three lower contacts and one right upper contact support the body, but an additional truncated upper-left post hangs above the lettering without meeting it. This unrequested dangling support feature deviates from the defined rail construction. Rejected even though the rest of the piece looks plausible.
- **[origami-text-2](review.html#origami-text-2) (B028):** The left terminal eyelet/ring floats beside the lettering with a wide visible background gap. The folded metal is attractive but the necklace is physically disconnected. Attachment rejected.
- **[framed-text-3](review.html#framed-text-3) (B015):** Two lower supports and two closed frame eyelets are present. The rightmost letter comes extremely close to the inner frame; the native edge crop cannot clearly distinguish a narrow gap from an unintended third contact. Construction held for independent adjudication.
- **[origami-body-3](review.html#origami-body-3) (B014):** Both prescribed upper eyelets are left unused, while the chain attaches at newly invented outer points. The output adds attachment holes and relocates the actual suspension, violating the two-body-eyelet construction and assembly recipe. Reference fidelity is also rejected.
- **[origami-body-1](review.html#origami-body-1) (B024):** Readable shallow-folded Muhammad and plausible closed attachment assemblies. A solid circular neck is added below the right eyelet; semantic structure is plausible but this must be checked against the supplied contour. Reference fidelity is also rejected.

Use [the comparison gallery](review.html) for exact prompts above original images, method comparisons, native detail crops, reference thumbnails and lineage. The [blind page](blind-review.html) withholds method labels. [Audit history](audit-history.jsonl) preserves revisions; [artifact verification](artifact-verification.json) checks saved original bytes.

## Credits and stopping boundary

Initial observed balance: **308,802 credits**. Latest account checkpoint: **307,842**. Observed workspace decrease at that checkpoint: **960 credits**. Read [the credit ledger](credit-ledger.json) for every submission balance and checkpoint; later in-flight submissions may postdate the checkpoint. Eight reference uploads were used, with zero paid preparation image generations. No purchases, top-ups, native ImageGen substitutions or direct API tests occurred. Balance differences are observations, not a provider invoice.

Runway's [official MCP FAQ](https://help.runwayml.com/hc/en-us/articles/51931843164691-Connecting-to-Runway-MCP) says MCP is credit-based and Explore Mode is unsupported. The suspected 50-submission limit/reset remains unverified; [research notes](quota-research.md) preserve that limitation. The accepted conservative stop is still 50. After the 48-image screening, two remaining submissions cannot fit one complete four-view development request, so the broader paid campaign must stay closed until this boundary is resolved. Maximum observed concurrency is governed by two active reservations/tasks; balance checks occur after 20, 40 and final submissions.

## Support and next gates

The [128-case development matrix](development-matrix.json) covers all 798 pair/risk requirements identified in its deterministic 16,000-candidate pool and supplies [16 difficult-case definitions](regression-cases.json). It is not exhaustive Cartesian coverage and does not establish valid geometry. Those cases remain **not_prepared**. All form options remain targets; none were silently deleted to improve the measured rate.

Still required before broad development: inspected lettering specimens for every script/style adaptation; supported Arabic dots/hamzas and meaningful spacing; all two-name arrangements; construction-compatible stone placement and settings; all chain/attachment combinations; nonempty engraving with a defined surface; and the four-view case manifests. Nominal 22/32 mm are retained, but the physical measurement meaning is unresolved and dimensional accuracy is excluded. Arbitrary free-text requests remain outside the supported prompt compiler.

1. Resolve the quota boundary, then freeze the selected input method and any evidence-driven construction revisions in a new version. Do not rewrite current trial prompts.
2. Prepare and inspect the missing deterministic packages, compile the 128-case matrix into four views and two independent repetitions, and verify all declared option/risk coverage before calls.
3. Execute the bounded development and targeted wording stages. Advance only at >=99% complete-request development success and 16/16 difficult requests passing all four views.
4. Freeze release, references, settings, rubric and sampling protocol before generating 400 previously unused requests. Require all 400 complete requests to pass. The file-backed qualifier reads actual ledger/original/reference/audit evidence, rejects reused images and late prerequisite reviews, and retains provider failures in the denominator.

There is **no 99% or 100% reliability claim** from this screening. The 400/400, one-sided 95% lower bound of approximately 99.25% remains the future criterion under the declared sampling assumptions, not an observed result. No production API readiness is claimed. Actual API integration requires a separately requested qualification on that model, adapter and settings.
