# personal-site

Source for [yifeiz.com](https://yifeiz.com). Built with React + Vite.

## Scripts

- `npm run dev`: start the dev server at http://localhost:5173
- `npm run build`: build for production into `dist/`
- `npm run preview`: serve the production build locally
- `npm run lint`: run ESLint

## Commit messages

Commits follow [Conventional Commits](https://www.conventionalcommits.org/):
`type(optional scope): subject`, e.g. `feat: add projects section`,
`fix: correct resume link`, `chore(deps): bump vite`.

Common types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`,
`build`, `ci`, `chore`, `revert`. A husky `commit-msg` hook runs commitlint
locally, and CI checks every pushed commit.

## Deploying

Every push to `master` builds the site and deploys it to GitHub Pages via
`.github/workflows/deploy.yml`. The custom domain is set in the repo's Pages
settings (and mirrored in `public/CNAME`).
