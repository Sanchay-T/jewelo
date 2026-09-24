# UNIV-5 reader replay (rails, wording A)

Script: scratch `univ5-replay.mts` (copy of `univ3-replay.mts`), run 24 Sep 2026 against the working tree, so the name reader is the uncommitted blind transcriber (NAME-BLIND), not the production reader that is told the name.
Spend: USD 0.374 (OpenAI), 9 of 16 reads timed out.

| still | one piece | blind read | expected |
| --- | --- | --- | --- |
| diamond-rails-amna-ar-a | Y | انت | آمنة |
| diamond-rails-amna-ar-b | Y | أمانة | آمنة |
| diamond-rails-ghada-ar-a | Y | محمد | غادة |
| diamond-rails-ghada-ar-b | Y | حلال | غادة |
| diamond-rails-ibrahim-ar-a | Y | حبيب | إبراهيم |
| diamond-rails-mumin-ar-b | Y | محمد | مؤمن |
| diamond-rails-qasim-ar-a | Y | تلمس | قاسم |
| diamond-rails-zafir-ar-a | Y | حلم | ظافر |
| 8 others | timeout | | |

- The piece reader accepted all 8 rails stills it read; on the production wording it refused 16 of 21 rails stills the viewer measured whole (tip-set diamond dots). Wording A fixes that refusal, pending the blind viewer's one piece count.
- The blind transcriber read 0 of 8 correctly and answered other common names (محمد twice). A blind read of the whole frame cannot gate spelling on rails; NAME-2 measures a letter-band crop with per-letter dot counts instead.

## Blind viewer verdict (`blind-scores.md`, map in `blind-map.json`)

- One piece 16 of 16, spelled 10 of 16, presentable 10 of 16.
- Misspelled: تسنيم a (three dots on ت), كريم a and b (the same extra dot under م on both), مؤمن a (hamza drawn as a plain ball) and b (dots on the struts above each م), آمنة b (hamza hook with a ball instead of a madda).
- The piece reader's 8 accepts are all one piece by the viewer; 4 of them are misspelled (مؤمن b, and the reads it did not return include the others), so on rails wording A fixes the piece and leaves spelling to a gate that does not exist yet.
