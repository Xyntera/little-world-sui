# Little Kerala - independent recreation (frontend + backend)

A standalone full-stack app recreating the observable public experience of
kerala.dhilber.com: intro, district onboarding (+15 points), a canvas island
game (walk with WASD/arrows or drag; collect flowers 5, mangoes 10, jackfruit
15, umbrellas 25), live leaderboards (personal + 14 districts, EN + Malayalam),
avatar customizer, monsoon mode, and a presence count.

No code or data from the original site is used. Storage starts empty.

## Run locally

    npm install        # only needed for Postgres support (pg); local JSON mode has no deps
    npm start          # http://localhost:8787

## Storage

- `DATABASE_URL` set  -> Heroku Postgres (durable). Tables are auto-created.
- otherwise           -> ./data.json (development only; Heroku dyno disks are ephemeral)

## API

    POST /api/join                         { name, district, adult:true, look? } -> { player, token }
    GET  /api/districts                    14 districts, EN + Malayalam
    GET  /api/items                        collectible item point values
    GET  /api/players/:id
    POST /api/players/:id/collect          { item }   (Bearer token)
    PATCH /api/players/:id/look            { preset, skin, hair, hairColor }  (Bearer)
    POST /api/players/:id/ping             presence heartbeat (Bearer)
    GET  /api/leaderboards                 players + districts + presence
    GET  /api/presence
    GET  /api/health                       storage mode

## Deploy to Heroku

    heroku login
    heroku create little-kerala-<suffix>
    heroku addons:create heroku-postgresql:essential-0   # $5/mo, durable
    git init && git add -A && git commit -m "Little Kerala recreation"
    heroku git:remote -a little-kerala-<suffix>
    git push heroku main
    heroku open

Monthly cost (verified at https://www.heroku.com/pricing/ on 2026-10-23):
- Eco dyno $5/mo (sleeps after 30 min idle, ~slow first load) + Postgres Essential-0 $5/mo = **$10/mo**
- Basic dyno $7/mo (always on) + Postgres Essential-0 $5/mo = **$12/mo**
