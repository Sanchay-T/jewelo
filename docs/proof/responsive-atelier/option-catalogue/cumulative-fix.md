# Cumulative photographic matching correction — 6 September 2026

User-reported defect: editing metal or stones replaced an Arabic rails/Kufi example with English origami or classical jewelry. Earlier form selections remained saved but were not represented by the photograph.

Implemented locally:
- Exact full visual configuration lookup controls displayed assets. Last-edited-field and nearest-example fallback cannot supply a customer preview.
- Missing combinations publish no photo assets, preserve the entire draft, display an explicit missing-photo state, and cannot be captured into review/bag as if complete. Missing camera views remain unavailable rather than borrowing another design.
- Preview DOM exposes its selected configuration and exact/missing status; image descriptions include script/name example, construction, lettering, metal, setting, gemstone, size and chain for future audits.
- Added 12 native-generated Studio photos for Arabic / one name / Diamond rails / Kufi / 32 mm / Rolo: three gold colors × four stone settings (lab diamond when stones are present). These are nominal sample dimensions, not measured geometry or personalized spelling.
- All twelve were directly visually inspected. Rose accent originally had three stones; it was rejected, retained in immutable lineage, corrected to four, and only the correction was integrated.
- Integrated the previously reviewed 15 v6 Arabic lettering camera photos. Original source assets retained.

Limits: this fixes substitution behavior and adds one complete metal/setting matrix. It does not supply photos for every selectable cumulative combination. The new v8 matrix currently has Studio views only. A missing message is not evidence of a completed visual configurator. Real generation, pricing and checkout remain inactive.

Validation: final results recorded at delivery. Automated matching enumerates all 131,328 categorical configurations and rejects every nonmatching published asset. Responsive regressions exercise the 12 paired states, English stone settings, language switching, missing combinations, unchanged inputs and reload at 320/390/768/1024/1440. The separate shopping suite covers review/bag, retries, keyboard, RTL, reduced motion and short viewports.

An initial final browser run was interrupted by Next.js returning HTTP500 with ENOSPC errors in its generated .next cache. Only that generated cache was cleared; the local mock server was restarted and checks rerun. Draft/bag and source assets were preserved.

Final local results:
- Typecheck and lint passed.
- 30 unit tests passed, including exhaustive exact-match safety over 131,328 configurations.
- 10 cumulative regression browser tests passed at all five widths (34.9 seconds).
- 25 shopping/failure/accessibility browser tests passed at all five widths (1.6 minutes).
- All 165 integrated images decoded successfully through the running app; 57 configuration families, 36 with all four views.
- A tablet test initially clicked an accordion before client readiness, when the responsive layout was changing it into a disabled expanded desktop heading. The test now waits for the first loaded photo, then performs the same real clicks; all five widths pass without forced clicks.
- The user's live draft changed during testing to Arabic / rails / Thuluth inspired / yellow gold / partial pavé / ruby /32mm / Cable. It was preserved and still has no exact photograph. Full cumulative asset coverage is not complete.

Server is local on port3001 in mock provider mode. No deployment, merge, checkout or live provider activation.

Continuation: three native v9 views complete the white/no-stones Arabic Kufi rails/Rolo/32mm family. Producer and independent visual review passed. Five responsive camera tests passed. Integrated photos are now168. Full offline inventory explicitly enumerates525,312 required views and525,144 missing jobs, with stable IDs, file checksums, structural-master/material/camera dependencies and acceptance gates. Five inventory unit tests and four export failure/collision tests passed; typecheck/lint passed. Full streaming export exercised under /tmp. This is an offline plan/export tool, not a generation worker; it makes no provider calls and cannot execute/resume generations itself. The two output files are rollback-safe for handled errors but not crash-atomic as a pair. Bulk generation/storage and a spending limit are not yet agreed. Full completion remains outstanding.
