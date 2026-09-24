# Blind one-piece reader calibration (SP-2a2, 24 September 2026)

The blind reader is `OpenAIPieceReader` in `packages/ai/src/studio.ts`, model from `OPENAI_VERIFIER_MODEL`.
It refused good stills on the free lab and on staging, and one staging read ended with "OpenAI verification omitted output text".
This note measures it, tries a rule rewrite, a two-read rule, a higher image detail and a pendant crop, and records what was kept.

## The set

35 images, each read 3 times per variant with the reader exactly as `studio.ts` builds the request.
20 free-route stills in `img/` of this folder, labelled from the one-piece column of `viewer-scores.md` (18 one piece, the two ليلى stills not, because their dots touch only at a corner).
13 split-lab stills under `docs/goals/road-to-gold/lab-2026-09-24-split/img/` (local only), labelled from the `CASES` list of the SP-2a replay script (6 split, including the real two-piece classical فاطمة and عمران, and 7 whole).
2 live staging stills, `rose-rejected-1.png` and `live-asma-studio.png`, labelled one piece by the lead (both scratchpad only).
In total 27 images are one piece and 8 are split.

## Variants

Baseline is the rule as it stood: joined into one continuous piece, false if any gap separates two parts of the name.
Variant (a) adds that parts touching along an edge, overlapping or meeting at a weld line or seam are joined, including a letter that runs into or rests against a frame or rail, and that a facet line, seam, polished edge, reflection, highlight or shadow is not a gap.
It keeps that a dot or mark touching its letter or its neighbour only at a single point or corner, or with background visible between it and its letter, floats free.
Variant (b) is (a) plus a two-read agreement rule: refuse only if two reads say false, a third read decides a split.
With independent reads that is the majority of three, so (b) is computed from the three (a) reads per image instead of paying for a second run.
Variant (c) is (a) plus `detail: "high"` on the reader's `input_image`; the Responses API accepts it for this model (HTTP 200, about 3300 input tokens for a 1920 px still).
Variant (d) is (c) with the still first cropped to the pendant by a background threshold in the scratchpad (sharp from `apps/jobs`, no vision call): pixels far from the border colour are foreground, rows whose foreground covers at least 15% of the width are the pendant, padded.
On on-skin and dark shots the background is not flat and the crop falls back to nearly the whole frame.

## Results

| variant | false refusals per read (27 one-piece images) | misses per read (8 split images) | refusal by majority of 3 | misses by majority of 3 | output tokens p50 / max | spend |
| --- | --- | --- | --- | --- | --- | --- |
| baseline | 25/80 = 31.2% | 1/24 = 4.2% (ليلى b) | 8/27 = 29.6% | 0/8 | 517 / 2048 (one read cut off) | USD 1.15 |
| (a) wording | 20/80 = 25.0% | 0/24 = 0% | 8/27 = 29.6% | 0/8 | 548 / 2048 (one read cut off) | USD 1.16 |
| (b) = (a) + agreement | - | - | 8/27 = 29.6% | 0/8 | about 2.3 reads per decision | USD 0 (from (a)) |
| (c) = (a) + detail high | 16/80 = 20.0% | 0/24 = 0% | 5/27 = 18.5% | 0/8 | 591 / 1943 | USD 1.02 |
| (d) = (c) + pendant crop | 14/81 = 17.3% | 0/23 = 0% | 4/27 = 14.8% | 0/8 | 592 / 2452 | USD 0.96 |

With the two split-lab labels re-scored (below), 25 images are one piece and 10 are split:

| variant | false refusals per read | misses per read | refusal by majority of 3 | misses by majority of 3 |
| --- | --- | --- | --- | --- |
| baseline | 19/74 = 25.7% | 1/30 | 6/25 | 0/10 |
| (a) | 15/75 = 20.0% | 0/29 | 6/25 | 0/10 |
| (c) | 10/74 = 13.5% | 0/30 | 3/25 | 0/10 |
| (d) | 10/75 = 13.3% | 2/29 | 3/25 | 1/10 (c-fat-studio-a) |

(c) and (d) had reads aborted at the 60 s `visionRequestTimeoutMs` (10 of 105 and 7 of 105 at six in parallel; baseline and (a) had none), so those slots were read again one at a time, and two of those 17 sequential reads hit 60 s again.
In production `readVision` retries a timeout once, so a timeout costs about a minute of latency, not a regeneration.

