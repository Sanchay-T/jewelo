# UNIV-1 production reader replay

`univ-replay.mts` (production `OpenAIPieceReader` and `OpenAINameReader`, 3 workers), USD 0.8322, model from `.env` `OPENAI_VERIFIER_MODEL`.

| still | piece reader | name reader | read |
|---|---|---|---|
| classical-abdullah-ar-a.png | one piece | match | عبدالله |
| classical-abdullah-ar-b.png | refused | match | عبدالله |
| classical-aisha-ar-a.png | refused | match | عائشة |
| classical-aisha-ar-b.png | refused | match | عائشة |
| classical-fatima-ar-a.png | refused | match | فاطمة |
| classical-fatima-ar-b.png | one piece | match | فاطمة |
| classical-hamdan-ar-a.png | refused | match | حمدان |
| classical-hamdan-ar-b.png | refused | match | حمدان |
| classical-hessa-ar-a.png | refused | match | حصة |
| classical-hessa-ar-b.png | refused | match | حصة |
| classical-hind-ar-a.png | refused | match | هند |
| classical-hind-ar-b.png | one piece | match | هند |
| classical-khalid-ar-a.png | refused | match | خالد |
| classical-khalid-ar-b.png | refused | match | خالد |
| classical-layla-ar-a.png | refused | match | ليلى |
| classical-layla-ar-b.png | refused | match | ليلى |
| classical-maitha-ar-a.png | refused | match | ميثاء |
| classical-maitha-ar-b.png | refused | match | ميثاء |
| classical-maryam-ar-a.png | refused | match | مريم |
| classical-maryam-ar-b.png | one piece | match | مريم |
| classical-noor-ar-a.png | refused | match | نور |
| classical-noor-ar-b.png | refused | match | نور |
| classical-rashid-ar-a.png | refused | match | راشد |
| classical-rashid-ar-b.png | refused | match | راشد |
| classical-shaikha-ar-a.png | refused | match | شيخة |
| classical-shaikha-ar-b.png | refused | match | شيخة |
| classical-shamma-ar-a.png | refused | match | شمة |
| classical-shamma-ar-b.png | refused | match | شمة |
| classical-yousef-ar-a.png | refused | match | يوسف |
| classical-yousef-ar-b.png | refused | match | يوسف |
| classical-zainab-ar-a.png | refused | match | زينب |
| classical-zainab-ar-b.png | refused | match | زينب |
| ctl-DR-point-a.png | one piece | match | سلمى |
| ctl-DR-point-b.png | refused | match | سلمى |
| ctl-DR-wire-a.png | refused | match | محمد |
| ctl-DR-wire-b.png | refused | match | محمد |
| diamond-rails-fatima-ar-a.png | timeout | timeout | |
| diamond-rails-fatima-ar-b.png | timeout | timeout | |
| diamond-rails-khalid-ar-a.png | timeout | timeout | |
| diamond-rails-khalid-ar-b.png | one piece | match | خالد |
| diamond-rails-noor-ar-a.png | one piece | match | نور |
| diamond-rails-noor-ar-b.png | one piece | match | نور |
| diamond-rails-shamma-ar-a.png | refused | match | شمة |
| diamond-rails-shamma-ar-b.png | one piece | match | شمة |
| diamond-rails-yousef-ar-a.png | refused | match | يوسف |
| diamond-rails-yousef-ar-b.png | refused | match | يوسف |
| diamond-rails-zainab-ar-a.png | refused | match | زينب |
| diamond-rails-zainab-ar-b.png | refused | match | زينب |
