# Release state

As of 2026-11-18 (IST), updated after dusk v4 merge:

- main HEAD = merge of wip/dusk-grade into main (dusk grade v4: cool dusk sky/fog hue shift, warm low sun, lifted shadow floor, saturated ground bounce). Reference-matched against the user's production screenshots; verified locally with real Chrome pixels (phone + desktop, Kerala + New York, mic UI enabled, eslint clean, zero JS errors, no context loss).
- Production deploy is manual (Render auto-deploy was disabled during the 06:34 rollback). Rollback path: redeploy commit bcf9811 (tree identical to pre-dusk state) via Render dashboard.
- Verification gate for graphics deploys: actual city-init execution + pixels (welcome -> Play -> rendered city) on a working browser BEFORE production deploy. A syntax check alone is not sufficient (a module-scope bug slipped through once). HUD-only evidence is not rendering proof. v4 passed this gate locally on 2026-11-18; hosted verification follows deploy.
- wip/voice-peer-speaking (60795f6) stays excluded from production until real validation.