Per-read counts leave out reads with no answer: one per baseline and (a) run at the old 2048-token ceiling, and the one (c) and (d) slot that timed out twice.
Votes per image, T one piece, F split, E no answer:

| image | label | label source | baseline | (a) | (b) decision | (c) | (d) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| free/classical-asma-en-a | true | free viewer-scores.md one-piece column | TTT | TTT | true | TTT | TTT |
| free/classical-asma-en-b | true | free viewer-scores.md one-piece column | TTT | TTT | true | TTF | TTT |
| free/classical-layla-ar-a | false | free viewer-scores.md one-piece column | FFF | FFF | false | FFF | FFF |
| free/classical-layla-ar-b | false | free viewer-scores.md one-piece column | FFT | FFF | false | FFF | FFF |
| free/classical-love-en-a | true | free viewer-scores.md one-piece column | FFF | TFT | true | TTE | TTT |
| free/classical-love-en-b | true | free viewer-scores.md one-piece column | FFF | FFT | false | TTT | TTT |
| free/classical-muhammad-ar-a | true | free viewer-scores.md one-piece column | TTT | TTT | true | TTT | TTT |
| free/classical-muhammad-ar-b | true | free viewer-scores.md one-piece column | TTT | TTT | true | TTT | TTT |
| free/classical-muhammad-en-a | true | free viewer-scores.md one-piece column | TTT | TTT | true | TTT | TTT |
| free/classical-muhammad-en-b | true | free viewer-scores.md one-piece column | TTT | TTT | true | TTT | TTT |
| free/classical-omar-en-a | true | free viewer-scores.md one-piece column | FTT | TFF | false | TTT | FTF |
| free/classical-omar-en-b | true | free viewer-scores.md one-piece column | TTT | TTT | true | TTT | TTT |
| free/diamond-rails-muhammad-ar-a | true | free viewer-scores.md one-piece column | TTT | TTT | true | TTT | TTT |
| free/diamond-rails-muhammad-ar-b | true | free viewer-scores.md one-piece column | FFF | FTF | false | TTT | TTT |
| free/framed-minimal-muhammad-ar-a | true | free viewer-scores.md one-piece column | FFF | FFF | false | FFF | TTT |
| free/framed-minimal-muhammad-ar-b | true | free viewer-scores.md one-piece column | TTT | TTT | true | TTT | TTT |
| free/framed-minimal-salma-ar-a | true | free viewer-scores.md one-piece column | FFF | FTT | true | TFT | TTT |
| free/framed-minimal-salma-ar-b | true | free viewer-scores.md one-piece column | FFT | FFT | false | FFT | FTT |
| free/origami-ribbon-muhammad-ar-a | true | free viewer-scores.md one-piece column | TTT | TTT | true | TTT | TTT |
| free/origami-ribbon-muhammad-ar-b | true | free viewer-scores.md one-piece column | TTT | TTT | true | TTT | TTT |
| split/v2/c-fat-studio.png | false | piece-replay.mts CASES | FFF | FFF | false | FFF | FFF |
| split/v2/c-fat-on_skin.png | false | piece-replay.mts CASES | FFF | FFF | false | FFF | FEF |
| split/v2/c-fat-close_up.png | false | piece-replay.mts CASES | FFF | FFF | false | FFF | FFF |
| split/v2/c-fat-dark.png | false | piece-replay.mts CASES | FFF | FFF | false | FFF | FFF |
| split/v3/c-omran-studio-a.png | false | piece-replay.mts CASES | FFF | FFF | false | FFF | FFF |
| split/v3/c-omran-studio-b.png | false | piece-replay.mts CASES | FFF | FFF | false | FFF | FFF |
| split/v3/c-fat-studio-a.png | true, re-scored false | piece-replay.mts CASES | FFF | FFF | false | FFF | FTT |
| split/v3/c-omran-studio-stencil-b.png | true | piece-replay.mts CASES | TTT | TTT | true | TTT | TTT |
| split/v2/o-muh-studio.png | true | piece-replay.mts CASES | TTF | TFF | false | TTT | FFT |
| split/v2/o-fat-studio.png | true | piece-replay.mts CASES | TTT | TTT | true | TTF | TTT |
| split/v2/r-fat-studio.png | true | piece-replay.mts CASES | TTT | TTT | true | FFT | FFF |
| split/v2/c-muh-dark.png | true | piece-replay.mts CASES | TTT | TTT | true | TTT | TTT |
| split/v2/f-fat-studio.png | true, re-scored false | piece-replay.mts CASES | FFF | FFE | false | FFF | FFF |
| live/rose-rejected-1.png | true | lead brief (live staging, re-read 3/3 one piece) | TTE | TTT | true | TTT | TTF |
| live/live-asma-studio.png | true | lead brief (live staging, re-read 3/3 one piece) | TTT | TTT | true | TTT | TFT |

