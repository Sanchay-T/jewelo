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

## SP-2a3: joined is transitive (24 September 2026)

SP-2f2's replay refused 8 of the 12 framed-minimal dependent stills that are one piece.
The reader saw a shadow line between the Arabic word and the bottom rail, called it a break, and ignored the joint that actually holds the word (the inner rail the word rests on, or the lam strut up to the top rail).
Only `ONE_PIECE_RULE` changed; the name reader, the config and the request shape are untouched, so this sits on top of SP-2a2's kept variant (a) plus `detail: "high"`.

### Wording

Three sentences were added and two existing ones qualified, in three variants.
Variant 1 added transitivity ("two parts are one piece if any path of touching metal links them, directly or through a third part"), the framed clause ("a word that meets the frame or a rail at even one place ... is joined to it even where open background or shadow shows between that word and the frame everywhere else"), "the open space inside a frame is expected ... and is not a break", and rewrote the false clause as "a separate object with no touching path to the rest".
It also qualified the dot sentence with "and nothing else bridging it" and the Arabic non-joining sentence with "with nothing bridging it, no rail, strut or frame that both sides touch".
Variant 2 removed "and nothing else bridging it" from the dot sentence and added "Only a join along an edge or a run of metal counts as a link in that path; a single point or corner of contact never does."
Variant 3 is variant 2 plus "Judge every dot, diacritic and detached mark on its own contact and not on the word's: a word joined to a frame or a rail does not carry a floating dot with it."
Variant 3 is what shipped.

### Calibration set (the 35 images above, 3 reads each)

Labels are the corrected ones from "Labels re-scored": 25 one piece, 10 split (the two ليلى stills, the four c-fat, the two c-omran, `v3/c-fat-studio-a`, `v2/f-fat-studio`).

| variant | false refusals per read (25 one-piece images) | misses per read (10 split images) | spend |
| --- | --- | --- | --- |
| SP-2a2 (c), the shipped baseline | 10/74 = 13.5% | 0/30 | - |
| 1 | 2/75 = 2.7% | 4/30 (ليلى a 1, ليلى b 1, f-fat 2) | USD 0.8984 |
| 2 | 3/75 = 4.0% | 3/30 (ليلى b 2, f-fat 1) | USD 1.0055 |
| 3 (shipped) | not re-read, see below | 0/30 | USD 0.3125 |

Variant 1 and variant 2 both let point-contact dots through: the reader read "the two diamond marks are connected to the underside of the central rail by touching metal" on ليلى b, which is exactly the contact SP-2a2 scored as floating.
Variant 3 targets that and reads FFF on all ten split images, 30 of 30 refusals, 0 misses.
Its one-piece side was measured on the 48 dependent stills below (46 of 48, and 2 of the 2 refusals are framed-minimal) rather than on this 35-image set again, because a third full run would have pushed the task past its USD 3 cap.
The per-image votes for variants 1 and 2 are in `reader-cal/sp2a3-v1.json` and `reader-cal/sp2a3.json`, variant 3's split probe in `reader-cal/sp2a3-v3-false.json` (scratchpad, not in git).

Variant 2 votes that differ from variant 1, expected-true first: `classical-love-en-a` TFF to TTT, `framed-minimal-muhammad-ar-a` TTT to TTF, `o-muh-studio` TTT to TTF, `r-fat-studio` TTT to TTF, `f-fat-studio` TFT to TFF, ليلى a FFT to FFF, ليلى b FFT to TTF.

### The 48 SP-2f2 dependent stills, 1 read each

| reader | SP-2f2 (shipped rule) | SP-2a3 variant 3 |
| --- | --- | --- |
| piece, all 48 | 40 of 48 | 46 of 48 |
| piece, framed-minimal only | 4 of 12 | 10 of 12 |
| piece, classical and diamond-rails | 36 of 36 | 36 of 36 |
| name | 47 of 48 (false "Asmaa" on `classical-asma-en-close_up-a`) | 46 of 48 (false "Asmaa" on `classical-asma-en-close_up-a` and `-b`) |

The name reader is untouched by this change; the second "Asmaa" is the same false refusal on the second take of the same cell, read once.

Two framed-minimal stills still refuse, both of them stills that refused before:

| still | reader's note |
| --- | --- |
| `framed-minimal-muhammad-ar-dark-b` | "The rectangular frame is a continuous piece, and the Arabic lettering appears continuous within itself, but the lettering is separated from the frame by visible background gaps. No letter or rail forms a touching metal bridge between the word and the frame, so the pendant is not one connected piece." |
| `framed-minimal-salma-ar-close_up-b` | "The rectangular frame and its two upper ring attachments are continuous, and the Arabic lettering appears internally connected as a word. However, the lettering is separated from the frame/bottom rail by visible background gaps, with no continuous metal bridge linking the word to the frame. Therefore the pendant is not one connected piece." |

Both are single reads, and both cells pass on their other three views, so this is the reader failing to see the joint in one frame rather than a rule that still denies transitivity.

### Spend

Metered from the response `usage` at USD 1.25 per million input and USD 10 per million output tokens.
Variant 1 calibration USD 0.8984, variant 2 calibration USD 1.0055, variant 3 split probe USD 0.3125, dependent replay USD 0.6523.
Total USD 2.869 against the USD 3 cap.

### SP-2a3 wording 3, full calibration set (lead, after the implementer's cap)

`cal.mts sp2a3-v3-full`, the shipped wording 3, 35 images x 3 reads, USD 1.0202.
Split pendants: 30 of 30 reads refused, 0 misses.
One-piece pendants: 9 false refusals in 71 reads that returned (4 reads errored and are retried once in production), 12.7%, against 10 of 74 (13.5%) for the SP-2a2 wording.
The refusals: `framed-minimal-muhammad-ar-a` 1 of 3 (was 3 of 3), `v3/c-fat-studio-a` 3 of 3 (was 3 of 3), `v2/r-fat-studio` 3 of 3 (was 2 of 3, label still unconfirmed, SP-2a2 asked for a viewer re-score), `v2/f-fat-studio` 2 of 3 (was 3 of 3).
Framed-minimal in this set went from 6 of 12 reads refused to 1 of 12.
Total SP-2a3 spend: USD 2.869 (implementer) + USD 1.0202 (this run) = USD 3.89.
