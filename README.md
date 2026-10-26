# Interactive Geometry & Area Explorer

An interactive geometry lab for exploring how square areas change when a square is built on a diagonal or formed by joining side midpoints.

## Run locally

Use Node.js 24.21.0, pinned in `.node-version` for a consistent Render build.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Create a production build with `npm run build`, or preview it with `npm run preview`.

Run the geometry checks with `npm test`.

## Deploy to Render

This is a client-side React app with no server, database, or runtime environment variables. Deploy it as a **Render Static Site**. The included `render.yaml` configures the service as a Blueprint:

- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- Hashed files under `/assets/` receive long-lived immutable caching; the entry HTML revalidates on each visit.
- Automatic pull request previews are enabled.

To deploy, push this directory to a Git repository, connect the repository in Render, then choose **New > Blueprint** and select `render.yaml`. If deploying from a monorepo, set the service root directory to this project's directory.

## Features

- Accurate, rotatable SVG constructions with draggable resize handles and live area measurements.
- The Double-Area Machine and Half-Area Mystery activities.
- Area Vision, a reversible construction timeline, playback, and a staged algebra proof.
- A slider for adjusting the original square's side length.
- Responsive layout, keyboard and touch input, and reduced-motion support.