## Labels re-scored

Both doubtful split-lab labels are wrong and the reader is right, judged on native-resolution crops in the scratchpad (`reader-cal/labels/`, not in git).
`v3/c-fat-studio-a.png` is split: the two ة dots are fused to the left ring but background shows clearly between them and the top of ة, so the left ring and dots are a separate piece from the name (`cfsa-left-dots.png`, `cfsa-dots-to-ta-x3.png`); the ف dot is joined by a short stem (`cfsa-fa-dot.png`).
`v2/f-fat-studio.png` is split by the same standard the viewer used for ليلى: the ف dot rests on the ف only at its bottom corner (`ffs-fa-dot-neck-x4.png`), while the ة dots sit on a full edge (`ffs-ta-dots-neck-x3.png`) and the name joins the top rail through ط and ا (`ffs-top-rail.png`, `ffs-right-post.png`, `ffs-left-post.png`, `ffs-bottom-rail.png`).
The ف dot on f-fat-studio is a close call: no background shows at the corner, but the contact is a point.
The SP-2a replay's 13/13 agreement therefore rested on two wrong labels, and the old verdicts of FFF on both were correct refusals.

## Choice

Variant (a) is kept and (c) is applied on top of it: `detail: "high"` in `OpenAIPieceReader`.
(c) misses no split read under either labelling and cuts false refusals from 25.0% to 20.0% per read as labelled, and from 20.0% to 13.5% with the corrected labels.
(d) is rejected: with the corrected labels it passes c-fat-studio-a twice in three reads and by majority, a real split, and its gain over (c) is 0.2 points.
It could not ship in scope anyway: `packages/ai` has no image library, and cropping in `apps/jobs` is outside this task.
(b) is not applied: its refusal rate equals (a), it catches no split that (a) lets through, and it costs one to two more vision calls per still.
The 5% target is still not met; with corrected labels the images refused by majority under (c) are framed محمد a (FFF), framed سلمى b (FFT) and r-fat-studio (FFT).
r-fat-studio read TTT at the default detail and FFT under (c) and FFF under (d), so the higher detail sees something there; its label deserves the same viewer re-score as the two above.
In the framed stills the reader says the name floats inside the frame, where the viewer found thin bars or flush contact at native resolution.

## Output ceiling

Measured reads used 517-548 output tokens at p50 and each run had one read cut off at the shared 2048 ceiling, which is the "omitted output text" failure.
Under (d) one read used 2452 output tokens, above the old ceiling and well inside the new one.
The piece reader now has its own validated `pieceReaderMaxOutputTokens` in `packages/config` (1024 to 16384, set to 8192); the name reader keeps `nameReaderMaxOutputTokens` at 2048.

## Spend

Metered from the response `usage` at USD 1.25 per million input and USD 10 per million output tokens.
First round (baseline and (a)): USD 2.32 of the USD 5 cap, 210 reads.
Second round ((c), (d), one probe and the timed-out re-reads): USD 1.99 of the USD 2.50 cap.
Aborted reads return no `usage`, so up to 20 timed-out reads are not metered; at about USD 0.01 each the second round is at most about USD 2.20.

## Next levers, not done here

Give the vision reads a longer timeout or accept the retry latency: at `detail: "high"` about one read in ten ran past 60 s.
Look at the framed-construction refusals with a viewer; if the thin bars are real, a crop that holds up on on-skin and dark shots is the next lever, wired where an image library already lives.
