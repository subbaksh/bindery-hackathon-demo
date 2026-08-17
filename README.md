# Bindery hackathon demo

This repository contains the presentation and recorded product demo used for the
Bindery hackathon submission.

Bindery itself is developed in the main
[subbaksh/bindery](https://github.com/subbaksh/bindery) repository. That repository
contains the application, CLI, architecture, product documentation, and ongoing work.

## View the presentation

The hosted presentation is available at:

**https://subbaksh.github.io/bindery-hackathon-demo/**

Use the arrow buttons or keyboard arrow keys to move between slides. On a video slide:

- `Space` or `P` plays or pauses the video.
- `R` restarts the current video.
- The native video controls remain available.

## Run locally

Requirements:

- Node.js 22 or newer
- npm

```bash
npm install
npm run dev
```

Open `http://localhost:8090`.

To verify the production build:

```bash
npm run build
npm run preview
```

## Repository contents

- `index.html`, `styles.css`, and `presentation.js` contain the presentation.
- `assets/` and `client-sprawl.png` contain presentation artwork.
- `1.mov` through `4.mov` are the recorded demo chapters.
- `docs/hackathon-roadmap.md` preserves the roadmap used to build the submission.
- `archive/catalog-seeder/` preserves the one-off demo catalog generator and its test.
- `.github/workflows/pages.yml` publishes the built site to GitHub Pages.

This is a hackathon-specific artifact, not the Bindery product repository.
