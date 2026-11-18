# Release state

As of 2026-11-18 (IST):

- Production (Render service srv-dbu7rpe1egvs73foi38g) runs commit bcf9811 ("Voice: initialize mic caption/state on load"). Manual deploys only; Render auto-deploy was disabled during rollback.
- main HEAD is a revert commit restoring exactly bcf9811's tree, so a "deploy latest" stays safe.
- The dusk-grade graphics pass (cool/dusky scene lighting) is NOT on main. Work is preserved on branch wip/dusk-grade (commits 3e8703c + 51a3c43; 51a3c43 fixes a helper-scoping bug in 3e8703c).
- Gate for any future graphics deploy: verify actual city-init execution and pixels (welcome -> Play -> rendered city, New York AND Kerala) on a working browser BEFORE production deploy. A syntax check alone is not sufficient (a module-scope bug slipped through once). HUD-only evidence is not rendering proof.
- 2026-11-18 cloud-browser sessions repeatedly failed entering the WebGL scene (GPU/renderer environment), so live in-game pixels on the rolled-back build are pending a working browser path.
