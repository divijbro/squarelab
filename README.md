# SquareLab

An interactive geometry lab for exploring how square areas change when a square is built on a diagonal or formed by joining side midpoints.

## Run locally

Use Node.js 24.21.0, pinned in `.node-version` for a consistent Render build.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Create a production build with `npm run build`, or preview it with `npm run preview`.

## Deploy to Render

This is a client-side React app with no server, database, or runtime environment variables. Deploy it as a **Render Static Site**. The included `render.yaml` configures the service as a Blueprint:

- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- Hashed files under `/assets/` receive long-lived immutable caching; the entry HTML revalidates on each visit.
- Automatic pull request previews are enabled.

To deploy, push this directory to a Git repository, connect the repository in Render, then choose **New > Blueprint** and select `render.yaml`. If deploying from a monorepo, set the service root directory to `outputs/squarelab`.

## Features

- Accurate SVG constructions with live measurements and area ratios.
- Side-length and construction-progress sliders, reversible scrubbing, and animation controls.
- Explore, guided, discover, and locally generated challenge modes.
- Responsive layout, keyboard-operable controls, and reduced-motion support.
