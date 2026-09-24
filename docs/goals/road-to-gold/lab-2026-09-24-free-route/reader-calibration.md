# Blind one-piece reader calibration (SP-2a2, 24 September 2026)

The blind reader is `OpenAIPieceReader` in `packages/ai/src/studio.ts`, model from `OPENAI_VERIFIER_MODEL`.
It refused good stills on the free lab and on staging, and one staging read ended with "OpenAI verification omitted output text".
This note measures it, tries one rule rewrite, and records what was kept.

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

## Results

| variant | false refusals per read (27 one-piece images) | misses per read (8 split images) | refusal by majority of 3 | misses by majority of 3 | output tokens p50 / max | spend |
| --- | --- | --- | --- | --- | --- | --- |
| baseline | 25/80 = 31.2% | 1/24 = 4.2% (ليلى b) | 8/27 = 29.6% | 0/8 | 517 / 2048 (one read cut off) | USD 1.15 |
| (a) wording | 20/80 = 25.0% | 0/24 = 0% | 8/27 = 29.6% | 0/8 | 548 / 2048 (one read cut off) | USD 1.16 |
| (b) = (a) + agreement | - | - | 8/27 = 29.6% | 0/8 | about 2.3 reads per decision | USD 0 (from (a)) |

Per-read counts leave out the two reads that ended at the old 2048-token ceiling (one per run).
Votes per image, T one piece, F split, E no answer:

| image | label | label source | baseline | (a) | (b) decision |
| --- | --- | --- | --- | --- | --- |
| free/classical-asma-en-a | true | free viewer-scores.md one-piece column | TTT | TTT | true |
| free/classical-asma-en-b | true | free viewer-scores.md one-piece column | TTT | TTT | true |
| free/classical-layla-ar-a | false | free viewer-scores.md one-piece column | FFF | FFF | false |
| free/classical-layla-ar-b | false | free viewer-scores.md one-piece column | FFT | FFF | false |
| free/classical-love-en-a | true | free viewer-scores.md one-piece column | FFF | TFT | true |
| free/classical-love-en-b | true | free viewer-scores.md one-piece column | FFF | FFT | false |
| free/classical-muhammad-ar-a | true | free viewer-scores.md one-piece column | TTT | TTT | true |
| free/classical-muhammad-ar-b | true | free viewer-scores.md one-piece column | TTT | TTT | true |
| free/classical-muhammad-en-a | true | free viewer-scores.md one-piece column | TTT | TTT | true |
| free/classical-muhammad-en-b | true | free viewer-scores.md one-piece column | TTT | TTT | true |
| free/classical-omar-en-a | true | free viewer-scores.md one-piece column | FTT | TFF | false |
| free/classical-omar-en-b | true | free viewer-scores.md one-piece column | TTT | TTT | true |
| free/diamond-rails-muhammad-ar-a | true | free viewer-scores.md one-piece column | TTT | TTT | true |
| free/diamond-rails-muhammad-ar-b | true | free viewer-scores.md one-piece column | FFF | FTF | false |
| free/framed-minimal-muhammad-ar-a | true | free viewer-scores.md one-piece column | FFF | FFF | false |
| free/framed-minimal-muhammad-ar-b | true | free viewer-scores.md one-piece column | TTT | TTT | true |
| free/framed-minimal-salma-ar-a | true | free viewer-scores.md one-piece column | FFF | FTT | true |
| free/framed-minimal-salma-ar-b | true | free viewer-scores.md one-piece column | FFT | FFT | false |
| free/origami-ribbon-muhammad-ar-a | true | free viewer-scores.md one-piece column | TTT | TTT | true |
| free/origami-ribbon-muhammad-ar-b | true | free viewer-scores.md one-piece column | TTT | TTT | true |
| split/v2/c-fat-studio.png | false | piece-replay.mts CASES | FFF | FFF | false |
| split/v2/c-fat-on_skin.png | false | piece-replay.mts CASES | FFF | FFF | false |
| split/v2/c-fat-close_up.png | false | piece-replay.mts CASES | FFF | FFF | false |
| split/v2/c-fat-dark.png | false | piece-replay.mts CASES | FFF | FFF | false |
| split/v3/c-omran-studio-a.png | false | piece-replay.mts CASES | FFF | FFF | false |
| split/v3/c-omran-studio-b.png | false | piece-replay.mts CASES | FFF | FFF | false |
| split/v3/c-fat-studio-a.png | true | piece-replay.mts CASES | FFF | FFF | false |
| split/v3/c-omran-studio-stencil-b.png | true | piece-replay.mts CASES | TTT | TTT | true |
| split/v2/o-muh-studio.png | true | piece-replay.mts CASES | TTF | TFF | false |
| split/v2/o-fat-studio.png | true | piece-replay.mts CASES | TTT | TTT | true |
| split/v2/r-fat-studio.png | true | piece-replay.mts CASES | TTT | TTT | true |
| split/v2/c-muh-dark.png | true | piece-replay.mts CASES | TTT | TTT | true |
| split/v2/f-fat-studio.png | true | piece-replay.mts CASES | FFF | FFE | false |
| live/rose-rejected-1.png | true | lead brief (live staging, re-read 3/3 one piece) | TTE | TTT | true |
| live/live-asma-studio.png | true | lead brief (live staging, re-read 3/3 one piece) | TTT | TTT | true |

## Choice

Variant (a) is applied: it is the only variant that missed no split read, and it cut per-read false refusals from 31.2% to 25.0%.
The staging still `rose-rejected-1.png` read one piece 3 of 3 under (a).
Variant (b) is not applied: its false-refusal rate equals (a) on this set, it catches no split that (a) lets through, and it costs one to two more vision calls per still.
The 5% target is not met; the remaining refusals are stable per image, not noise, so more reads cannot fix them.
Eight one-piece images are refused by majority under (a): classical Love b, Omar a, diamond-rails محمد b, both framed محمد a and سلمى b, and from the split lab c-fat-studio-a, o-muh-studio and f-fat-studio.
In the framed stills the reader says the name floats inside the frame, where the viewer found thin bars or flush contact at native resolution, so the reader is most likely missing joins that are small at its input resolution.
The split-lab labels for c-fat-studio-a and f-fat-studio should be re-scored by a viewer: the reader refuses them 6 of 6 and names specific floating marks.

## Output ceiling

Measured reads used 517-548 output tokens at p50 and each run had one read cut off at the shared 2048 ceiling, which is the "omitted output text" failure.
The piece reader now has its own validated `pieceReaderMaxOutputTokens` in `packages/config` (1024 to 16384, set to 8192); the name reader keeps `nameReaderMaxOutputTokens` at 2048.

## Spend

Metered from the response `usage` at USD 1.25 per million input and USD 10 per million output tokens: USD 2.32 of the USD 5 cap, 210 reads.

## Next levers, not done here

Send the reader a crop of the pendant, or `detail: "high"`, so thin joins survive the downscale.
Re-score the two doubtful split-lab labels, then re-measure.
