# personal-site

Source for [yifeiz.com](https://yifeiz.com). Built with React + Vite.

## Scripts

- `npm run dev`: start the dev server at http://localhost:5173
- `npm run build`: build for production into `dist/`
- `npm run preview`: serve the production build locally
- `npm run lint`: run ESLint

## Deploying

Every push to `master` builds the site and deploys it to GitHub Pages via
`.github/workflows/deploy.yml`. The custom domain is set in the repo's Pages
settings (and mirrored in `public/CNAME`).
