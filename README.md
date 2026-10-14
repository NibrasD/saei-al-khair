# ساعي الخير — Evening Ride

A browser-based 3D cycling game built with Three.js. The existing gameplay, quests, character behaviours, sounds and controls are preserved; the source is now organized into maintainable files.

## Run locally

Use a local web server so browser requests for the character models work correctly:

```bash
python -m http.server 3000
```

Open [http://localhost:3000](http://localhost:3000).

## Project layout

```text
index.html                  GitHub Pages entry point
css/game.css                UI and responsive layout
js/game.js                  Three.js scene, controls, quests and game logic
assets/models/*.glb         Six existing 3D character models
.github/workflows/pages.yml Automatic GitHub Pages deployment
ساعي الخير.html              Alternate entry point to the same game
```

## Controls

- W / ↑: pedal forward
- S / ↓: brake
- A / D or ← / →: steer
- Space: bicycle bell
- E: interact / help
- M: mute
- P / Escape: pause

GitHub Actions is configured to publish the root of `main` to GitHub Pages on every push.
