# Source and license inventory

This file lists every bundled asset class, its origin, and its license status.
Code license for the game itself is the owner's choice and intentionally not
selected yet (see NOTICE.md).

## Game code (server + client, this repository)
- Author: the project owner. License: unselected (owner decision pending).

## Geography and map data
- City street fabric, buildings, landmarks, promenades: hand-placed low-poly
  game arrangements. Stylized, compressed, not surveyed geography.
- Toronto shorePoly and Mumbai shoreEast: independently authored stylized
  curves. Earlier GSHHG 2.3.7-derived points were fully removed; no GSHHG
  data ships in this build.
- Kerala home coastline: piecewise-linear curve through nine coastal-town
  latitude/longitude anchor points (public factual coordinates, verified via
  the MediaWiki API), mapped through a compressed, not-to-scale transform.
- River centerlines and selected landmark footprints/ways: derived from
  OpenStreetMap data (c) OpenStreetMap contributors, ODbL 1.0
  (https://wiki.openstreetmap.org/wiki/Open_Database_License/ODbL-1.0.txt).
  Includes: river courses (e.g. Chao Phraya relation 227317, Spree, Tevere,
  Rimac, Moskva), Kerala district polygons (public/distpolys.js), Lagos Broad
  Street (way 762582690), Lagos cathedral (669975482) and museum (671991295)
  footprints. Attribution and share-alike obligations per ODbL; see NOTICE.md.
- Tokyo Bay far shore and Hong Kong Island far shore (render-only backdrop):
  Natural Earth 10m land polygons, public domain
  (https://www.naturalearthdata.com/about/terms-of-use/).

## On-chain package (move/little_world)
- Original Move source, Sui testnet only. Package id recorded in
  move/little_world/Published.toml. Non-financial collectible; no token.

## Vendor libraries (public/vendor)
- Three.js and related browser libraries: MIT license; see their headers.

## Art and media
- public/hero.jpg, public/art, logo: project-generated artwork.
- favicon.png: generated hackathon logo.

## Fonts
- DejaVu/Noto fonts used by tooling only; not shipped game assets.
