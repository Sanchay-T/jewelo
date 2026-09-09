# Umayr's feedback on staging, 8 to 9 September 2026

Source: Sanchay's WhatsApp with Umayr (`+971586783040`), read with `wacli --account personal` on 9 September 13:45 IST.
`messages.txt` is the verbatim log from 8 Sep 22:25 IST onward.
The images are Umayr's own screenshots of the staging URL; the 8 Sep video (7 MB) is not committed, its frames are described under image 08.
Umayr is the broker for Omran's shop and the first person outside the build to use the page; he tested on an iPhone over LTE on 8 Sep and on a desktop on 9 Sep.

## What each image shows and what it means

01 `01-0908-2241-phone-review-asma-sample-under-umayr.jpg` - phone, the review step after typing `Umayr`.
The big picture is the shop's Asma sample in origami ribbon with a small "Sample for this look" badge; the caption reads "Asma · Asma example".
He read this as "put my name it gave me Asma".
Meaning: the badge does not survive a real user; the sample reads as his piece, wrongly named.

02 `02-0908-2241-phone-tiles-two-preparing-two-sample.jpg` - phone, the four tiles after the spelling box was ticked.
Studio and Dark show a grey box with `!` and "Preparing"; On skin and Close-up show the Asma sample.
Below it "Your selections: Umayr".
Meaning: two of four tiles look failed and two look like someone else's; nothing says "your photograph is being made, this takes about two minutes".
The `!` is the honest refusal of the mock still, but to him it is a broken image.
His words: "Preview images sometimes fail to load. If I click retry it loads. Does that mean it was generating initially?" and later "I see the loading bar under the previews but shows the same old image still."

03 `03-0909-1339-desktop-annotated-1-to-5.jpg` - desktop, his green numbers.
1: the preview panel is mostly empty space around a small sample card.
2: the sample card carries three labels at once ("Asma example" pill, "CALEUMS - THE NAME COLLECTION · Asma example", and a "Sample look, not your piece" badge overlapping the caption).
3: the field label "Language / script".
4: the two grey paragraphs under the sample ("This is a sample look from the shop, not your piece..." and "Shown in 18K yellow gold with no stones...").
5: the header "THE NAME ATELIER".
His words: "I can't fucking stand to look at these models raw UI outputs, text mostly. It infuriates me."
Sanchay's reply in the chat: "No use of atelier or other braindead RL fried language/terms."
Meaning: too much explanatory copy, labels that are jargon, a word (atelier) that reads as machine-written luxury filler.

04 `04-0909-1341-lettering-tiles-sample-coming.jpg` - the six lettering tiles.
Every tile shows the same word `أسماء` in a slightly different face; five of six say "Sample coming".
Meaning: the shopper's own name is never shown in the styles they are choosing between, and five of six choices look unfinished.

05 `05-0909-1341-construction-tiles-not-yet-photographed.jpg` - the four construction tiles.
Three of four say "Not yet photographed", plus the line "Not yet photographed; the shop will confirm this look by hand".
Meaning: the page looks three-quarters unavailable. DS-4's default is to hide unproven looks, and D-022 made that a one-variable change that has not been flipped.

06 `06-0909-1343-spelling-echo-and-selections-duplicate.jpg` - his two green boxes.
The "YOUR SPELLING · TEXT ONLY" box repeats the name typed in the input directly above it; "YOUR SELECTIONS" repeats it again on the right.
Meaning: the same name is on screen three times; the echo box reads as a glitch.

07 `07-0909-1344-asma-sample-he-wants-it-plainer.jpg` - the Asma sample crop.
Sanchay asked "w/o the ornament?"; Umayr: "as clear/simple as possible, maybe even no background, but whatever works."
Meaning: he wants the sample (and the eventual photograph) to be the pendant alone on a plain ground, not a styled satin shot.

08 the 8 Sep video (frames in the session scratchpad only).
In Arabic mode he typed `Umayr` in Latin letters; the field went orange with "Enter the exact Arabic spelling, or choose English."
His words: "Expects name in Arabic, doesn't convert anymore."
Meaning: the earlier build transliterated for him; this one refuses honestly. He experienced the refusal as a regression.
The frames also show the "Updating preview / Loading the On skin sample photo" overlay while all four tiles read "Preparing".

## The list, ranked, to work through now

1. **One preview state, not three.** While the piece is being prepared, all four tiles say so with one line and a time; nothing shows a `!`; the sample never sits beside a preparing tile.
   Owner `implementer`, task P6-8 (new row), files `Atelier.tsx`, `usePersonalizedPreview.ts`, `atelier.module.css`.
2. **The sample is unmistakably not yours.** One label, once, in words a shopper uses ("Shop sample - Asma"), the two grey paragraphs cut to one short line, the three overlapping labels on the card reduced to that one.
   Owner `implementer`, P6-8.
3. **Copy strip.** "THE NAME ATELIER" goes; "Language / script" becomes "Language"; the "YOUR SPELLING · TEXT ONLY" echo box goes (the input is the spelling); the name appears once in the selections summary. Rule for the dictionary: no atelier, no filler adjectives, nothing a shop assistant would not say out loud.
   Owner `implementer`, P6-8, then `ux-verifier`.
4. **Hide unproven looks (DS-4 default).** Set `NEXT_PUBLIC_SELLABLE_CONSTRUCTIONS=Classical` and the English lettering set to `Classic` on the staging app so three "Not yet photographed" tiles and five "Sample coming" tiles disappear; the code paths stay for P3-5.
   Owner `platform`, one env change and a redeploy; Sanchay or Omran can widen it later.
5. **The shopper's own name in every lettering tile.** The HarfBuzz engine already renders any name in every face deterministically; a small server-rendered SVG per tile replaces `أسماء` six times.
   Owner `implementer`, new task P6-9 (uses `packages/identity` shaping, no rings, no bridging), medium.
6. **Plain sample and plain photographs.** Umayr wants the pendant alone on a clean ground. The style anchors and the v4.3 prompts were proven on satin; a "plain" variant is a prompt lab run (P3-5) and a product call for Omran.
   Owner: Sanchay decides, then `image-lab` and `viewer`.
7. **Arabic input.** Today: Latin letters in Arabic mode are refused with a hint. Options: keep the refusal (the engine never guesses a name) and make the hint bigger with an Arabic keyboard nudge, or offer transliteration suggestions the shopper must tap to confirm.
   Default taken: keep the refusal, improve the hint. Anything more is Sanchay's call because a wrong Arabic spelling reaches a customer as gold.
8. **The real photograph.** Every item above is dressing; "it gave me Asma" only ends when a real still replaces the sample, which is P5-2 and needs Sanchay's spend yes.
9. **Mobile.** Sanchay told him "will make it responsive w sticky thingy for the design"; Umayr said "not too bad on mobile". The short-height desktop defect (preview under the action bar at 1280x720) is still open from session 1.

## Decisions taken

- Item 4 is the DS-4 default; recorded here and in the handover.
- Item 7 keeps the honest refusal; transliteration would be the model deciding the name.
