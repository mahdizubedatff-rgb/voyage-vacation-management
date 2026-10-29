# Voyage — Frontend

React 18 + TypeScript (strict) + Vite, Tailwind CSS v4, TanStack Query, React Hook Form + Zod, Recharts and Framer Motion.
For the full documentation and how to run the whole stack with Docker, see the main `README.md` (in the submission ZIP: `Backend/project-root/README.md`).

## Development

```bash
npm install
npm run dev        # http://localhost:5173 — proxies /api to http://localhost:4000 (start the backend first)
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check and production build to `dist/` |
| `npm run lint` | ESLint |
| `npm test` | Vitest + Testing Library |

In Docker the app is served by nginx (`nginx.conf`), which also proxies `/api` to the backend.
